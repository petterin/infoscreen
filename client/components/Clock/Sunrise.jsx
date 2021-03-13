import React, { useEffect, useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { useIntl } from "react-intl";

const Sunrise = ({ className, currentISODate, lat, lon, utcOffsetStr }) => {
  const intl = useIntl();
  const [sunriseData, setSunriseData] = useState({});

  // Load new sunrise data on startup and when current date or lat/lon changes
  useEffect(() => {
    const loadAndSetSunriseData = async () => {
      const encodedOffset = encodeURIComponent(utcOffsetStr);
      try {
        const response = await axios.get(
          `/api/sunrise?date=${currentISODate}&lat=${lat}&lon=${lon}&utcOffset=${encodedOffset}`
        );
        setSunriseData({
          sunrise: response.data.sunrise,
          sunset: response.data.sunset,
        });
      } catch (err) {
        console.error("Failed to fetch sunrise from API", err); // eslint-disable-line no-console
      }
    };
    loadAndSetSunriseData();
  }, [currentISODate, lat, lon, utcOffsetStr]);

  const formatAsTitle = (prefixMsgId, date) => {
    const prefixMsg = intl.formatMessage({ id: prefixMsgId });
    const dateStr =
      date !== undefined
        ? intl.formatTime(date, {
            weekday: "long",
            hour: "numeric",
            minute: "numeric",
            second: "numeric",
          })
        : "";
    return `${prefixMsg}: ${dateStr}`;
  };

  const { sunrise, sunset } = sunriseData;
  return (
    <div className={className}>
      <span
        className="sunrise-row"
        title={formatAsTitle("clock.sunrise", sunrise)}
      >
        <i className="wi wi-sunrise" />
        {sunrise ? intl.formatTime(sunrise) : "-"}
      </span>
      <span
        className="sunrise-row"
        title={formatAsTitle("clock.sunset", sunset)}
      >
        <i className="wi wi-sunset" />
        {sunset ? intl.formatTime(sunset) : "-"}
      </span>
    </div>
  );
};

Sunrise.propTypes = {
  className: PropTypes.string,
  currentISODate: PropTypes.string.isRequired,
  lat: PropTypes.number.isRequired,
  lon: PropTypes.number.isRequired,
  utcOffsetStr: PropTypes.string.isRequired,
};

Sunrise.defaultProps = {
  className: null,
};

const MemoSunrise = React.memo(Sunrise);

export default MemoSunrise;
