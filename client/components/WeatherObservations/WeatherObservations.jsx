import React from "react";
import axios from "axios";
import { injectIntl, FormattedMessage } from "react-intl";
import _ from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import "./WeatherObservations.css";

import dateHelper from "../../utils/dateHelper";
import { precisionRound } from "../../utils/numberUtils";
import { intlShape, observationLocationType } from "../../propTypes";

function getTemperatureChangeIcon(temperatureHistory) {
  if (
    temperatureHistory === undefined ||
    !Array.isArray(temperatureHistory) ||
    temperatureHistory.length < 2
  ) {
    return null;
  }
  const temperatureAverage =
    _.reduce(temperatureHistory, (sum, t) => sum + t.value, 0) /
    temperatureHistory.length;
  const currentTemperature = _.last(temperatureHistory).value;
  const diff = currentTemperature - temperatureAverage;
  if (diff > 0.5) {
    return <FontAwesomeIcon icon="arrow-up" style={{ color: "red" }} />;
  }
  if (diff > 0.15) {
    return <FontAwesomeIcon icon="angle-up" style={{ color: "red" }} />;
  }
  if (diff < -0.5) {
    return <FontAwesomeIcon icon="arrow-down" style={{ color: "blue" }} />;
  }
  if (diff < -0.15) {
    return <FontAwesomeIcon icon="angle-down" style={{ color: "blue" }} />;
  }
  return null;
}

function getAirPressureChangeIcon(pressureHistory) {
  if (
    pressureHistory === undefined ||
    !Array.isArray(pressureHistory) ||
    pressureHistory.length < 2
  ) {
    return null;
  }
  const oldestPressure = _.head(pressureHistory).value;
  const currentPressure = _.last(pressureHistory).value;
  const diff = currentPressure - oldestPressure;
  if (diff > 1.2) {
    return <FontAwesomeIcon icon="arrow-up" style={{ color: "green" }} />;
  }
  if (diff > 0.6) {
    return <FontAwesomeIcon icon="angle-up" style={{ color: "green" }} />;
  }
  if (diff < -1.2) {
    return <FontAwesomeIcon icon="arrow-down" style={{ color: "red" }} />;
  }
  if (diff < -0.6) {
    return <FontAwesomeIcon icon="angle-down" style={{ color: "red" }} />;
  }
  return null;
}

class WeatherObservations extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      weatherData: null,
    };
  }

  componentDidMount() {
    // Fetch new data now + every 2 minutes
    this.updateStateFromApi();
    this.fetchInterval = setInterval(() => this.updateStateFromApi(), 120000);
  }

  componentWillUnmount() {
    clearInterval(this.fetchInterval);
  }

  updateStateFromApi() {
    const { place } = this.props;
    const placeUrlParam = place.replace(" ", "");
    axios
      .get(`/api/weather-observation?place=${placeUrlParam}`)
      .then((response) => this.setState({ weatherData: response.data }))
      .catch((err) => {
        console.error("Weather observation data failed to load.", err); // eslint-disable-line no-console
      });
  }

  render() {
    const { place, intl } = this.props;
    const { weatherData } = this.state;
    const formatDate = dateHelper(intl.locale).parseAndFormatDate;
    const clockPattern =
      {
        fi: "'klo' H:mm",
        en: "'at' h:mm a",
      }[intl.locale] || "HH:mm";
    const weekdayTimePattern = `EEEE ${clockPattern}`;
    return (
      <div className="observations">
        <h2 className="location">
          {_.get(weatherData, "location.place", `${place}...`)}
        </h2>
        <div className="measurement">
          <span className="label">
            <FormattedMessage id="weatherObservations.temperature" />
          </span>
          <span
            className="value"
            title={`Min: ${intl.formatNumber(
              _.get(weatherData, "temperature.minValue", 0)
            )}, Max: ${intl.formatNumber(
              _.get(weatherData, "temperature.maxValue", 0)
            )}`}
          >
            {getTemperatureChangeIcon(
              _.get(weatherData, "temperature.history")
            )}{" "}
            {intl.formatNumber(_.get(weatherData, "temperature.latest.value"))}{" "}
            <span className="unit">°C</span>
          </span>
        </div>
        <div className="measurement">
          <span className="label">
            <FormattedMessage id="weatherObservations.relativeHumidity" />
          </span>
          <span
            className="value"
            title={`Min: ${intl.formatNumber(
              _.get(weatherData, "relativeHumidity.minValue", 0)
            )} %, Max: ${intl.formatNumber(
              _.get(weatherData, "relativeHumidity.maxValue", 0)
            )} %`}
          >
            {intl.formatNumber(
              _.get(weatherData, "relativeHumidity.latest.value")
            )}{" "}
            <span className="unit">%</span>
          </span>
        </div>
        <div className="measurement">
          <span className="label">
            <FormattedMessage id="weatherObservations.rainIntensity" />
          </span>
          <span
            className="value"
            title={`Min: ${intl.formatNumber(
              _.get(weatherData, "rainIntensity.minValue", 0)
            )}, Max: ${intl.formatNumber(
              _.get(weatherData, "rainIntensity.maxValue", 0)
            )}`}
          >
            {intl.formatNumber(
              _.get(weatherData, "rainIntensity.latest.value")
            )}{" "}
            <span className="unit">mm/h</span>
          </span>
        </div>
        <div className="measurement">
          <span className="label">
            <FormattedMessage id="weatherObservations.rainAmountHourly" />
          </span>
          <span className="value">
            {intl.formatNumber(_.get(weatherData, "rainAmount.latest.value"))}{" "}
            <span className="unit">mm</span>
          </span>
        </div>
        <div className="measurement">
          <span className="label">
            <FormattedMessage id="weatherObservations.airPressure" />
          </span>
          <span
            className="value"
            title={`Min: ${intl.formatNumber(
              _.get(weatherData, "airPressure.minValue", 0)
            )}, Max: ${intl.formatNumber(
              _.get(weatherData, "airPressure.maxValue", 0)
            )}`}
          >
            {getAirPressureChangeIcon(
              _.get(weatherData, "airPressure.history")
            )}{" "}
            {intl.formatNumber(
              precisionRound(_.get(weatherData, "airPressure.latest.value"), 0)
            )}{" "}
            <span className="unit">hPa</span>
          </span>
        </div>
        <div className="measurement">
          <span className="label">
            <FormattedMessage id="weatherObservations.clouds" />
          </span>
          <span className="value">
            {_.get(weatherData, "clouds.latest.value")}{" "}
            <span className="unit">/ 8</span>
          </span>
        </div>
        <div className="measurement">
          <span className="label">
            <FormattedMessage id="weatherObservations.visibility" />
          </span>
          <span className="value">
            {intl.formatNumber(
              Number(
                _.get(weatherData, "visibility.latest.value") / 1000.0
              ).toPrecision(2)
            )}{" "}
            <span className="unit">km</span>
          </span>
        </div>

        <div className="footer">
          <div className="credits">
            <a
              href={_.get(weatherData, "meta.creditUrl")}
              title={_.get(weatherData, "meta.creditText")}
            >
              <FormattedMessage id="weatherObservations.dataCredit" />{" "}
              <b>fmi.fi</b>
            </a>
          </div>
          <div className="updated">
            <FormattedMessage id="weatherObservations.observationTime" />{" "}
            <b>
              {formatDate(
                _.get(weatherData, "temperature.latest.time"),
                weekdayTimePattern
              )}
              {/* formatDate(_.get(weatherData, "meta.endTime"), weekdayTimePattern) */}
            </b>
          </div>
        </div>
      </div>
    );
  }
}

WeatherObservations.propTypes = {
  place: observationLocationType.isRequired,
  intl: intlShape.isRequired,
};

WeatherObservations.defaultProps = {};

export default injectIntl(WeatherObservations);
