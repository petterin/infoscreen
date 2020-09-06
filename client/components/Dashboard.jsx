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

import * as TYPES from "../propTypes";
import Clock from "./Clock";
import Sensors from "./Sensors";
import TransportationContainer from "./TransportationContainer";
import WeatherForecast from "./WeatherForecast";
import WeatherObservations from "./WeatherObservations";

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
        <Clock />
      </div>
    </div>
    <div className="dashboard-row middle">
      <div className="summary-widget main-column">
        <WeatherForecast location={weatherLocation} />
      </div>
      <div className="summary-widget sidebar">
        <Sensors header={sensorHeader} sensors={sensors} />
      </div>
    </div>
    <div className="dashboard-row main">
      <div className="summary-widget main-column">
        <TransportationContainer
          region={transportationRegion}
          directions={transportationDirections}
        />
      </div>
      <div className="summary-widget sidebar">
        <WeatherObservations place={observationLocation} />
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
