import React from "react";
import axios from "axios";
import { injectIntl, FormattedMessage } from "react-intl";
import _ from "lodash";

import "../WeatherObservations/WeatherObservations.css";

import { intlShape, sensorHeaderType, sensorsType } from "../../propTypes";
import dateHelper from "../../utils/dateHelper";
import Observation from "../common/Observation";

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
    clearInterval(this.fetchInterval);
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
      "fi-FI": "'klo' H:mm",
      "en-US": "'at' h:mm a",
    };
    const clockPattern = clockPatternsByLang[intl.locale] || "HH:mm";
    const parseAndFormatTime = (isoDateStr) =>
      dateHelper(intl.locale).parseAndFormatDate(isoDateStr, clockPattern);

    return (
      <div className="observations sensors">
        <h2 className="location">{header}</h2>
        {_.map(sensorConf, (sensor) => (
          <Observation
            key={`sensor-${sensor.id}`}
            label={sensor.title}
            value={_.get(sensorValues, [sensor.id, "value"])}
            valuePrecision={sensor.decimals}
            valueFallback="-"
            unit={sensor.unitPostfix}
          />
        ))}
        <div className="footer">
          <div className="updated">
            {sensorConf && sensorConf.length > 0 ? (
              <>
                <FormattedMessage id="sensors.updated" />{" "}
                <b>
                  {formatWithOr(
                    _.get(sensorValues, [sensorConf[0].id, "timestamp"]),
                    parseAndFormatTime,
                    "-"
                  )}
                </b>
              </>
            ) : null}
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
