const axios = require("axios");
const cached = require("cached");

const xmlParser = require("../helpers/xmlParser");
const yrWeatherParser = require("../helpers/yrWeatherParser");
const fmiWeatherParser = require("../helpers/fmiWeatherParser");

const CACHE_MAX_AGE_SECONDS = 6 * 60 * 60; // 6 hours

const YR_FORECAST_CACHE_TTL_SECONDS = 60 * 60; // 60 minutes
const YR_HOURLY_FORECAST = "forecast_hour_by_hour";
const YR_OVERVIEW_FORECAST = "forecast";

const FMI_OBSERVATION_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
/* Using 75-minute history to not get too much extra data but to always catch
   also those parameters like "r_1h" that are recorded only every 60 minutes. */
const FMI_HISTORY_LENGTH_MINUTES = 75;

const weatherCache = cached("weatherServiceCache", {
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

function getFmiObservationBaseUrl(place) {
  const TIMESTEP = 10; // minutes
  const parameters = fmiWeatherParser
    .getAllSupportedObservationParameters()
    .join(",");
  return (
    `https://opendata.fmi.fi/wfs?service=WFS&version=2.0.0&request=getFeature` +
    `&storedquery_id=fmi::observations::weather::timevaluepair` +
    `&place=${place}` +
    `&timestep=${TIMESTEP}` +
    `&parameters=${parameters}`
  );
}

function withFmiStartTimeParameter(
  baseUrl,
  currentTimeInMillis,
  historyMinutes
) {
  const historyLengthMillis = historyMinutes * 60 * 1000;
  const startTimeObj = new Date(currentTimeInMillis - historyLengthMillis);
  const startTimeStr = startTimeObj.toISOString();
  return `${baseUrl}&starttime=${startTimeStr}`;
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
      console.info(`Fetching weather forecast data from '${url}'...`); // eslint-disable-line no-console
      return axios
        .get(url)
        .then((response) => xmlParser.parseXmlAsync(response.data))
        .then((jsonData) => yrWeatherParser.generateWeatherResponse(jsonData));
    });
  },

  getObservation: function (place) {
    const baseUrl = getFmiObservationBaseUrl(place);
    const fmiCacheOpts = {
      expire: FMI_OBSERVATION_CACHE_TTL_SECONDS, // expiration set to get fresh data as soon as available
      freshFor: FMI_OBSERVATION_CACHE_TTL_SECONDS,
    };
    return weatherCache.getOrElse(
      baseUrl,
      () => {
        const currentTimeInMillis = Date.now();
        const url = withFmiStartTimeParameter(
          baseUrl,
          currentTimeInMillis,
          FMI_HISTORY_LENGTH_MINUTES
        );
        console.info(`Fetching weather observation data from '${url}'...`); // eslint-disable-line no-console
        return axios
          .get(url)
          .then((response) => xmlParser.parseXmlAsync(response.data))
          .then((parsedData) =>
            fmiWeatherParser.generateObservationResponse(parsedData)
          );
      },
      fmiCacheOpts
    );
  },
};
