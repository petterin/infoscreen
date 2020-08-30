import React from "react";
import ReactDOM from "react-dom";
import { IntlProvider } from "react-intl";
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
import Config from "infoscreen-config"; // eslint-disable-line import/no-unresolved
// Polyfill for async-await
import "regenerator-runtime/runtime";

import "normalize.css/normalize.css";
import "./styles/main.css";

import { enMessages, fiMessages } from "./messages";
import Dashboard from "./components/Dashboard";

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

// "locale" is used for both 'date-fns' and 'react-intl'
const { language, locale } = Config.general;

let messages;
if (language === "fi") {
  messages = fiMessages;
} else {
  messages = enMessages;
}

ReactDOM.render(
  <IntlProvider locale={locale} messages={messages}>
    <Dashboard
      sensorHeader={Config.sensors.headerText}
      sensors={Config.sensors.sensors}
      weatherLocation={Config.weather.yrForecastLocation}
      observationLocation={Config.weather.fmiObservationsLocation}
      transportationRegion={Config.transportation.digitransitRegion}
      transportationDirections={Config.transportation.directions}
    />
  </IntlProvider>,
  document.getElementById("app")
);
