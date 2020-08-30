import React from "react";
import ReactDOM from "react-dom";
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
// Polyfill for async-await
import "regenerator-runtime/runtime";

import App from "./components/App";

import "normalize.css/normalize.css";
import "./styles/main.css";

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

ReactDOM.render(<App />, document.getElementById("app"));
