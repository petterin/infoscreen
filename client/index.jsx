import React from "react";
import ReactDOM from "react-dom";
// Polyfill for async-await
import "regenerator-runtime/runtime";

import App from "./components/App";

import "normalize.css/normalize.css";
import "./fonts.css";
import "./index.css";

ReactDOM.render(<App />, document.getElementById("app"));
