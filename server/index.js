const express = require("express");
const path = require("path");
const logger = require("morgan");
const bodyParser = require("body-parser");

const app = express();

// App files
const config = require("../config.json"); // eslint-disable-line node/no-unpublished-require
const rootRoutes = require("./routes/default");
const apiRoutes = require("./routes/api")(config);

// View engine setup
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");

// Middlewares
const logFormat =
  app.get("env") === "development"
    ? "dev"
    : '[:date[iso]] ":method :url" :status - :response-time ms - :res[content-length] bytes - :remote-addr - ":user-agent"';
app.use(logger(logFormat));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "../public")));

// Routing
app.use("/", rootRoutes);
app.use("/api", apiRoutes);

// Catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// Error handler

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
