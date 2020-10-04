/**
 * Parsing functions for Yr.no/MET.no API 2.0 weather forecasts
 *
 * See: https://api.met.no/weatherapi/locationforecast/2.0/documentation
 */

// MET.no 2.0 weather symbol code -> Weather-icons class name
// - https://api.met.no/weatherapi/weathericon/2.0/documentation
// - https://erikflowers.github.io/weather-icons/
const YR_WEATHER_SYMBOLS = {
  clearsky_day: "day-sunny", // Yr.no old id: 1
  clearsky_night: "night-clear",
  fair_day: "day-sunny-overcast", // 2
  fair_night: "night-partly-cloudy",
  partlycloudy_day: "day-cloudy", // 3
  partlycloudy_night: "night-cloudy",
  lightrainshowers_day: "day-sprinkle", // 40
  lightrainshowers_night: "night-sprinkle",
  rainshowers_day: "day-showers", // 5
  rainshowers_night: "night-showers",
  heavyrainshowers_day: "day-rain-wind", // 41
  heavyrainshowers_night: "night-rain-wind",
  lightrainshowersandthunder_day: "day-lightning", // 24
  lightrainshowersandthunder_night: "night-lightning",
  rainshowersandthunder_day: "day-storm-showers", // 6
  rainshowersandthunder_night: "night-storm-showers",
  heavyrainshowersandthunder_day: "day-thunderstorm", // 5
  heavyrainshowersandthunder_night: "night-thunderstorm",
  lightsleetshowers_day: "day-sleet", // 42
  lightsleetshowers_night: "night-sleet",
  sleetshowers_day: "day-sleet", // 7
  sleetshowers_night: "night-sleet",
  heavysleetshowers_day: "day-rain-mix", // 43
  heavysleetshowers_night: "night-rain-mix",
  lightssleetshowersandthunder_day: "day-sleet-storm", // 26
  lightssleetshowersandthunder_night: "night-sleet-storm",
  sleetshowersandthunder_day: "day-sleet-storm", // 20
  sleetshowersandthunder_nigt: "night-sleet-storm",
  heavysleetshowersandthunder_day: "day-sleet-storm", // 27
  heavysleetshowersandthunder_night: "night-sleet-storm",
  lightsnowshowers_day: "day-snow", // 4
  lightsnowshowers_night: "night-snow",
  snowshowers_day: "day-snow", // 8
  snowshowers_night: "night-snow",
  heavysnowshowers_day: "day-snow-wind", // 45
  heavysnowshowers_night: "night-snow-wind",
  lightssnowshowersandthunder_day: "day-snow-thunderstorm", // 28
  lightssnowshowersandthunder_night: "night-snow-thunderstorm",
  snowshowersandthunder_day: "day-snow-thunderstorm", // 21
  snowshowersandthunder_night: "night-snow-thunderstorm",
  heavysnowshowersandthunder_day: "day-snow-thunderstorm", // 29
  heavysnowshowersandthunder_night: "night-snow-thunderstorm",

  cloudy: "cloudy", // 4
  lightrain: "sprinkle", // 46
  rain: "showers", // 9
  heavyrain: "rain", // 10
  lightrainandthunder: "storm-showers", // 30
  rainandthunder: "thunderstorm", // 22
  heavyrainandthunder: "thunderstorm", // 11
  lightsleet: "sleet", // 47
  sleet: "sleet", // 12
  heavysleet: "rain-mix", // 48
  lightsleetandthunder: "storm-showers", // 31
  sleetandthunder: "storm-showers", // 23
  heavysleetandthunder: "storm-showers", // 32
  lightsnow: "snow", // 49
  snow: "snow", // 13
  heavysnow: "snow-wind", // 50
  lightsnowandthunder: "storm-showers", // 33
  snowandthunder: "storm-showers", // 14
  heavysnowandthunder: "storm-showers", // 34
  fog: "fog", // 15
};

function parseWeatherSymbol(code) {
  if (!code) {
    return code;
  }
  const parts = code.split("_");
  let parsed;
  if (parts.length === 2 && parts[1] === "polartwilight") {
    /* Convert "xx_polartwilight" to "xx_night" since our UI icon library
    doesn't have separate icons for polar days/nights. */
    parsed = YR_WEATHER_SYMBOLS[`${parts[0]}_night`];
  } else {
    parsed = YR_WEATHER_SYMBOLS[code];
  }
  return parsed !== undefined ? parsed : code;
}

function getCelsiusTemperature(value, unitName) {
  if (value === null || value === undefined) {
    return value;
  }
  switch (unitName) {
    case "celsius":
      return Math.round(value);
    case "fahrenheit":
      return Math.round((value - 32) / 1.8);
    default:
      console.warn("Unknown temperature unit:", unitName); // eslint-disable-line no-console
      return value;
  }
}

/**
 * Returns a forecast object for weather-forecast API response from timestep.
 * If the data for 'forecastKey' in this timestep does not exist, returns null.
 */
function generateForecastItem(timestep, forecastKey, timeTo, units) {
  if (!timestep.data[forecastKey]) {
    return null;
  }

  const instantDetails = timestep.data.instant.details;
  const forecastSummary = timestep.data[forecastKey].summary;
  const forecastDetails = timestep.data[forecastKey].details;

  return {
    timeFrom: timestep.time,
    timeTo: timeTo,
    weatherSymbol: parseWeatherSymbol(forecastSummary.symbol_code),
    weatherText: forecastSummary.symbol_code,
    temperature: {
      value: getCelsiusTemperature(
        instantDetails.air_temperature,
        units.air_temperature
      ),
      minValue: forecastDetails.air_temperature_min,
      maxValue: forecastDetails.air_temperature_max,
      unit: "celsius",
    },
    pressureHPa: instantDetails.air_pressure_at_sea_level,
    precipitation: {
      value: forecastDetails.precipitation_amount,
      minValue: forecastDetails.precipitation_amount_min,
      maxValue: forecastDetails.precipitation_amount_max,
      probability: forecastDetails.probability_of_precipitation,
    },
    wind: {
      speedMetersPerSecond: instantDetails.wind_speed,
      directionCode: undefined,
      directionDegrees: instantDetails.wind_from_direction,
    },
    cloudPercentage: instantDetails.cloud_area_fraction,
    relativeHumidity: instantDetails.relative_humidity,
  };
}

function generateForecastItems_1h(timeseries, units) {
  return timeseries
    .map((timestep) =>
      generateForecastItem(timestep, "next_1_hours", null, units)
    )
    .filter((item) => item !== null);
}

function formatLocalISODate(date, utcOffsetMinutes) {
  const d = new Date(date.valueOf());

  // Set UTC time like it was local time on 'utcOffsetMinutes' timezone
  d.setUTCMinutes(d.getUTCMinutes() + utcOffsetMinutes);

  const pad = (num) => (num < 10 ? "0" + num : String(num));

  const YYYY = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const DD = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());

  const tzSign = utcOffsetMinutes >= 0 ? "+" : "-";
  const tzHours = pad(Math.floor(Math.abs(utcOffsetMinutes / 60)));
  const tzMinutes = pad(Math.abs(utcOffsetMinutes) % 60);

  return `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}${tzSign}${tzHours}:${tzMinutes}`;
}

function generateForecastItems_6h(timeseries, units, utcOffsetMinutes) {
  const isMajorLocalHour = (origDate) => {
    let date = new Date(origDate.valueOf());
    if (utcOffsetMinutes !== undefined) {
      // Set UTC time like it was local time on 'utcOffsetMinutes' timezone
      date.setUTCMinutes(date.getUTCMinutes() + utcOffsetMinutes);
    }
    return date.getUTCHours() % 6 === 0;
  };

  return (
    timeseries
      // Reduce to timesteps that are round 6 hours after the first one
      .reduce((acc, timestep) => {
        if (acc.length < 1) {
          return [timestep];
        }
        const timestepDate = new Date(timestep.time);
        if (isMajorLocalHour(timestepDate)) {
          return [...acc, timestep];
        } else {
          return acc;
        }
      }, [])
      // Output timestamps in requested timezone if 'utcOffsetMinutes' is specified
      .map((timestep) => {
        if (utcOffsetMinutes === undefined) {
          return timestep;
        }
        return {
          ...timestep,
          time: formatLocalISODate(new Date(timestep.time), utcOffsetMinutes),
        };
      })
      .map((timestep, index, array) => {
        const timeTo = array.length > index + 1 ? array[index + 1].time : null;
        return generateForecastItem(timestep, "next_6_hours", timeTo, units);
      })
      .filter((item) => item !== null)
  );
}

const yrWeatherParser = {
  generateWeatherResponse: function (data, forecastType, utcOffsetMinutes) {
    let forecast = null;
    if (forecastType === "hourly") {
      forecast = generateForecastItems_1h(
        data.properties.timeseries,
        data.properties.meta.units
      );
    } else {
      // "overview" type
      forecast = generateForecastItems_6h(
        data.properties.timeseries,
        data.properties.meta.units,
        utcOffsetMinutes
      );
    }

    return {
      location: {
        latitude: data.geometry.coordinates[0],
        longitude: data.geometry.coordinates[1],
        altitude: data.geometry.coordinates[2],
      },
      meta: {
        lastUpdate: data.properties.meta.updated_at,
        creditText: "MET Norway (CC-BY 4.0)",
        creditUrl: "https://developer.yr.no/",
      },
      sun: null,
      forecast: forecast,
    };
  },
};

module.exports = yrWeatherParser;
