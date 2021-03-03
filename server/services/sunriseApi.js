const NodeCache = require("node-cache");

const apiHelpers = require("../helpers/apiHelpers");

// MET.no Sunrise API needs only 1 decimal (it just truncates more than that without rounding)
const SUNRISE_COORDINATE_DECIMALS = 1;

const cache = new NodeCache({
  stdTTL: 21600, // 6 hours
  checkperiod: 3600, // 1 hour
  useClones: false,
  deleteOnExpire: true,
});

// API documentation: https://api.met.no/weatherapi/sunrise/2.0/documentation
function getApiUrl(date, latitude, longitude, utcOffsetStr) {
  const { roundCoordinate } = apiHelpers;
  const SUNRISE_BASE_URL = "https://api.met.no/weatherapi/sunrise/2.0/.json";
  const lat = roundCoordinate(latitude, SUNRISE_COORDINATE_DECIMALS);
  const lon = roundCoordinate(longitude, SUNRISE_COORDINATE_DECIMALS);
  const offset = encodeURIComponent(utcOffsetStr);
  const params = `date=${date}&lat=${lat}&lon=${lon}&offset=${offset}`;
  return `${SUNRISE_BASE_URL}?${params}`;
}

function generateSunriseResponse(data, date) {
  const times = data.location.time.find((t) => t.date === date);
  return {
    licenseUrl: data.meta.licenseurl,
    sunrise: (times.sunrise || {}).time,
    sunset: (times.sunset || {}).time,
  };
}

module.exports = {
  getSunriseTimes: function (dateParam, lat, lon, utcOffsetStr) {
    let date = dateParam;
    if (!dateParam) {
      date = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    }

    const url = getApiUrl(date, lat, lon, utcOffsetStr);

    const cachedData = cache.get(url);
    if (cachedData !== undefined) {
      return Promise.resolve(cachedData);
    }

    const defaultTtl = 21600; // 6 hours
    const maxTtl = 21600; // 6 hours

    return apiHelpers
      .cachedRequest(url, "Sunrise", defaultTtl, maxTtl)
      .then((response) => generateSunriseResponse(response.data, date))
      .then((sunriseData) => {
        cache.set(url, sunriseData);
        return sunriseData;
      });
  },
};
