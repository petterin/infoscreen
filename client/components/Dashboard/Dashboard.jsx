import React from "react";
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faBan,
  faPlusCircle,
  faLocationArrow,
  faCalendar,
  faBus,
  faTrain,
  faSubway,
  faCar,
  faArrowUp,
  faArrowDown,
  faAngleUp,
  faAngleDown,
} from "@fortawesome/free-solid-svg-icons";

import "./Dashboard.css";

import * as TYPES from "../../propTypes";
import ErrorBoundary from "../ErrorBoundary";
import Clock from "../Clock";
import Sensors from "../Sensors";
import Transportation from "../Transportation";
import WeatherForecast from "../WeatherForecast";
import WeatherObservations from "../WeatherObservations";

// Initialize custom Font Awesome 5 icon library
library.add(
  faBan,
  faPlusCircle,
  faLocationArrow,
  faCalendar,
  faBus,
  faTrain,
  faSubway,
  faCar,
  faArrowUp,
  faArrowDown,
  faAngleUp,
  faAngleDown
);

const Dashboard = ({
  transportationRegion,
  transportationDirections,
  weatherLocation,
  observationLocation,
  sensorHeader,
  sensors,
}) => (
  <div className="dashboard">
    <div className="dashboard-row header">
      <div className="summary-widget full-width">
        <ErrorBoundary name="Clock">
          <Clock location={weatherLocation} />
        </ErrorBoundary>
      </div>
    </div>
    <div className="dashboard-row middle">
      <div className="summary-widget main-column">
        <ErrorBoundary name="Weather Forecast">
          <WeatherForecast location={weatherLocation} />
        </ErrorBoundary>
      </div>
      <div className="summary-widget sidebar">
        <ErrorBoundary name="Sensors">
          <Sensors header={sensorHeader} sensors={sensors} />
        </ErrorBoundary>
      </div>
    </div>
    <div className="dashboard-row main">
      <div className="summary-widget main-column">
        <ErrorBoundary name="Transportation">
          <Transportation
            region={transportationRegion}
            directions={transportationDirections}
          />
        </ErrorBoundary>
      </div>
      <div className="summary-widget sidebar">
        <ErrorBoundary name="Weather Observations">
          <WeatherObservations place={observationLocation} />
        </ErrorBoundary>
      </div>
    </div>
  </div>
);

Dashboard.propTypes = {
  sensorHeader: TYPES.sensorHeaderType.isRequired,
  sensors: TYPES.sensorsType.isRequired,
  weatherLocation: TYPES.weatherLocationType.isRequired,
  observationLocation: TYPES.observationLocationType.isRequired,
  transportationRegion: TYPES.transportationRegionType.isRequired,
  transportationDirections: TYPES.transportationDirectionsType.isRequired,
};

Dashboard.defaultProps = {};

export default Dashboard;
