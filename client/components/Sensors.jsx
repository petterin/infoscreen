import React from "react";
import axios from "axios";
import { injectIntl, intlShape, FormattedMessage } from "react-intl";
import _ from "lodash";

import "../styles/WeatherObservations.css";

import { sensorHeaderType, sensorsType } from "../propTypes";
import dateHelper from "../util/dateHelper";

function precisionRound(number, precision) {
  const factor = 10 ** precision;
  return Math.round(number * factor) / factor;
}

class Sensors extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      sensorConf: _.map(props.sensors, (s) => ({
        id: s.id,
        title: s.title,
        decimals: s.decimals,
        unitPostfix: s.unitPostfix,
      })),
      sensorValues: {},
    };
  }

  componentDidMount() {
    // Fetch new data now + every 2 minutes
    this.updateStateFromApi();
    this.fetchInterval = setInterval(() => this.updateStateFromApi(), 120000);
  }

  componentWillUnmount() {
    this.fetchInterval.clearInterval();
  }

  updateStateFromApi() {
    const { sensorConf } = this.state;
    _.forEach(sensorConf, (sensor) =>
      axios
        .get(`/api/sensor/${sensor.id}`)
        .then((response) => {
          this.setState((prevState) =>
            _.set(prevState, ["sensorValues", sensor.id], response.data)
          );
        })
        .catch((err) => {
          console.error(`Sensor data from ${sensor.id} failed to load.`, err); // eslint-disable-line no-console
        })
    );
  }

  render() {
    const { intl, header } = this.props;
    const { sensorConf, sensorValues } = this.state;

    const formatWithOr = (value, formatter, defaultValue) =>
      value ? formatter(value) : defaultValue;
    const clockPatternsByLang = {
      fi: "[klo] H:mm",
      en: "[at] h:mm A",
    };
    const clockPattern = clockPatternsByLang[intl.locale] || "HH:mm";
    const formatTime = (time) =>
      dateHelper(intl.locale).format(time, clockPattern);

    return (
      <div className="observations sensors">
        <h2 className="location">{header}</h2>
        {_.map(sensorConf, (sensor) => (
          <div className="measurement" key={`sensor-${sensor.id}`}>
            <span className="label">{sensor.title}</span>
            <span className="value">
              {formatWithOr(
                _.get(sensorValues, [sensor.id, "value"]),
                (value) =>
                  sensor.decimals != null
                    ? intl.formatNumber(precisionRound(value, sensor.decimals))
                    : value,
                "-"
              )}{" "}
              <span className="unit">{sensor.unitPostfix}</span>
            </span>
          </div>
        ))}
        <div className="footer">
          <div className="updated">
            <FormattedMessage id="sensors.updated" />{" "}
            <b>
              {formatWithOr(
                _.get(sensorValues, [sensorConf[0].id, "timestamp"]),
                formatTime,
                "-"
              )}
            </b>
          </div>
        </div>
      </div>
    );
  }
}

Sensors.propTypes = {
  header: sensorHeaderType.isRequired,
  sensors: sensorsType.isRequired,
  intl: intlShape.isRequired,
};

Sensors.defaultProps = {};

export default injectIntl(Sensors);
