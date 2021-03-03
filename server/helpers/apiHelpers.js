const zlib = require("zlib");
const axios = require("axios");
const NodeCache = require("node-cache");

// User-Agent string with identifiable application name (required by Yr.no/MET.no API 2.0)
const APP_USER_AGENT = "infoscreen/0.1 https://github.com/petterin/infoscreen";

const CACHE = new NodeCache({
  stdTTL: 3600, // 1 hour
  checkperiod: 3600, // 1 hour
  useClones: false,
  deleteOnExpire: true,
});

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
 * Gets Yr/Met.no 2.0 API response either from API or from local cache.
 * Return value is an Axios Response object.
 *
 * Cached value is used if such exists for the rounded coordinates, and:
 * 1) The date in 'Expires' header of the last cached response hasn't yet
 * passed, or
 * 2) MET.no API returns status 304 when queried with `If-Modified-Since`
 * header using last returned 'Last-Modified' value.
 *
 * @param {string} apiUrl Full URL of the cached GET request to make
 * @param {string} apiName Name of the API to be used with logging
 * @param {number} defaultTtl Default TTL in seconds (used if there is no expiration date in headers)
 * @param {number} maxTtl Maximum number of seconds a request will be stored in the cache
 */
function cachedRequest(apiUrl, apiName, defaultTtl, maxTtl) {
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
      const millisToExpiration = CACHE.getTtl(apiUrl) - Date.now();
      const defaultVsMaxExpiration = 1000 * (maxTtl - defaultTtl);
      const millisToDefaultExpiration =
        millisToExpiration - defaultVsMaxExpiration;
      return millisToDefaultExpiration > 0;
    }
  }

  const cachedResponse = CACHE.get(apiUrl);
  if (isFresh(cachedResponse)) {
    return Promise.resolve(cachedResponse);
  }

  console.info(`Requesting new ${apiName} data from '${apiUrl}'...`);
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
        `${apiName} API responded with status code ${response.status}.`
      );

      if (response.status === 304) {
        if (!cachedResponse) {
          throw new Error(
            `${apiName} API responded with status 304 but no previous response is cached.`
          );
        }
        // Use cached response, since data hasn't changed in the API
        return cachedResponse;
      }

      /*
       * `response.headers["expires"]` value is the minimum cache length for
       * the response (handled manually) and `maxTtl` is the maximum age
       * (handled by the cache library).
       *
       * If the API returns `304 Not Modified`, indicating that the forecast
       * hasn't been modified since the previously cached response, the cached
       * data can be used (past the 'Expires' HTTP header's date) all the way
       * until the maximum age.
       */

      // Axios-style HTTP response object with often-required fields only
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
      CACHE.set(apiUrl, slimResponse, maxTtl);
      return slimResponse;
    });
}

module.exports = {
  cachedRequest,
  roundCoordinate,
};
