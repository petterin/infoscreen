import React from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { injectIntl, FormattedMessage } from "react-intl";
import _ from "lodash";

import "weather-icons/css/weather-icons.css";
import "./WeatherForecast.css";

import dateHelperInit from "../../utils/dateHelper";
import { intlShape, weatherLocationType } from "../../propTypes";

function getTime(dateStr, locale, withDate = false) {
  if (dateStr === null) return "";
  let pattern;
  if (withDate) {
    if (locale === "fi-FI") {
      // date-fns has stupid medium-level abbreviations for Finnish weekdays, so forcing 2-letter ones
      pattern = "EEEEEE HH";
    } else {
      pattern = "EEE HH";
    }
  } else {
    pattern = "HH";
  }
  return dateHelperInit(locale).parseAndFormatDate(dateStr, pattern);
}

function formatUpdateTime(dateStr, locale) {
  return dateHelperInit(locale).parseAndFormatDate(dateStr, "EEEE HH:mm");
}

function getWeatherIcon(symbol, text) {
  const weatherSymbol = symbol || "na";
  const weatherText = text || weatherSymbol;
  const iconClass = `wi wi-${weatherSymbol}`;
  return <i className={iconClass} title={weatherText} />;
}

function getMinMaxValue(minValue, maxValue, value, minMaxSeparator = "–") {
  if (
    minValue === undefined ||
    maxValue === undefined ||
    (value === minValue && value === maxValue)
  ) {
    return value;
  }
  if (minValue === maxValue) {
    return minValue;
  }
  return `${minValue}${minMaxSeparator}${maxValue}`;
}

const WeatherForecastCell = ({
  className,
  locale,
  timeFrom,
  timeTo,
  temperature,
  weatherSymbol,
  weatherText,
  precipitation,
}) => (
  <div className={className}>
    <div className="time">
      <span className="time-from">{getTime(timeFrom, locale, true)}</span>
      <span className="time-separator">&ndash;</span>
      <span className="time-to">{getTime(timeTo, locale)}</span>
    </div>
    <div className="weather-icon">
      {getWeatherIcon(weatherSymbol, weatherText)}
    </div>
    <div className="temperature">
      <span className="temperature-num">{temperature.value}</span>
      <span className="temperature-unit">°C</span>
    </div>
    <div className="precipitation">
      <span className="precipitation-num">
        {getMinMaxValue(
          precipitation.minValue,
          precipitation.maxValue,
          precipitation.value
        )}
      </span>
      <span className="precipitation-unit">mm</span>
    </div>
  </div>
);

WeatherForecastCell.propTypes = {
  className: PropTypes.string,
  locale: PropTypes.string,
  timeFrom: PropTypes.string,
  timeTo: PropTypes.string,
  temperature: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    minValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    maxValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  weatherSymbol: PropTypes.string,
  weatherText: PropTypes.string,
  precipitation: PropTypes.shape({
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    minValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    maxValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};

WeatherForecastCell.defaultProps = {
  className: "",
  locale: undefined,
  timeFrom: null,
  timeTo: null,
  temperature: { value: "-" },
  weatherSymbol: "na",
  weatherText: null,
  precipitation: {},
};

class WeatherForecast extends React.Component {
  constructor(props) {
    super(props);
    this.dateHelper = dateHelperInit(props.intl.locale);
    this.state = {
      weather: null,
    };
  }

  componentDidMount() {
    // Fetch new data now + every 10 minutes
    const UPDATE_INVERVAL = 10 * 60 * 1000;
    this.updateStateFromApi();
    this.fetchInterval = setInterval(
      () => this.updateStateFromApi(),
      UPDATE_INVERVAL
    );
  }

  componentWillUnmount() {
    clearInterval(this.fetchInterval);
  }

  updateStateFromApi() {
    const { location } = this.props;
    const { country, county, city, lat, lon } = location;
    const utcOffset = -new Date().getTimezoneOffset();
    const url =
      lat && lon
        ? `/api/weather-forecast-v2?type=overview&lat=${lat}&lon=${lon}&utcOffset=${utcOffset}`
        : `/api/weather-forecast?type=overview&country=${country}&county=${county}&city=${city}`;
    axios
      .get(url)
      .then((response) => this.setState({ weather: response.data }))
      .catch((err) => {
        console.error("Weather forecast data failed to load.", err); // eslint-disable-line no-console
      });
  }

  render() {
    const { location, intl } = this.props;
    const { weather } = this.state;
    const forecastData = (weather && weather.forecast) || [];
    const currentWeather = _.head(forecastData.slice(0, 1));
    const neartermForecasts = forecastData.slice(1, 4); // show 3 next forecasts after current
    const getForecastCell = (forecast, cellType, key) => (
      <WeatherForecastCell
        key={key}
        className={cellType}
        locale={intl.locale}
        timeFrom={forecast.timeFrom}
        timeTo={forecast.timeTo}
        temperature={forecast.temperature}
        weatherSymbol={forecast.weatherSymbol}
        weatherText={forecast.weatherText}
        precipitation={forecast.precipitation}
      />
    );
    return (
      <div className="weather weather-summary">
        <div className="forecasts">
          <div className="current-weather">
            <div className="location">
              {_.get(
                weather,
                "location.city",
                `${location.city}${weather ? "" : "..."}`
              )}
            </div>
            {currentWeather
              ? getForecastCell(
                  currentWeather,
                  "primary",
                  `forecast-${currentWeather.timeFrom || ""}`
                )
              : null}
          </div>
          <div className="future-weather">
            {neartermForecasts.map((forecast, index) =>
              getForecastCell(
                forecast,
                "secondary",
                `forecast-${forecast.timeFrom || index}`
              )
            )}
          </div>
        </div>
        <div
          className="updated"
          title={`${intl.formatMessage({
            id: "weatherForecast.nextUpdate",
          })} ${formatUpdateTime(
            _.get(weather, "meta.nextUpdate"),
            intl.locale
          )}`}
        >
          <FormattedMessage id="weatherForecast.forecastUpdatedOn" />{" "}
          <b>
            {formatUpdateTime(_.get(weather, "meta.lastUpdate"), intl.locale)}
          </b>
        </div>
        <div className="credits">
          <a
            href={_.get(weather, "meta.creditUrl")}
            title={_.get(weather, "meta.creditText")}
          >
            <FormattedMessage id="weatherForecast.dataCredit" /> <b>Yr.no</b>
          </a>
        </div>
      </div>
    );
  }
}

WeatherForecast.propTypes = {
  location: weatherLocationType.isRequired,
  intl: intlShape.isRequired,
};

WeatherForecast.defaultProps = {};

export default injectIntl(WeatherForecast);
