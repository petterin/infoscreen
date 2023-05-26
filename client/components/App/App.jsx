import React, { lazy, Suspense, useEffect, useState } from "react";
import axios from "axios";

import IntlWrapper from "./IntlWrapper";

const Dashboard = lazy(() =>
  import(/* webpackChunkName: 'Dashboard' */ "../Dashboard")
);

function AppLoading() {
  return (
    <div className="app-loading">
      <span>Loading Infoscreen...</span>
    </div>
  );
}

function App() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const loadAndSetConfig = async () => {
      try {
        const response = await axios.get(`/api/config`);
        setConfig(response.data);
      } catch (err) {
        console.error("Failed to load app configuration from API", err); // eslint-disable-line no-console
      }
    };
    loadAndSetConfig();
  }, []);

  const loadingScreen = <AppLoading />;

  if (!config) {
    return loadingScreen;
  }

  return (
    <IntlWrapper language={config.general.language} fallback={loadingScreen}>
      <Suspense fallback={loadingScreen}>
        <Dashboard
          sensorHeader={(config.sensors || {}).headerText}
          sensors={(config.sensors || {}).sensors}
          weatherLocation={config.weather.yrForecastLocation}
          observationLocation={config.weather.fmiObservationsLocation}
          transportationApiKey={config.transportation.digitransitKey}
          transportationRegion={config.transportation.digitransitRegion}
          transportationDirections={config.transportation.directions}
        />
      </Suspense>
    </IntlWrapper>
  );
}

App.propTypes = {};

export default App;
