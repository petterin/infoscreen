const axios = require("axios");
const NodeCache = require("node-cache");

const xmlParser = require("../helpers/xmlParser");
const yrWeatherParser = require("../helpers/yrWeatherParser");
const yrWeatherParser2 = require("../helpers/yrWeatherParser2");
const apiHelpers = require("../helpers/apiHelpers");

const FORECAST_CACHE_MAX_AGE_SECONDS = 6 * 60 * 60; // 6 hours
const FORECAST_CACHE_DEFAULT_TTL_SECONDS = 60 * 60; // 60 minutes
// Yr.no/MET.no API 2.0 requires coordinates to be rounded to 4 or less decimals
const COORDINATE_MAX_DECIMALS = 3;

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
  const { roundCoordinate } = apiHelpers;
  const lat = roundCoordinate(latitude, COORDINATE_MAX_DECIMALS);
  const lon = roundCoordinate(longitude, COORDINATE_MAX_DECIMALS);
  return `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${lat}&lon=${lon}`;
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
   * Fetch weather forecast for the location.
   *
   * Uses aggressive caching for Yr/Met.no API data.
   *
   * @param {string} forecastType Type of forecast: "overview" or "hourly"
   * @param {number} lat Latitude of the forecast location as decimal number
   * @param {number} lon Longitude of the forecast location as decimal number
   * @param {number} utcOffsetMinutes Offset between local time zone and UTC in minutes (e.g. +02:00 -> 120)
   */
  getForecast_v2: function (forecastType, lat, lon, utcOffsetMinutes) {
    const apiUrl = getYrWeatherUrl_v2(lat, lon);
    return apiHelpers
      .cachedRequest(
        apiUrl,
        "Weather Forecast",
        FORECAST_CACHE_DEFAULT_TTL_SECONDS,
        FORECAST_CACHE_MAX_AGE_SECONDS
      )
      .then((response) => {
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
