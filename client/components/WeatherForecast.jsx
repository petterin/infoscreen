import React from "react";
import PropTypes from "prop-types";
import axios from "axios";
import { injectIntl, FormattedMessage } from "react-intl";
import _ from "lodash";

import "weather-icons/css/weather-icons.css";
import "../styles/WeatherForecast.css";

import dateHelperInit from "../util/dateHelper";
import { intlShape, weatherLocationType } from "../propTypes";

function getTime(dateStr, locale, withDate = false) {
  if (dateStr === null) return "";
  let pattern;
  if (withDate) {
    if (locale === "fi") {
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

const WeatherForecastCell = ({
  className,
  locale,
  timeFrom,
  timeTo,
  temperatureCelsius,
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
      <span className="temperature-num">{temperatureCelsius}</span>
      <span className="temperature-unit">°C</span>
    </div>
    <div className="precipitation">
      <span className="precipitation-num">
        {precipitation.minValue !== undefined
          ? `${precipitation.minValue}–${precipitation.maxValue}`
          : precipitation.value}
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
  temperatureCelsius: PropTypes.string,
  weatherSymbol: PropTypes.string,
  weatherText: PropTypes.string,
  precipitation: PropTypes.shape({
    value: PropTypes.string,
    minValue: PropTypes.string,
    maxValue: PropTypes.string,
  }),
};

WeatherForecastCell.defaultProps = {
  className: "",
  locale: undefined,
  timeFrom: null,
  timeTo: null,
  temperatureCelsius: "-",
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
    const { country, county, city } = location;
    axios
      .get(
        `/api/weather-forecast?type=overview&country=${country}&county=${county}&city=${city}`
      )
      .then((response) => this.setState({ weather: response.data }))
      .catch((err) => {
        console.error("Weather forecast data failed to load.", err); // eslint-disable-line no-console
      });
  }

  render() {
    const { location, intl } = this.props;
    const { weather } = this.state;
    const forecastCells = [
      "primary",
      "secondary",
      "secondary",
      "secondary last",
    ].map((className, index) => {
      const dateKey = _.get(weather, `forecast[${index}].timeFrom`) || index;
      return (
        <WeatherForecastCell
          key={`forecast-${dateKey}`}
          className={className}
          locale={intl.locale}
          timeFrom={_.get(weather, `forecast[${index}].timeFrom`)}
          timeTo={_.get(weather, `forecast[${index}].timeTo`)}
          temperatureCelsius={_.get(
            weather,
            `forecast[${index}].temperatureCelsius`
          )}
          weatherSymbol={_.get(weather, `forecast[${index}].weatherSymbol`)}
          weatherText={_.get(weather, `forecast[${index}].weatherText`)}
          precipitation={_.get(weather, `forecast[${index}].precipitation`)}
        />
      );
    });
    return (
      <div className="weather weather-summary">
        <div className="location">
          {_.get(weather, "location.city", `${location.city}...`)}
        </div>
        {forecastCells}
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
