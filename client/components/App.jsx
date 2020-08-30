import React, { lazy, Suspense, useEffect, useState } from "react";
import { IntlProvider } from "react-intl";
import axios from "axios";

const Dashboard = lazy(() =>
  import(/* webpackChunkName: 'Dashboard' */ "./Dashboard")
);

const AppLoading = () => (
  <div className="app-loading">
    <span>Loading Infoscreen...</span>
  </div>
);

const App = () => {
  const [messages, setMessages] = useState(null);
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

  useEffect(() => {
    const loadAndSetMessages = async (langCode) => {
      if (langCode === "fi") {
        const module = await import(
          /* webpackChunkName: 'messages_fi-FI' */ "../messages/fi-FI"
        );
        setMessages(module.default);
      } else {
        const module = await import(
          /* webpackChunkName: 'messages_en-US' */ "../messages/en-US"
        );
        setMessages(module.default);
      }
    };
    if (config) {
      loadAndSetMessages(config.general.language);
    }
  }, [config]);

  if (!messages || !config) {
    return <AppLoading />;
  }

  // "locale" is used for both 'react-intl' and 'date-fns'
  return (
    <IntlProvider locale={config.general.locale} messages={messages}>
      <Suspense fallback={<AppLoading />}>
        <Dashboard
          sensorHeader={config.sensors.headerText}
          sensors={config.sensors.sensors}
          weatherLocation={config.weather.yrForecastLocation}
          observationLocation={config.weather.fmiObservationsLocation}
          transportationRegion={config.transportation.digitransitRegion}
          transportationDirections={config.transportation.directions}
        />
      </Suspense>
    </IntlProvider>
  );
};

App.propTypes = {};

export default App;
