import React from "react";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBan,
  faBus,
  faCar,
  faExclamationTriangle,
  faHourglassHalf,
  faLocationArrow,
  faMapMarked,
  faPlusCircle,
  faSubway,
  faTrain,
} from "@fortawesome/free-solid-svg-icons";
import _ from "lodash";

import { intlShape } from "../../propTypes";
import dateHelperInit from "../../utils/dateHelper";

// Change this function to temporarily test other "current times" for this widget
function getCurrentTime() {
  return new Date();
}

function getStoptimeIcons(realtimeState, realtime, alertEffects) {
  let realtimeIcon = null;
  if (realtimeState === "CANCELED") {
    realtimeIcon = <FontAwesomeIcon icon={faBan} />;
  } else if (realtimeState === "ADDED") {
    realtimeIcon = <FontAwesomeIcon icon={faPlusCircle} />;
  } else if (realtime) {
    realtimeIcon = <FontAwesomeIcon icon={faLocationArrow} />;
  }
  // else if (realtimeState === "SCHEDULED") {
  //   realtimeIcon = <FontAwesomeIcon icon={faCalendar} />;
  // }

  const alertIcons = alertEffects.map((effect) => {
    switch (effect) {
      case "DETOUR":
        return <FontAwesomeIcon icon={faMapMarked} key={effect} />;
      case "SIGNIFICANT_DELAYS":
        return <FontAwesomeIcon icon={faHourglassHalf} key={effect} />;
      default:
        return <FontAwesomeIcon icon={faExclamationTriangle} key="default" />;
    }
  });

  return (
    <>
      {alertIcons} {realtimeIcon}
    </>
  );
}

export function getTransportationIcon(mode) {
  switch (mode) {
    case "BUS":
      return <FontAwesomeIcon icon={faBus} />;
    case "TRAM":
      return <FontAwesomeIcon icon={faTrain} />;
    case "RAIL":
      return <FontAwesomeIcon icon={faTrain} />;
    case "SUBWAY":
      return <FontAwesomeIcon icon={faSubway} />;
    default:
      return <FontAwesomeIcon icon={faCar} />;
  }
}

function TransportationConnection({
  scheduledDeparture,
  realtimeDeparture,
  realtime,
  realtimeState,
  transportationMode,
  lineName,
  lineHeadsign,
  alerts,
  intl,
}) {
  const dateHelpers = dateHelperInit(intl.locale);

  const TOO_MANY_HOURS = 2;
  const hoursUntil = dateHelpers.differenceInHours(
    realtimeDeparture,
    getCurrentTime()
  );

  let stoptimeClassNames = `stoptime hsl-${transportationMode}`;
  if (hoursUntil >= TOO_MANY_HOURS) stoptimeClassNames += " later";
  if (realtimeState === "CANCELED") stoptimeClassNames += " canceled";

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

  const alertEffects = (alerts || [])
    .filter((alert) => {
      if (alert.alertSeverityLevel === "INFO") return false;
      const alertStart = dateHelpers.parseEpochSeconds(
        alert.effectiveStartDate
      );
      const alertEnd = dateHelpers.parseEpochSeconds(alert.effectiveEndDate);
      return alertStart < realtimeDeparture && alertEnd > realtimeDeparture;
    })
    .map((alert) => alert.alertEffect);

  const getDepartureTimeMessage = () => {
    if (realtime) {
      return intl.formatMessage(
        { id: "transportation.updatedDepartureTime" },
        {
          originalTime: intl.formatTime(scheduledDeparture),
          newTime: intl.formatTime(realtimeDeparture, {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
          }),
        }
      );
    }
    if (realtimeState === "SCHEDULED") {
      return intl.formatMessage(
        { id: "transportation.scheduledDepartureTime" },
        { originalTime: intl.formatTime(scheduledDeparture) }
      );
    }
    return intl.formatMessage(
      { id: "transportation.departureTimeStatus" },
      {
        originalTime: intl.formatTime(scheduledDeparture),
        status: realtimeState,
      }
    );
  };

  return (
    <div className={stoptimeClassNames}>
      <span className="line">
        {/* <span className="line-icon">{getTransportationIcon(transportationMode)}</span> */}
        <span className="line-name">{lineName}</span>
      </span>
      <span className="destination">{lineHeadsign}</span>
      <span className="departureTime" title={getDepartureTimeMessage()}>
        <span className={useMinutes ? "time shortly" : "time"}>
          {formattedStoptime}
        </span>
        <span className="departure-delay">{departureDelayText}</span>
        <span className="status">
          {getStoptimeIcons(realtimeState, realtime, alertEffects)}
        </span>
      </span>
    </div>
  );
}

TransportationConnection.propTypes = {
  intl: intlShape.isRequired,
  lineName: PropTypes.string.isRequired,
  lineHeadsign: PropTypes.string.isRequired,
  transportationMode: PropTypes.string.isRequired,
  scheduledDeparture: PropTypes.instanceOf(Date).isRequired,
  realtimeDeparture: PropTypes.instanceOf(Date).isRequired,
  realtimeState: PropTypes.string.isRequired,
  realtime: PropTypes.bool.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  alerts: PropTypes.arrayOf(PropTypes.object).isRequired,
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
    const stoptimesToShow = _.flow([
      // Remove duplicate times if the direction contains multiple stops where a single trip goes
      (result) => _.uniqBy(result, (s) => s.trip.gtfsId),
      // Remove stoptimes that don't pick up passengers (e.g. arrivals to terminal stop)
      (result) => _.filter(result, (s) => s.pickupType !== "NONE"),
      (result) => _.slice(result, 0, maxConnections),
    ])(stoptimes);
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
              alerts={stoptime.trip.route.alerts}
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
  // eslint-disable-next-line react/forbid-prop-types
  stoptimes: PropTypes.arrayOf(PropTypes.object).isRequired,
  intl: intlShape.isRequired,
};

Transportation.defaultProps = {
  maxConnections: 3,
};

export default injectIntl(Transportation);
