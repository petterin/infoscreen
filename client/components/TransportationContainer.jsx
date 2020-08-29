import React from "react";
import { request, gql } from "graphql-request";
import { injectIntl } from "react-intl";
import _ from "lodash";

import "../styles/Transportation.css";

import Transportation, {
  getTransportationIcon,
} from "./TransportationComponent";
import dateHelperInit from "../util/dateHelper";
import {
  intlShape,
  transportationRegionType,
  transportationDirectionsType,
} from "../propTypes";

// Change this function to temporarily test other "current times" for this widget
function getCurrentTime() {
  return new Date();
}

function getTranslatedText(langCode, translations, defaultText) {
  const translation = _.head(
    _.filter(translations, (t) => t.language === langCode).map((t) => t.text)
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
    this.state = { stopData: null, apiError: null };
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

  getAllStoptimes(stops) {
    const { directions } = this.props;
    const stopConfigs = directions.flatMap((d) => d.stops);
    const timesFromAllStops = _.flatMap(stops, (stop) => {
      const stopConfig = stopConfigs.find(
        (s) => s.digitransitId === stop.gtfsId
      );
      const stoptimes = _.get(stop, "stoptimesWithoutPatterns", []);
      if (Array.isArray(stopConfig.includeOnlyLines)) {
        return stoptimes.filter((stoptime) =>
          stopConfig.includeOnlyLines.includes(stoptime.trip.route.shortName)
        );
      }
      if (Array.isArray(stopConfig.excludeLines)) {
        return stoptimes.filter(
          (stoptime) =>
            !stopConfig.excludeLines.includes(stoptime.trip.route.shortName)
        );
      }
      return stoptimes;
    });
    return _.sortBy(timesFromAllStops, ["serviceDay", "realtimeDeparture"]);
  }

  getAlerts() {
    const { stopData } = this.state;

    // Find all alerts from the fetched routes mapped by alert id (to remove duplicate objects)
    const routeAlertsById = _.reduce(
      this.getAllStoptimes(stopData),
      (alerts, stoptime) => {
        stoptime.trip.route.alerts.forEach((alert) => {
          alerts.set(alert.id, alert);
        });
        return alerts;
      },
      new Map()
    );

    // Find all alerts from the fetched stops mapped by alert id
    const stopAlertsById = _.reduce(
      stopData,
      (alerts, stop) => {
        stop.alerts.forEach((alert) => {
          alerts.set(alert.id, alert);
        });
        return alerts;
      },
      new Map()
    );

    const alertsWithinXHoursFn = (hours) => (alert) => {
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
      ...stopAlertsById.values(),
    ].filter(alertsWithinXHoursFn(12));

    // Merge alerts with same hash, combine affected routes
    const mergedAlerts = uniqueActiveAlerts.reduce((merged, alert) => {
      const similarAlert = _.find(
        merged,
        (item) => item.alert.alertHash === alert.alertHash
      );
      if (similarAlert === undefined) {
        return [
          ...merged,
          {
            alert: _.omit(alert, ["route", "stop"]),
            routes: alert.route ? [alert.route] : [],
            stops: alert.stop ? [alert.stop] : [],
          },
        ];
      }

      const routeNotPresentInSimilarAlert =
        _.find(
          similarAlert.routes,
          (similarAlertRoute) => similarAlertRoute.gtfsId === alert.route.gtfsId
        ) === undefined;
      if (alert.route && routeNotPresentInSimilarAlert) {
        similarAlert.routes.push(alert.route);
      }

      const stopNotPresentInSimilarAlert =
        _.find(
          similarAlert.stops,
          (similarAlertStop) => similarAlertStop.gtfsId === alert.stop.gtfsId
        ) === undefined;
      if (alert.stop && stopNotPresentInSimilarAlert) {
        similarAlert.stops.push(alert.stop);
      }

      return merged;
    }, []);

    return mergedAlerts;
  }

  generateDigitransitQueryAndVariables() {
    const { directions } = this.props;

    if (
      !directions ||
      directions.length === 0 ||
      directions.every((d) => !d.stops || d.stops.length === 0 || d.show === 0)
    ) {
      return gql`{}`;
    }

    const stopConfigs = _.flatMap(directions, (d) => d.stops);

    const offsetFromCurrentTime = (offsetMinutes) =>
      this.dateHelper.toEpochSeconds(
        this.dateHelper.addMinutes(getCurrentTime(), offsetMinutes)
      );

    const maxShowAmount = (directions || [])
      .map((d) => d.show || 0)
      .reduce((acc, value) => Math.max(acc, value), 0);

    const minWalkInMinutes = (stopConfigs || [])
      .map((stop) => stop.walkInMinutes || 0)
      // using 60min as an arbitary high initial value
      .reduce((acc, value) => Math.min(acc, value), 60);

    const queryVariables = {
      stopIds: (stopConfigs || []).map((stop) => stop.digitransitId),
      startTime: offsetFromCurrentTime(minWalkInMinutes),
      numberOfDepartures: maxShowAmount === 0 ? 0 : maxShowAmount + 5,
    };

    const query = gql`
      query getStops(
        $stopIds: [String]
        $numberOfDepartures: Int
        $startTime: Long
      ) {
        stops(ids: $stopIds) {
          name
          gtfsId
          code
          stoptimesWithoutPatterns(
            numberOfDepartures: $numberOfDepartures
            startTime: $startTime
          ) {
            ...stoptimeFields
          }
          alerts {
            ...alertFields
          }
        }
      }
      fragment stoptimeFields on Stoptime {
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
      }
    `;
    return [query, queryVariables];
  }

  updateStateFromApi() {
    const { region } = this.props;
    const endpoint = `https://api.digitransit.fi/routing/v1/routers/${region}/index/graphql`;
    const [query, variables] = this.generateDigitransitQueryAndVariables();
    request(endpoint, query, variables)
      .then((data) => this.setState({ stopData: data.stops, apiError: null }))
      .catch((err) => this.setState({ apiError: err }));
  }

  renderAlert(alertWithMergedInfo, intl) {
    const { alert, routes, stops } = alertWithMergedInfo;
    const sortedRoutes = routes && _.sortBy(routes, (route) => route.shortName);
    const sortedStops = stops && _.sortBy(stops, (stop) => stop.name);
    const startTime = this.dateHelper.parseEpochSeconds(
      alert.effectiveStartDate
    );
    const endTime = this.dateHelper.parseEpochSeconds(alert.effectiveEndDate);
    const showBothDates = !this.dateHelper.isSameDay(endTime, startTime);
    return (
      <div className="alert" key={alert.id}>
        {sortedRoutes.map((route) => (
          <span className="line" key={route.gtfsId}>
            {getTransportationIcon(route.mode)}
            {route.shortName}
          </span>
        ))}
        {sortedStops.map((stop) => (
          <span className="line" key={stop.gtfsId}>
            {/* stop.vehicleMode && getTransportationIcon(stop.vehicleMode) */}
            {stop.name}
          </span>
        ))}
        <span className="time">
          {intl.formatTime(startTime, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
          <span className="separator">&ndash;</span>
          {intl.formatTime(endTime, {
            weekday: showBothDates ? "short" : undefined,
            hour: "numeric",
            minute: "2-digit",
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
    const { stopData, apiError } = this.state;
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
          if (
            direction.show === 0 ||
            !direction.stops ||
            direction.stops.length === 0
          ) {
            return null;
          }
          const directionStopIds = _.map(direction.stops, "digitransitId");
          const directionStopData = _.filter(
            stopData,
            (stop) => stop && directionStopIds.includes(stop.gtfsId)
          );
          const directionMinWalkInMinutes = direction.stops
            .map((stop) => stop.walkInMinutes || 0)
            .reduce((acc, value) => Math.min(acc, value), 60); // arbitary 60min init value
          const filteredDirectionStoptimes = this.getAllStoptimes(
            directionStopData
          ).filter((stoptime) => {
            const departure = this.dateHelper.parseEpochSeconds(
              stoptime.serviceDay + stoptime.realtimeDeparture
            );
            const minutesToDeparture = this.dateHelper.differenceInMinutes(
              departure,
              this.dateHelper.currentTime()
            );
            // TODO: Use each stop's own walk time
            return minutesToDeparture >= directionMinWalkInMinutes;
          });
          return (
            <Transportation
              stopName={direction.name}
              maxConnections={direction.show}
              stoptimes={filteredDirectionStoptimes}
              key={`direction-${i}`}
            />
          );
        })}
        <div className="alerts">
          {apiErrorAlert}
          {_.map(this.getAlerts(), (alert) => this.renderAlert(alert, intl))}
        </div>
      </div>
    );
  }
}

TransportationContainer.propTypes = {
  region: transportationRegionType.isRequired,
  directions: transportationDirectionsType.isRequired,
  intl: intlShape.isRequired,
};

TransportationContainer.defaultProps = {};

export default injectIntl(TransportationContainer);
