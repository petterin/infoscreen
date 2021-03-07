import React from "react";
import axios from "axios";
import { injectIntl, FormattedMessage } from "react-intl";
import _ from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import "./WeatherObservations.css";

import dateHelper from "../../utils/dateHelper";
import { intlShape, observationLocationType } from "../../propTypes";
import Observation from "../common/Observation";

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
    const getNumericValue = (key) =>
      intl.formatNumber(_.get(weatherData, key, 0));
    const formatDate = dateHelper(intl.locale).parseAndFormatDate;
    const clockPattern =
      {
        "fi-FI": "'klo' H:mm",
        "en-US": "'at' h:mm a",
      }[intl.locale] || "HH:mm";
    const weekdayTimePattern = `EEEE ${clockPattern}`;
    return (
      <div className="observations">
        <h2 className="location">
          {_.get(weatherData, "location.place", `${place}...`)}
        </h2>
        <Observation
          labelMessageId="weatherObservations.temperature"
          minValue={getNumericValue("temperature.minValue")}
          maxValue={getNumericValue("temperature.maxValue")}
          prefix={getTemperatureChangeIcon(
            _.get(weatherData, "temperature.history")
          )}
          value={_.get(weatherData, "temperature.latest.value")}
          valuePrecision={1}
          unit="°C"
        />
        <Observation
          labelMessageId="weatherObservations.relativeHumidity"
          minValue={getNumericValue("relativeHumidity.minValue")}
          maxValue={getNumericValue("relativeHumidity.maxValue")}
          value={_.get(weatherData, "relativeHumidity.latest.value")}
          valuePrecision={0}
          unit="%"
        />
        <Observation
          labelMessageId="weatherObservations.rainIntensity"
          minValue={getNumericValue("rainIntensity.minValue")}
          maxValue={getNumericValue("rainIntensity.maxValue")}
          value={_.get(weatherData, "rainIntensity.latest.value")}
          valuePrecision={1}
          unit="mm/h"
        />
        <Observation
          labelMessageId="weatherObservations.rainAmountHourly"
          minValue={getNumericValue("rainAmount.minValue")}
          maxValue={getNumericValue("rainAmount.maxValue")}
          value={_.get(weatherData, "rainAmount.latest.value")}
          valuePrecision={1}
          unit="mm"
        />
        <Observation
          labelMessageId="weatherObservations.airPressure"
          minValue={getNumericValue("airPressure.minValue")}
          maxValue={getNumericValue("airPressure.maxValue")}
          prefix={getAirPressureChangeIcon(
            _.get(weatherData, "airPressure.history")
          )}
          value={_.get(weatherData, "airPressure.latest.value")}
          valuePrecision={0}
          unit="hPa"
        />
        <Observation
          labelMessageId="weatherObservations.clouds"
          value={_.get(weatherData, "clouds.latest.value")}
          valuePrecision={0}
          unit="/ 8"
        />
        <Observation
          labelMessageId="weatherObservations.visibility"
          value={_.get(weatherData, "visibility.latest.value") / 1000}
          valuePrecision={2}
          unit="km"
        />

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
