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

function getTranslatedText(langCode, translations, defaultText) {
  const translation = _.head(
    _.filter(translations, t => t.language === langCode).map(t => t.text)
  );
  if (translation && translation.length > 0) {
    return translation;
  }
  return defaultText;
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

  getAlerts() {
    const { stopInfo } = this.state;

    // Find all alerts from the fetched routes mapped by alert id (to remove duplicate objects)
    const routeAlertsById = _.reduce(
      getAllStoptimes(stopInfo),
      (alerts, stoptime) => {
        stoptime.trip.route.alerts.forEach(alert => {
          alerts.set(alert.id, alert);
        });
        return alerts;
      },
      new Map()
    );

    // Find all alerts from the fetched stops mapped by alert id
    const stopAlertsById = _.reduce(
      stopInfo,
      (alerts, stop) => {
        stop.alerts.forEach(alert => {
          alerts.set(alert.id, alert);
        });
        return alerts;
      },
      new Map()
    );

    const alertsWithinXHoursFn = hours => alert => {
      const startTime = this.dateHelper.parseEpochSeconds(
        alert.effectiveStartDate
      );
      const wallTimeInXhours = this.dateHelper.addHours(
        this.dateHelper.currentTime(),
        hours
      );
      return startTime <= wallTimeInXhours;
    };

    // Strip alerts not within next 12 hours
    const uniqueActiveAlerts = [
      ...routeAlertsById.values(),
      ...stopAlertsById.values()
    ].filter(alertsWithinXHoursFn(12));

    // Merge alerts with same hash, combine affected routes
    const mergedAlerts = uniqueActiveAlerts.reduce((merged, alert) => {
      const similarAlert = _.find(
        merged,
        item => item.alert.alertHash === alert.alertHash
      );
      if (similarAlert === undefined) {
        return [
          ...merged,
          {
            alert: _.omit(alert, ["route", "stop"]),
            routes: alert.route ? [alert.route] : [],
            stops: alert.stop ? [alert.stop] : []
          }
        ];
      }

      const routeNotPresentInSimilarAlert =
        _.find(
          similarAlert.routes,
          similarAlertRoute => similarAlertRoute.gtfsId === alert.route.gtfsId
        ) === undefined;
      if (alert.route && routeNotPresentInSimilarAlert) {
        similarAlert.routes.push(alert.route);
      }

      const stopNotPresentInSimilarAlert =
        _.find(
          similarAlert.stops,
          similarAlertStop => similarAlertStop.gtfsId === alert.stop.gtfsId
        ) === undefined;
      if (alert.stop && stopNotPresentInSimilarAlert) {
        similarAlert.stops.push(alert.stop);
      }

      return merged;
    }, []);

    return mergedAlerts;
  }

  generateDigitransitRoutingQuery() {
    const { directions } = this.props;

    if (
      !directions ||
      directions.length === 0 ||
      directions.every(d => !d.stops || d.stops.length === 0)
    ) {
      return "{}";
    }

    const stopConfigs = _.flatMap(directions, d =>
      d.stops.map(stop => {
        const fetchAmount = d.show === 0 ? 0 : d.show + 5;
        return { ...stop, fetchAmount };
      })
    );

    const offsetFromCurrentTime = offsetMinutes =>
      this.dateHelper.toEpochSeconds(
        this.dateHelper.addMinutes(getCurrentTime(), offsetMinutes)
      );
    const stopQuerys = _.map(
      stopConfigs,
      (stop, i) => `    stop${i}: stop(id: "${stop.digitransitId}") {
        name
        gtfsId
        code
        stoptimesWithoutPatterns(numberOfDepartures: ${
          stop.fetchAmount
        }, startTime: ${offsetFromCurrentTime(stop.walkInMinutes)}) {
          ...stoptimeFields
        }
        alerts {
          ...alertFields
        }
      }`
    );
    const fragments = `fragment stoptimeFields on Stoptime {
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
          alerts {
            ...alertFields
          }
        }
      }
    }
    fragment alertFields on Alert {
      id
      alertHash
      route {
        gtfsId
        mode
        shortName
        longName
      }
      stop {
        gtfsId
        code
        name
        vehicleMode
      }    
      alertHeaderText
      alertHeaderTextTranslations {
        text
        language
      }
      alertDescriptionText
      alertDescriptionTextTranslations {
        text
        language
      }
      effectiveStartDate
      effectiveEndDate
      alertSeverityLevel
      alertCause
      alertEffect
    }`;
    return `{\n${stopQuerys.join("\n")}\n}\n${fragments}`;
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

  renderAlert(alertWithMergedInfo, intl) {
    const { alert, routes, stops } = alertWithMergedInfo;
    const sortedRoutes = routes && _.sortBy(routes, route => route.shortName);
    const sortedStops = stops && _.sortBy(stops, stop => stop.name);
    const startTime = this.dateHelper.parseEpochSeconds(
      alert.effectiveStartDate
    );
    const endTime = this.dateHelper.parseEpochSeconds(alert.effectiveEndDate);
    const showBothDates = !this.dateHelper.isSameDay(endTime, startTime);
    return (
      <div className="alert" key={alert.id}>
        {sortedRoutes.map(route => (
          <span className="line" key={route.gtfsId}>
            {getTransportationIcon(route.mode)}
            {route.shortName}
          </span>
        ))}
        {sortedStops.map(stop => (
          <span className="line" key={stop.gtfsId}>
            {/* stop.vehicleMode && getTransportationIcon(stop.vehicleMode) */}
            {stop.name}
          </span>
        ))}
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
        <span className="description">
          {getTranslatedText(
            intl.locale,
            alert.alertDescriptionTextTranslations,
            alert.alertDescriptionText
          )}
        </span>
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
            fetchedStop => fetchedStop && stopIds.includes(fetchedStop.gtfsId)
          );
          if (direction.show === 0) {
            return null;
          }
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
