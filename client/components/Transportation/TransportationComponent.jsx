import React from "react";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import _ from "lodash";

import { intlShape } from "../../propTypes";
import dateHelperInit from "../../utils/dateHelper";

// Change this function to temporarily test other "current times" for this widget
function getCurrentTime() {
  return new Date();
}

function getStoptimeIcon(realtimeState, realtime) {
  if (realtimeState === "CANCELED") {
    return <FontAwesomeIcon icon="ban" />;
  }
  if (realtimeState === "ADDED") {
    return <FontAwesomeIcon icon="plus-circle" />;
  }
  if (realtime) {
    return <FontAwesomeIcon icon="location-arrow" />;
  }
  // if (realtimeState === "SCHEDULED") {
  //   return <FontAwesomeIcon icon="calendar-o" />;
  // }
  return null;
}

export function getTransportationIcon(mode) {
  switch (mode) {
    case "BUS":
      return <FontAwesomeIcon icon="bus" />;
    case "TRAM":
      return <FontAwesomeIcon icon="train" />;
    case "RAIL":
      return <FontAwesomeIcon icon="train" />;
    case "SUBWAY":
      return <FontAwesomeIcon icon="subway" />;
    default:
      return <FontAwesomeIcon icon="car" />;
  }
}

const TransportationConnection = ({
  scheduledDeparture,
  realtimeDeparture,
  realtime,
  realtimeState,
  transportationMode,
  lineName,
  lineHeadsign,
  intl,
}) => {
  const dateHelpers = dateHelperInit(intl.locale);

  const TOO_MANY_HOURS = 2;
  const hoursUntil = dateHelpers.differenceInHours(
    realtimeDeparture,
    getCurrentTime()
  );
  let modeClass = "";
  if (hoursUntil < TOO_MANY_HOURS) {
    modeClass = ` hsl-${transportationMode}`;
  }

  const departureDelay = dateHelpers.differenceInSeconds(
    realtimeDeparture,
    scheduledDeparture
  );
  const departureDelayText =
    Math.abs(departureDelay) < 40
      ? ""
      : `${departureDelay > 0 ? "+" : ""}${Math.floor(departureDelay / 60.0)}`;

  const minutesUntil = dateHelpers.differenceInMinutes(
    realtimeDeparture,
    getCurrentTime()
  );
  const useMinutes = minutesUntil <= 15 && minutesUntil >= 0;
  const formattedStoptime = useMinutes
    ? `${minutesUntil} min`
    : intl.formatTime(realtimeDeparture);

  return (
    <div className={`stoptime${modeClass}`}>
      <span className="line">
        {/* <span className="line-icon">{getTransportationIcon(transportationMode)}</span> */}
        <span className="line-name">{lineName}</span>
      </span>
      <span className="destination">{lineHeadsign}</span>
      <span
        className="departureTime"
        title={
          realtime
            ? intl.formatMessage(
                {
                  id: "transportation.updatedDepartureTime",
                },
                {
                  originalTime: intl.formatTime(scheduledDeparture),
                  newTime: intl.formatTime(realtimeDeparture, {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                  }),
                }
              )
            : intl.formatMessage(
                {
                  id: "transportation.scheduledDepartureTime",
                },
                {
                  originalTime: intl.formatTime(scheduledDeparture),
                }
              )
        }
      >
        <span className={useMinutes ? "time shortly" : "time"}>
          {formattedStoptime}
        </span>
        <span className="departure-delay">{departureDelayText}</span>
        <span className="status">
          {getStoptimeIcon(realtimeState, realtime)}
        </span>
      </span>
    </div>
  );
};

TransportationConnection.propTypes = {
  intl: intlShape.isRequired,
  lineName: PropTypes.string.isRequired,
  lineHeadsign: PropTypes.string.isRequired,
  transportationMode: PropTypes.string.isRequired,
  scheduledDeparture: PropTypes.instanceOf(Date).isRequired,
  realtimeDeparture: PropTypes.instanceOf(Date).isRequired,
  realtimeState: PropTypes.string.isRequired,
  realtime: PropTypes.bool.isRequired,
};

class Transportation extends React.Component {
  constructor(props) {
    super(props);
    const { intl } = this.props;
    this.dateHelper = dateHelperInit(intl.locale);
  }

  componentDidMount() {
    // Update rendered stoptimes every 30 seconds
    this.renderInterval = setInterval(() => this.forceUpdate(), 30000);
  }

  componentWillUnmount() {
    clearInterval(this.renderInterval);
  }

  render() {
    const { stopName, stoptimes, maxConnections, intl } = this.props;
    // Remove duplicate times if the direction contains multiple stops where a single trip goes
    const uniqueTripStoptimes = _.uniqBy(stoptimes, (s) => s.trip.gtfsId);
    const stoptimesToShow = _.slice(uniqueTripStoptimes, 0, maxConnections);
    const asDate = (dayStartSeconds, timeOfDaySeconds) =>
      this.dateHelper.parseEpochSeconds(dayStartSeconds + timeOfDaySeconds);
    return (
      <div className="transportation">
        <div className="stopname">{stopName}</div>
        <div className="stoptimes">
          {_.map(stoptimesToShow, (stoptime) => (
            <TransportationConnection
              key={stoptime.trip.gtfsId}
              intl={intl}
              lineName={stoptime.trip.route.shortName}
              lineHeadsign={stoptime.trip.tripHeadsign}
              transportationMode={stoptime.trip.route.mode}
              scheduledDeparture={asDate(
                stoptime.serviceDay,
                stoptime.scheduledDeparture
              )}
              realtimeDeparture={asDate(
                stoptime.serviceDay,
                stoptime.realtimeDeparture
              )}
              realtimeState={stoptime.realtimeState}
              realtime={stoptime.realtime}
            />
          ))}
        </div>
      </div>
    );
  }
}

Transportation.propTypes = {
  stopName: PropTypes.string.isRequired,
  maxConnections: PropTypes.number,
  stoptimes: PropTypes.arrayOf(PropTypes.object).isRequired,
  intl: intlShape.isRequired,
};

Transportation.defaultProps = {
  maxConnections: 3,
};

export default injectIntl(Transportation);
