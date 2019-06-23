import React from "react";
import PropTypes from "prop-types";

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
  sensorHeader
}) => (
  <div className="dashboard">
    <div className="dashboard-row header">
      <div className="summary-widget full-width">
        <Clock />
      </div>
    </div>
    <div className="dashboard-row middle">
      <div className="summary-widget main-column">
        <WeatherForecast
          country={weatherLocation.country}
          county={weatherLocation.county}
          city={weatherLocation.city}
        />
      </div>
      <div className="summary-widget sidebar">
        <Sensors header={sensorHeader} />
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
  sensorHeader: PropTypes.string.isRequired,
  weatherLocation: PropTypes.shape({
    country: PropTypes.string,
    county: PropTypes.string,
    city: PropTypes.string
  }).isRequired,
  observationLocation: PropTypes.string.isRequired,
  transportationRegion: PropTypes.string.isRequired,
  transportationDirections: PropTypes.arrayOf(
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
  ).isRequired
};

Dashboard.defaultProps = {};

export default Dashboard;
