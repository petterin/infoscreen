import React from "react";
import PropTypes from "prop-types";
import { request } from "graphql-request";
import { injectIntl, intlShape } from "react-intl";
import _ from "lodash";

import "../styles/Transportation.css";

import Transportation, {
  getTransportationIcon
} from "./TransportationComponent";
import dateHelperInit from "../util/dateHelper";

// Change this function to temporarily test other "current times" for this widget
function getCurrentTime() {
  return new Date();
}

function getAllStoptimes(stops) {
  const timesFromAllStops = _.flatMap(stops, stop =>
    _.get(stop, "stoptimesWithoutPatterns", null)
  ).filter(stoptimes => stoptimes !== null);
  return _.sortBy(timesFromAllStops, ["serviceDay", "realtimeDeparture"]);
}

class TransportationContainer extends React.Component {
  constructor(props) {
    super(props);
    const { intl } = this.props;
    this.dateHelper = dateHelperInit(intl.locale);
    this.state = { stopInfo: null, apiError: null };
  }

  componentDidMount() {
    // Fetch new data now + every 2 minutes
    this.updateStateFromApi();
    this.fetchInterval = setInterval(() => this.updateStateFromApi(), 120000);

    // TODO: Heuristic logic to fetch new data depending how far the next connection is,
    // e.g. next one is a realtime connection = 60sec interval,
    // next connection >15 min -> 2-5 min interval
  }

  componentWillUnmount() {
    clearInterval(this.fetchInterval);
  }

  getAllStops() {
    const { directions } = this.props;
    return _.flatMap(directions, direction => direction.stops);
  }

  getAlerts() {
    const { stopInfo } = this.state;
    const alerts = new Map();
    // Find all alerts the fetched routes mapped by alert id (to remove duplicate alerts)
    getAllStoptimes(stopInfo).forEach(stoptime => {
      stoptime.trip.route.alerts.forEach(alert => {
        alerts.set(alert.id, alert);
      });
    }, []);
    return [...alerts.values()];
  }

  generateDigitransitRoutingQuery() {
    const stops = this.getAllStops();
    if (!stops || stops.length === 0) {
      return "{}";
    }
    const offsetFromCurrentTime = offsetMinutes =>
      this.dateHelper.toEpochSeconds(
        this.dateHelper.addMinutes(getCurrentTime(), offsetMinutes)
      );
    const stopQuerys = _.map(
      stops,
      (stop, i) => `    stop${i}: stop(id: "${stop.digitransitId}") {
        name
        gtfsId
        code
        stoptimesWithoutPatterns(numberOfDepartures: 10, startTime: ${offsetFromCurrentTime(
          stop.walkInMinutes
        )}) {
          ...stoptimeFields
        }
      }`
    );
    const fragment = `fragment stoptimeFields on Stoptime {
      scheduledDeparture
      realtimeDeparture
      departureDelay
      timepoint
      realtime
      realtimeState
      serviceDay
      headsign
      trip {
        gtfsId
        tripHeadsign
        route {
          gtfsId
          mode
          shortName
          longName
          url
          alerts {
            id
            route {
              mode
              shortName
              longName
            }
            alertHeaderText
            alertDescriptionText
            effectiveStartDate
            effectiveEndDate
          }
        }
        pattern {
          code
          name
          headsign
        }
      }
    }`;
    return `{\n${stopQuerys.join("\n")}\n}\n${fragment}`;
  }

  updateStateFromApi() {
    const { region } = this.props;
    request(
      `https://api.digitransit.fi/routing/v1/routers/${region}/index/graphql`,
      this.generateDigitransitRoutingQuery()
    )
      .then(data => this.setState({ stopInfo: data, apiError: null }))
      .catch(err => this.setState({ apiError: err }));
  }

  renderAlert(alert, intl) {
    const startTime = this.dateHelper.parseEpochSeconds(
      alert.effectiveStartDate
    );
    const endTime = this.dateHelper.parseEpochSeconds(alert.effectiveEndDate);
    const showBothDates = !this.dateHelper.isSameDay(endTime, startTime);
    return (
      <div className="alert" key={alert.id}>
        <span className="line">
          {getTransportationIcon(alert.route.mode)}
          {alert.route.shortName}
        </span>
        <span className="time">
          {intl.formatTime(startTime, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit"
          })}
          <span className="separator">&ndash;</span>
          {intl.formatTime(endTime, {
            weekday: showBothDates ? "short" : undefined,
            hour: "numeric",
            minute: "2-digit"
          })}
        </span>
        <span className="description">{alert.alertDescriptionText}</span>
      </div>
    );
  }

  render() {
    const { directions, intl } = this.props;
    const { stopInfo, apiError } = this.state;
    const apiErrorAlert = !apiError ? null : (
      <div className="alert">
        <span className="line">ERROR</span>
        <span className="time">{apiError.response.status}</span>
        <span className="description">
          Digitransit API responded:{" "}
          <code>
            &quot;
            {apiError.response.error}
            &quot;
          </code>
        </span>
      </div>
    );
    return (
      <div className="transportation-container">
        {_.map(directions, (direction, i) => {
          const stopIds = _.map(direction.stops, "digitransitId");
          const stopsInDirection = _.filter(
            stopInfo,
            stop => stop && stopIds.includes(stop.gtfsId)
          );
          return (
            <Transportation
              stopName={direction.name}
              maxConnections={direction.show}
              stoptimes={getAllStoptimes(stopsInDirection)}
              key={`direction-${i}`}
            />
          );
        })}
        <div className="alerts">
          {apiErrorAlert}
          {_.map(this.getAlerts(), alert => this.renderAlert(alert, intl))}
        </div>
      </div>
    );
  }
}

TransportationContainer.propTypes = {
  region: PropTypes.string.isRequired,
  directions: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      show: PropTypes.number,
      stops: PropTypes.arrayOf(
        PropTypes.shape({
          digitransitId: PropTypes.string,
          walkInMinutes: PropTypes.number
        })
      )
    })
  ).isRequired,
  intl: intlShape.isRequired
};

TransportationContainer.defaultProps = {};

export default injectIntl(TransportationContainer);
