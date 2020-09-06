const axios = require("axios");
const cached = require("cached");

const xmlParser = require("../helpers/xmlParser");
const yrWeatherParser = require("../helpers/yrWeatherParser");

const CACHE_MAX_AGE_SECONDS = 6 * 60 * 60; // 6 hours

const YR_FORECAST_CACHE_TTL_SECONDS = 60 * 60; // 60 minutes
const YR_HOURLY_FORECAST = "forecast_hour_by_hour";
const YR_OVERVIEW_FORECAST = "forecast";

const weatherCache = cached("yrWeatherServiceCache", {
  backend: {
    type: "memory",
  },
  defaults: {
    expire: CACHE_MAX_AGE_SECONDS,
    freshFor: YR_FORECAST_CACHE_TTL_SECONDS,
  },
});

function getYrWeatherUrl(country, county, city, forecastType) {
  function encodeLocationParam(text) {
    return text.replace(" ", "_");
  }
  const api_country = encodeLocationParam(country);
  const api_county = encodeLocationParam(county);
  const api_city = encodeLocationParam(city);
  return `https://www.yr.no/place/${api_country}/${api_county}/${api_city}/${forecastType}.xml`;
}

module.exports = {
  getForecast: function (forecastType, country, county, city) {
    let yrForecastType;
    if (forecastType === "hourly") {
      yrForecastType = YR_HOURLY_FORECAST;
    } else if (forecastType === "overview") {
      yrForecastType = YR_OVERVIEW_FORECAST;
    }
    const url = getYrWeatherUrl(country, county, city, yrForecastType);
    return weatherCache.getOrElse(url, () => {
      return axios
        .get(url)
        .then((response) => xmlParser.parseXmlAsync(response.data))
        .then((jsonData) => yrWeatherParser.generateWeatherResponse(jsonData));
    });
  },
};
