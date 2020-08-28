// YR.no weather symbol code -> Weather-icons class name
const YR_WEATHER_SYMBOLS = {
  "01d": "day-sunny",
  "01n": "night-clear",
  "01m": "night-clear",
  "02d": "day-sunny-overcast",
  "02n": "night-partly-cloudy",
  "02m": "night-partly-cloudy",
  "03d": "day-cloudy",
  "03n": "night-cloudy",
  "03m": "night-cloudy",
  "04": "cloudy",

  "40d": "day-sprinkle", // light rain showers
  "40n": "night-sprinkle",
  "05d": "day-showers", // rain showers
  "05n": "night-showers",
  "41d": "day-rain-wind", // heavy rain showers
  "41n": "night-rain-wind",
  "24d": "day-lightning", // light rain showers and thunder
  "24n": "night-lightning",
  "06d": "day-storm-showers", // Rain showers AND thunder
  "06n": "night-storm-showers",
  "25d": "day-thunderstorm", // Heavy rain showers and thunder
  "25n": "night-thunderstorm",
  "42d": "day-sleet", // Light sleet showers
  "42n": "night-sleet",
  "07d": "day-sleet", // Sleet showers
  "07n": "night-sleet",
  "43d": "day-rain-mix", // Heavy sleet showers
  "43n": "night-rain-mix",
  "26d": "day-sleet-storm", // Light sleet showers and thunder
  "26n": "night-sleet-storm",
  "20d": "day-sleet-storm", // Sleet showers and thunder
  "20n": "night-sleet-storm",
  "27d": "day-sleet-storm", // Heavy sleet showers and thunder
  "27n": "night-sleet-storm",
  "44d": "day-snow", // Light snow showers
  "44n": "night-snow",
  "08d": "day-snow", // Snow showers
  "08n": "night-snow",
  "45d": "day-snow-wind", // Heavy snow showers
  "45n": "night-snow-wind",
  "28d": "day-snow-thunderstorm", // Light snow showers and thunder
  "28n": "night-snow-thunderstorm",
  "21d": "day-snow-thunderstorm", // Snow showers and thunder
  "21n": "night-snow-thunderstorm",
  "29d": "day-snow-thunderstorm", // Heavy snow showers and thunder
  "29n": "night-snow-thunderstorm",

  46: "sprinkle", // Light rain
  "09": "showers", // Rain
  10: "rain", // Heavy rain
  30: "storm-showers", // Light rain and thunder
  22: "thunderstorm", // Rain and thunder
  11: "thunderstorm", // Heavy rain and thunder
  47: "sleet", // Light sleet
  12: "sleet", // Sleet
  48: "rain-mix", // Heavy sleet
  31: "storm-showers", // Light sleet and thunder
  23: "storm-showers", // Sleet and thunder
  32: "storm-showers", // Heavy sleet and thunder
  49: "snow", // Light snow
  13: "snow", // Snow
  50: "snow-wind", // Heavy snow
  33: "storm-showers", // Light snow and thunder
  14: "storm-showers", // Snow and thunder
  34: "storm-showers", // Heavy snow and thunder
  15: "fog", // Fog
};

const yrWeatherParser = {
  generateWeatherResponse: function (data) {
    return {
      location: {
        city: data.weatherdata.location[0].name[0],
        country: data.weatherdata.location[0].country[0],
        latitude: data.weatherdata.location[0].location[0].$.latitude,
        longitude: data.weatherdata.location[0].location[0].$.longitude,
      },
      meta: {
        lastUpdate: data.weatherdata.meta[0].lastupdate[0],
        nextUpdate: data.weatherdata.meta[0].nextupdate[0],
        creditText: data.weatherdata.credit[0].link[0].$.text,
        creditUrl: data.weatherdata.credit[0].link[0].$.url,
      },
      sun: {
        rise: data.weatherdata.sun[0].$.rise,
        set: data.weatherdata.sun[0].$.set,
      },
      forecast: data.weatherdata.forecast[0].tabular[0].time.map(
        (forecastRow) => this.generateForecastItem(forecastRow)
      ),
    };
  },

  generateForecastItem: function (data) {
    return {
      timeFrom: data.$.from,
      timeTo: data.$.to,
      weatherSymbol: this.parseWeatherSymbol(data.symbol[0].$.var),
      weatherText: data.symbol[0].$.name,
      temperatureCelsius: this.getCelsiusTemperature(
        data.temperature[0].$.value,
        data.temperature[0].$.unit
      ),
      pressureHPa: data.pressure[0].$.value,
      precipitation: {
        value: data.precipitation[0].$.value,
        minValue: data.precipitation[0].$.minvalue,
        maxValue: data.precipitation[0].$.maxvalue,
      },
      wind: {
        speedMetersPerSecond: data.windSpeed[0].$.mps,
        directionCode: data.windDirection[0].$.code,
        directionDegrees: data.windDirection[0].$.deg,
      },
    };
  },

  getCelsiusTemperature: function (value, unitName) {
    switch (unitName) {
      case "celsius":
        return value;
      case "fahrenheit":
        return String((parseInt(value, 10) - 32) / 1.8);
      default:
        console.warn("Unknown temperature unit:", unitName); // eslint-disable-line no-console
        return value;
    }
  },

  parseWeatherSymbol: function (code) {
    const parsed = YR_WEATHER_SYMBOLS[code];
    return parsed !== undefined ? parsed : code;
  },
};

module.exports = yrWeatherParser;
