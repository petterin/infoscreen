import React, { useEffect, useRef, useState } from "react";
import { injectIntl } from "react-intl";

import { intlShape, weatherLocationType } from "../../propTypes";
import dateHelperInit from "../../utils/dateHelper";
import Sunrise from "./Sunrise";

import "./Clock.css";

const LOCALES_WITH_12H_CLOCK = ["en-US"];

const Clock = ({ intl, location }) => {
  const dateHelper = useRef(dateHelperInit(intl.locale)).current;
  const [time, setTime] = useState(dateHelper.currentTime());
  const tick = useRef(null);

  // Ticker for updating the clock display every second
  useEffect(() => {
    tick.current = window.setInterval(
      () => setTime(dateHelper.currentTime()),
      1000
    );
    return () => {
      clearInterval(tick.current);
    };
  }, [dateHelper]);

  const renderDate = () => {
    return intl.formatDate(time, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const renderTime = () => {
    const use12h = LOCALES_WITH_12H_CLOCK.indexOf(intl.locale) !== -1;
    const period = use12h ? (
      <span className="am-pm">{dateHelper.format(time, "a")}</span>
    ) : null;
    const hours = (
      <span className="hours">
        {dateHelper.format(time, use12h ? "h" : "HH")}
      </span>
    );
    const minutes = (
      <span className="minutes">{dateHelper.format(time, "mm")}</span>
    );
    const seconds = (
      <span className="seconds">{dateHelper.format(time, "ss")}</span>
    );
    return (
      <>
        {period}
        {hours}:{minutes}:{seconds}
      </>
    );
  };

  const currentISODate = dateHelper.format(time, "yyyy-MM-dd");
  const utcOffsetStr = dateHelper.format(time, "xxx"); // e.g. "+02:00"

  return (
    <div className="clock">
      <div className="date-time">
        <div className="time">{renderTime()}</div>
        <div className="date">{renderDate()}</div>
      </div>
      <Sunrise
        className="sunrise"
        currentISODate={currentISODate}
        lat={location.lat}
        lon={location.lon}
        utcOffsetStr={utcOffsetStr}
      />
    </div>
  );
};

Clock.propTypes = {
  intl: intlShape.isRequired,
  location: weatherLocationType.isRequired,
};

Clock.defaultProps = {};

export default injectIntl(Clock);
