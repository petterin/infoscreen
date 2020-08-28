import React from "react";

import * as TYPES from "../propTypes";
import Clock from "./Clock";
import Sensors from "./Sensors";
import TransportationContainer from "./TransportationContainer";
import WeatherForecast from "./WeatherForecast";
import WeatherObservations from "./WeatherObservations";

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
