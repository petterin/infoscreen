import React from "react";
import { request, gql } from "graphql-request";
import { injectIntl } from "react-intl";
import _ from "lodash";

import "./Transportation.css";

import Transportation, {
  getTransportationIcon,
} from "./TransportationComponent";
import dateHelperInit from "../../utils/dateHelper";
import { trimStr } from "../../utils/textUtils";
import {
  intlShape,
  transportationApiKeyType,
  transportationDirectionsType,
  transportationRegionType,
} from "../../propTypes";

// Change this function to temporarily test other "current times" for this widget
function getCurrentTime() {
  return new Date();
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
        getCurrentTime(),
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
    // (TODO: Validate if merging routes/stops from multiple alerts is still necessary with the API v2?)
    const mergedAlerts = uniqueActiveAlerts.reduce((merged, alert) => {
      const similarAlert = _.find(
        merged,
        (item) => item.alert.alertHash === alert.alertHash
      );

      const alertRoutes = alert.entities.filter(
        (entity) => entity.__typename === "Route" // eslint-disable-line no-underscore-dangle
      );
      const alertStops = alert.entities.filter(
        (entity) => entity.__typename === "Stop" // eslint-disable-line no-underscore-dangle
      );

      if (similarAlert === undefined) {
        // Add new alert:
        return [
          ...merged,
          {
            alert: _.omit(alert, ["entities"]),
            routes: alertRoutes,
            stops: alertStops,
          },
        ];
      }

      // Update existing alert:

      if (alertRoutes.length > 0) {
        alertRoutes.forEach((route) => {
          const isNewRoute =
            similarAlert.routes.find(
              (similarAlertRoute) => similarAlertRoute.gtfsId === route.gtfsId
            ) === undefined;
          if (isNewRoute) {
            similarAlert.routes.push(route);
          }
        });
      }

      if (alertStops.length > 0) {
        alertStops.forEach((stop) => {
          const isNewStop =
            similarAlert.stops.find(
              (similarAlertStop) => similarAlertStop.gtfsId === stop.gtfsId
            ) === undefined;
          if (isNewStop) {
            similarAlert.stops.push(stop);
          }
        });
      }

      return merged;
    }, []);

    return mergedAlerts;
  }

  generateDigitransitQueryAndVariables() {
    const { directions, intl } = this.props;

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
      language: intl.locale,
    };

    const query = gql`
      query getStops(
        $stopIds: [String]
        $numberOfDepartures: Int
        $startTime: Long
        $language: String
      ) {
        stops(ids: $stopIds) {
          name
          gtfsId
          code
          locationType
          platformCode
          stoptimesWithoutPatterns(
            numberOfDepartures: $numberOfDepartures
            startTime: $startTime
            omitCanceled: false
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
        pickupType
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
        alertHeaderText(language: $language)
        alertDescriptionText(language: $language)
        effectiveStartDate
        effectiveEndDate
        alertSeverityLevel
        alertCause
        alertEffect
        entities {
          __typename
          ... on Route {
            gtfsId
            mode
            shortName
            longName
          }
          ... on Stop {
            gtfsId
            code
            name
            vehicleMode
          }
          ... on Unknown {
            description
          }
        }
      }
    `;
    return [query, queryVariables];
  }

  updateStateFromApi() {
    const { region, digitransitKey } = this.props;
    if (!digitransitKey) {
      this.setState({
        apiError: { message: "No transportation API key set in config file." },
      });
      return;
    }
    const url = `https://api.digitransit.fi/routing/v2/${region}/gtfs/v1`;
    const [document, variables] = this.generateDigitransitQueryAndVariables();
    request({
      url,
      document,
      variables,
      requestHeaders: { "digitransit-subscription-key": digitransitKey },
    })
      .then((data) =>
        this.setState({
          // Invalid or removed stops seem to appear in the result array as nulls
          stopData: data.stops.filter((s) => s !== null),
          apiError: null,
        })
      )
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("Error while requesting transportation data:", err);
        this.setState({ apiError: err });
      });
  }

  renderAlert(alertWithMergedInfo, intl) {
    const { alert, routes, stops } = alertWithMergedInfo;
    const sortedRoutes = routes && _.sortBy(routes, (route) => route.shortName);
    const sortedStops = stops && _.sortBy(stops, (stop) => stop.name);
    const startTime = this.dateHelper.parseEpochSeconds(
      alert.effectiveStartDate
    );
    const endTime = this.dateHelper.parseEpochSeconds(alert.effectiveEndDate);
    const endsOnSameDay = this.dateHelper.isSameDay(endTime, startTime);
    const currentDate = getCurrentTime();
    const startIsNear =
      Math.abs(this.dateHelper.differenceInHours(currentDate, startTime)) <= 36;
    const endIsNear =
      Math.abs(this.dateHelper.differenceInDays(endTime, currentDate)) <= 3;
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
          {intl.formatDate(startTime, {
            weekday: "short",
            day: startIsNear ? undefined : "numeric",
            month: startIsNear ? undefined : "numeric",
            hour: startIsNear ? "numeric" : undefined,
            minute: startIsNear ? "2-digit" : undefined,
          })}
          <span className="separator">&ndash;</span>
          {intl.formatDate(endTime, {
            weekday: endsOnSameDay ? undefined : "short",
            day: endIsNear ? undefined : "numeric",
            month: endIsNear ? undefined : "numeric",
            hour: endIsNear ? "numeric" : undefined,
            minute: endIsNear ? "2-digit" : undefined,
          })}
        </span>
        <span className="description">{alert.alertDescriptionText}</span>
      </div>
    );
  }

  renderApiErrorAlert() {
    const { apiError } = this.state;
    if (!apiError) {
      return null;
    }

    let errorDescription;
    let errorMessage;
    if (apiError.response) {
      errorDescription = "Digitransit API responded";
      errorMessage = trimStr(
        apiError.response.error || apiError.response,
        300,
        "..."
      );
    } else {
      errorDescription = "Could not connect to Digitransit API";
      errorMessage = apiError.message;
    }

    return (
      <div className="alert">
        <span className="line">ERROR</span>
        <span className="time">
          {apiError.response && apiError.response.status}
        </span>
        <span className="description">
          {errorDescription}
          {": "}
          <code>
            &quot;
            {errorMessage}
            &quot;
          </code>
        </span>
      </div>
    );
  }

  render() {
    const { directions, intl } = this.props;
    const { stopData } = this.state;
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
          const directionStopIds = _.map(
            direction.stops,
            _.iteratee("digitransitId")
          );
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
              getCurrentTime()
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
          {this.renderApiErrorAlert()}
          {_.map(this.getAlerts(), (alert) => this.renderAlert(alert, intl))}
        </div>
      </div>
    );
  }
}

TransportationContainer.propTypes = {
  digitransitKey: transportationApiKeyType,
  region: transportationRegionType.isRequired,
  directions: transportationDirectionsType.isRequired,
  intl: intlShape.isRequired,
};

TransportationContainer.defaultProps = {
  digitransitKey: null,
};

export default injectIntl(TransportationContainer);
