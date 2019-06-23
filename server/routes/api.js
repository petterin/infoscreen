const express = require("express");

const WeatherService = require("../services/weather");
const MqttService = require("../services/mqtt");

function initRouter(config) {
  const router = express.Router();
  const mqttService = MqttService(config);

  // API routes

  router.get("/weather-forecast", (req, res, next) => {
    const { country, county, city, type } = req.query;
    const forecastType = type || "hourly";
    WeatherService.getForecast(forecastType, country, county, city)
      .then(weatherData => res.send(weatherData))
      .catch(error => {
        /* eslint-disable no-console */
        console.log(
          `Weather forecast API error: Error trying to make a ${error.config.method.toUpperCase()} ` +
            `request to '${error.config.url}': `,
          error.message
        );
        if (error.response) {
          console.log(
            "Weather forecast API error: Response body was:\n",
            error.response.data
          );
        }
        /* eslint-enable no-console */
        next(error);
      });
  });

  router.get("/weather-observation", (req, res, next) => {
    const { place } = req.query;
    WeatherService.getObservation(place)
      .then(result => res.send(result))
      .catch(error => {
        /* eslint-disable no-console */
        console.log(
          `Weather observation API: Error trying to make a ${error.config.method.toUpperCase()} ` +
            `request to '${error.config.url}': `,
          error.message
        );
        if (error.response) {
          console.log(
            "Weather observation API: Response body was:\n",
            error.response.data
          );
        }
        /* eslint-enable no-console */
        next(error);
      });
  });

  router.get("/sensor/:sensor_id", (req, res, next) => {
    const sensor = req.params["sensor_id"];
    mqttService
      .getLatestData(sensor)
      .then(result => res.send(result))
      .catch(error => {
        /* eslint-disable no-console */
        console.log(`Sensor API:`, error.message);
        /* eslint-enable no-console */
        next(error);
      });
  });

  return router;
}

module.exports = initRouter;
