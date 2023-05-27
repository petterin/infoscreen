import React from "react";
import { createRoot } from "react-dom/client";
// Polyfill for async-await
import "regenerator-runtime/runtime";

import App from "./components/App";

import "normalize.css/normalize.css";
import "./fonts.css";
import "./index.css";

const root = createRoot(document.getElementById("app"));
root.render(<App />);
