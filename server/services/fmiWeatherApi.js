const axios = require("axios");
const NodeCache = require("node-cache");

const xmlParser = require("../helpers/xmlParser");
const fmiWeatherParser = require("../helpers/fmiWeatherParser");

const FMI_OBSERVATION_CACHE_TTL_SECONDS = 5 * 60; // 5 minutes
/* Using 75-minute history to not get too much extra data but to always catch
   also those parameters like "r_1h" that are recorded only every 60 minutes. */
const FMI_HISTORY_LENGTH_MINUTES = 75;

const weatherCache = new NodeCache({
  stdTTL: FMI_OBSERVATION_CACHE_TTL_SECONDS,
  checkperiod: FMI_OBSERVATION_CACHE_TTL_SECONDS,
  useClones: false,
  deleteOnExpire: true,
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

    const cachedResponse = weatherCache.get(baseUrl);
    if (cachedResponse !== undefined) {
      return Promise.resolve(cachedResponse);
    }

    const currentTimeInMillis = Date.now();
    const url = withFmiStartTimeParameter(
      baseUrl,
      currentTimeInMillis,
      FMI_HISTORY_LENGTH_MINUTES
    );
    console.info(`Fetching weather observation data from '${url}'...`);
    return axios
      .get(url)
      .then((response) => xmlParser.parseXmlAsync(response.data))
      .then((parsedData) =>
        fmiWeatherParser.generateObservationResponse(parsedData)
      )
      .then((observationResponse) => {
        weatherCache.set(baseUrl, observationResponse);
        return observationResponse;
      });
  },
};
