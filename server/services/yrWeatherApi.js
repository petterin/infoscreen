const zlib = require("zlib");
const axios = require("axios");
const NodeCache = require("node-cache");

const xmlParser = require("../helpers/xmlParser");
const yrWeatherParser = require("../helpers/yrWeatherParser");
const yrWeatherParser2 = require("../helpers/yrWeatherParser2");

const FORECAST_CACHE_MAX_AGE_SECONDS = 6 * 60 * 60; // 6 hours
const FORECAST_CACHE_DEFAULT_TTL_SECONDS = 60 * 60; // 60 minutes

// Yr.no/MET.no API 2.0 requires coordinates to be rounded to 4 or less decimals
const COORDINATE_MAX_DECIMALS = 3;
// Yr.no/MET.no API 2.0 requires an identifiable User-Agent with application name
const APP_USER_AGENT = "infoscreen/0.1 https://github.com/petterin/infoscreen";

const weatherCache = new NodeCache({
  stdTTL: FORECAST_CACHE_DEFAULT_TTL_SECONDS,
  checkperiod: 3600, // 1 hour
  useClones: false,
  deleteOnExpire: true,
});

function getYrWeatherUrl_v1(country, county, city, forecastType) {
  function encodeLocationParam(text) {
    return text.replace(" ", "_");
  }
  const api_country = encodeLocationParam(country);
  const api_county = encodeLocationParam(county);
  const api_city = encodeLocationParam(city);
  return `https://www.yr.no/place/${api_country}/${api_county}/${api_city}/${forecastType}.xml`;
}

function getYrWeatherUrl_v2(latitude, longitude) {
  function roundCoordinate(coordinate, decimals) {
    let coordNum = coordinate;
    if (typeof coordinate === "string") {
      coordNum = parseFloat(coordinate);
    }
    if (isNaN(coordNum)) {
      throw new Error(`Coordinate '${coordinate}' is not a number.`);
    }
    const factor = 10 ** decimals;
    return Math.round(coordNum * factor) / factor;
  }

  const lat = roundCoordinate(latitude, COORDINATE_MAX_DECIMALS);
  const lon = roundCoordinate(longitude, COORDINATE_MAX_DECIMALS);
  return `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`;
}

/**
 * Custom function to convert compressed Axios responses in Promise chain to
 * responses with JSON-parsed data.
 *
 * Requires Axios config to have `decompress: false` and
 * `responseType: 'stream'`.
 *
 * This was made because Axios' default decompression behaviour currently
 * (as of 2020-09-27, with Axios 0.20.0) fails with HTTP 304 responses:
 * https://github.com/axios/axios/issues/3055
 */
function handleCompressedAxiosResponse(response) {
  const ZLIB_ENCODINGS = ["gzip", "compress", "deflate"];
  const currentEncoding = response.headers["content-encoding"];
  if (
    response.status !== 304 &&
    response.data !== undefined &&
    ZLIB_ENCODINGS.includes(currentEncoding)
  ) {
    // Unzip the data stream with Zlib
    const stream = response.data.pipe(zlib.createUnzip());
    const chunks = [];

    // remove the content-encoding in order to not confuse downstream operations
    delete response.headers["content-encoding"];

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => {
        const strData = Buffer.concat(chunks).toString("utf8");
        response.data = JSON.parse(strData);
        resolve(response);
      });
    });
  }

  // Return uncompressed or empty responses as-is
  return Promise.resolve(response);
}

/**
 * Gets Yr/Met.no 2.0 weather forecast API response either from API or from
 * local cache. Return value is an Axios Response object.
 *
 * Cached value is used if such exists for the rounded coordinates, and:
 * 1) The date in 'Expires' header of the last cached response hasn't yet
 * passed, or
 * 2) MET.no API returns status 304 when queried with `If-Modified-Since`
 * header using last returned 'Last-Modified' value.
 *
 * @param {number} lat Latitude of the forecast location as decimal number
 * @param {number} lon Longitude of the forecast location as decimal number
 */
function fetchCachedForecast_v2(lat, lon) {
  const apiUrl = getYrWeatherUrl_v2(lat, lon);

  function isFresh(cachedResponse) {
    if (cachedResponse === undefined) {
      // No current value in cache, so need to get new fresh data
      return false;
    }
    const expireHeader =
      cachedResponse.headers && cachedResponse.headers["expires"];
    if (expireHeader) {
      // Response is fresh if 'Expires' header's date has not yet passed
      const expirationDateMillis = Date.parse(expireHeader);
      const isFresh = expirationDateMillis - Date.now() > 0;
      return isFresh;
    } else {
      // If response didn't have 'Expires' header, determine freshness using
      // default cache value (not max age).
      const millisToExpiration = weatherCache.getTtl(apiUrl) - Date.now();
      const defaultVsMaxExpiration =
        1000 *
        (FORECAST_CACHE_MAX_AGE_SECONDS - FORECAST_CACHE_DEFAULT_TTL_SECONDS);
      const millisToDefaultExpiration =
        millisToExpiration - defaultVsMaxExpiration;
      return millisToDefaultExpiration > 0;
    }
  }

  const cachedResponse = weatherCache.get(apiUrl);
  if (isFresh(cachedResponse)) {
    return Promise.resolve(cachedResponse);
  }

  console.info(`Requesting new weather forecast data from '${apiUrl}'...`);
  const requestHeaders = {
    "Accept-Encoding": "gzip, deflate",
    "User-Agent": APP_USER_AGENT,
  };
  const lastModified =
    cachedResponse &&
    cachedResponse.headers &&
    cachedResponse.headers["last-modified"];
  if (lastModified) {
    requestHeaders["If-Modified-Since"] = lastModified;
  }
  return axios
    .get(apiUrl, {
      headers: requestHeaders,
      decompress: false,
      responseType: "stream",
      validateStatus: (status) =>
        (status >= 200 && status < 300) || status === 304,
    })
    .then(handleCompressedAxiosResponse)
    .then((response) => {
      console.info(
        `Weather forecast API responded with status code ${response.status}.`
      );

      if (response.status === 304) {
        if (!cachedResponse) {
          throw new Error(
            "Weather forecast API responded with status 304 but no previous response is cached."
          );
        }
        // Use cached response, since data hasn't changed in the API
        return cachedResponse;
      }

      /*
       * `response.headers["expires"]` value is the minimum cache length for
       * the response (handled manually) and `FORECAST_CACHE_MAX_AGE_SECONDS`
       * is the maximum age (handled by the cache library).
       *
       * If the API returns `304 Not Modified`, indicating that the forecast
       * hasn't been modified since the previously cached response, the cached
       * data can be used (past the 'Expires' HTTP header's date) all the way
       * until the maximum age.
       */

      const slimResponse = {
        config: {
          url: response.config.url,
          method: response.config.method,
          headers: response.config.headers,
        },
        data: response.data,
        headers: response.headers,
        status: response.status,
        statusText: response.statusText,
      };
      weatherCache.set(apiUrl, slimResponse, FORECAST_CACHE_MAX_AGE_SECONDS);
      return slimResponse;
    });
}

module.exports = {
  getForecast_v1: function (forecastType, country, county, city) {
    let yrForecastType;
    if (forecastType === "hourly") {
      yrForecastType = "forecast_hour_by_hour";
    } else if (forecastType === "overview") {
      yrForecastType = "forecast";
    }
    const url = getYrWeatherUrl_v1(country, county, city, yrForecastType);

    const cachedResponse = weatherCache.get(url);
    if (cachedResponse !== undefined) {
      return Promise.resolve(cachedResponse);
    }

    console.info(`Fetching weather forecast data from '${url}'...`);
    return axios
      .get(url, { headers: { "Accept-Encoding": "gzip, deflate" } })
      .then((response) => xmlParser.parseXmlAsync(response.data))
      .then((jsonData) => yrWeatherParser.generateWeatherResponse(jsonData))
      .then((weatherResponse) => {
        weatherCache.set(url, weatherResponse);
        return weatherResponse;
      });
  },

  /**
   * Supported 'forecastType' values: "overview", "hourly".
   *
   * Uses aggressive caching for Yr/Met.no API data.
   */
  getForecast_v2: function (forecastType, lat, lon, utcOffsetMinutes) {
    return fetchCachedForecast_v2(lat, lon).then((response) => {
      const { data } = response;

      // Check if transformed data for these parameters is already in cache
      const cacheKey =
        "parsed_yr_v2_forecast?forecastCoordinates=" +
        data.geometry.coordinates.join(",") +
        "&forecastDate=" +
        data.properties.meta.updated_at +
        "&outputType=" +
        forecastType +
        "&utcOffset=" +
        (utcOffsetMinutes || "Z");
      const cachedResponse = weatherCache.get(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Generate new Infoscreen API response
      const weatherResponse = yrWeatherParser2.generateWeatherResponse(
        data,
        forecastType,
        utcOffsetMinutes
      );
      weatherCache.set(
        cacheKey,
        weatherResponse,
        FORECAST_CACHE_DEFAULT_TTL_SECONDS
      );

      return weatherResponse;
    });
  },
};
