const express = require("express");

const FmiWeatherService = require("../services/fmiWeatherApi");
const YrWeatherService = require("../services/yrWeatherApi");
const SunriseAPI = require("../services/sunriseApi");
const MqttService = require("../services/mqtt");

function initRouter(config) {
  const router = express.Router();
  const mqttService = MqttService(config);

  // API routes

  router.get("/config", (req, res) => {
    res.json(config);
  });

  router.get("/sunrise", (req, res, next) => {
    const { date, lat, lon, utcOffset } = req.query;
    SunriseAPI.getSunriseTimes(date, lat, lon, utcOffset)
      .then((sunriseTimes) => res.send(sunriseTimes))
      .catch((error) => {
        /* eslint-disable no-console */
        if (error.config) {
          console.log(
            `Sunrise API error: Error trying to make a ${error.config.method.toUpperCase()} ` +
              `request to '${error.config.url}': `,
            error.message
          );
        } else {
          console.error(`Unknown error in Sunrise API:`, error);
        }
        if (error.response) {
          console.log(
            "Sunrise API error: Response body was:\n",
            error.response.data
          );
        }
        /* eslint-enable no-console */
        next(error);
      });
  });

  router.get("/weather-forecast", (req, res, next) => {
    const { country, county, city, type } = req.query;
    const forecastType = type || "hourly";
    YrWeatherService.getForecast_v1(forecastType, country, county, city)
      .then((weatherData) => res.send(weatherData))
      .catch((error) => {
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

  router.get("/weather-forecast-v2", (req, res, next) => {
    const { lat, lon, type, utcOffset } = req.query;

    const forecastType = type || "hourly";

    let utcOffsetMinutes = undefined;
    if (utcOffset) {
      const utcOffsetNum = parseInt(utcOffset);
      if (!isNaN(utcOffsetNum)) {
        utcOffsetMinutes = utcOffsetNum;
      }
    }

    YrWeatherService.getForecast_v2(forecastType, lat, lon, utcOffsetMinutes)
      .then((weatherData) => res.send(weatherData))
      .catch((error) => {
        if (error.config) {
          console.log(
            `Weather forecast API error: Error trying to make a ${error.config.method.toUpperCase()} ` +
              `request to '${error.config.url}':`,
            error.message,
            "\nCONFIG:",
            error.config
          );
        } else {
          console.error("Unknown error while getting weather forecast:", error);
        }
        if (error.response) {
          console.log(
            "Weather forecast API error: Response body was:\n",
            error.response.data
          );
        }
        next(error);
      });
  });

  router.get("/weather-observation", (req, res, next) => {
    const { place } = req.query;
    FmiWeatherService.getObservation(place)
      .then((result) => res.send(result))
      .catch((error) => {
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
      .then((result) => res.send(result))
      .catch((error) => {
        /* eslint-disable no-console */
        console.log(`Sensor API:`, error.message);
        /* eslint-enable no-console */
        next(error);
      });
  });

  return router;
}

module.exports = initRouter;
