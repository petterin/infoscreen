import React, { useEffect, useState } from "react";
import axios from "axios";
import PropTypes from "prop-types";
import { injectIntl } from "react-intl";

import { intlShape } from "../../propTypes";

const Sunrise = ({
  className,
  currentISODate,
  intl,
  lat,
  lon,
  utcOffsetStr,
}) => {
  const [sunrise, setSunrise] = useState(null);

  // Load new sunrise data on startup and when current date or lat/lon changes
  useEffect(() => {
    const loadAndSetSunriseData = async () => {
      try {
        const response = await axios.get(
          `/api/sunrise?date=${currentISODate}&lat=${lat}&lon=${lon}&utcOffset=${utcOffsetStr}`
        );
        setSunrise({
          sunrise: response.data.sunrise,
          sunset: response.data.sunset,
        });
      } catch (err) {
        console.error("Failed to fetch sunrise from API", err); // eslint-disable-line no-console
      }
    };
    loadAndSetSunriseData();
  }, [currentISODate, lat, lon, utcOffsetStr]);

  const format = (datetime) => intl.formatTime(datetime);

  return (
    <div className={className}>
      <span className="sunrise-row">
        <i className="wi wi-sunrise" title="Sunrise" />
        {sunrise && sunrise.sunrise ? format(sunrise.sunrise) : "-"}
      </span>
      <span className="sunrise-row">
        <i className="wi wi-sunset" title="Sunset" />
        {sunrise && sunrise.sunset ? format(sunrise.sunset) : "-"}
      </span>
    </div>
  );
};

Sunrise.propTypes = {
  className: PropTypes.string,
  currentISODate: PropTypes.string.isRequired,
  intl: intlShape.isRequired,
  lat: PropTypes.number.isRequired,
  lon: PropTypes.number.isRequired,
  utcOffsetStr: PropTypes.string.isRequired,
};

Sunrise.defaultProps = {
  className: null,
};

export default injectIntl(Sunrise);
