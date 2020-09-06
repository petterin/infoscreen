const axios = require("axios");
const cached = require("cached");

const xmlParser = require("../helpers/xmlParser");
const fmiWeatherParser = require("../helpers/fmiWeatherParser");

const FMI_OBSERVATION_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
/* Using 75-minute history to not get too much extra data but to always catch
   also those parameters like "r_1h" that are recorded only every 60 minutes. */
const FMI_HISTORY_LENGTH_MINUTES = 75;

const weatherCache = cached("fmiWeatherServiceCache", {
  backend: {
    type: "memory",
  },
  defaults: {
    expire: FMI_OBSERVATION_CACHE_TTL_SECONDS, // expiration set to get fresh data as soon as available
    freshFor: FMI_OBSERVATION_CACHE_TTL_SECONDS,
  },
});

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
  getObservation: function (place) {
    const baseUrl = getFmiObservationBaseUrl(place);
    return weatherCache.getOrElse(baseUrl, () => {
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
    });
  },
};
