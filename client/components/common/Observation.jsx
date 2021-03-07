import React from "react";
import PropTypes from "prop-types";
import { injectIntl, FormattedMessage } from "react-intl";

import { precisionRound } from "../../utils/numberUtils";
import { intlShape } from "../../propTypes";

import "./Observation.css";

const Observation = ({
  intl,
  key,
  label,
  labelMessageId,
  maxValue,
  minValue,
  prefix,
  unit,
  value,
  valueFallback,
  valuePrecision,
}) => {
  const labelEl = labelMessageId ? (
    <FormattedMessage id={labelMessageId} />
  ) : (
    label
  );

  const title =
    minValue !== null || maxValue !== null
      ? `Min: ${minValue}, Max: ${maxValue}`
      : null;

  const formattedValue = () => {
    if (value === null) {
      return valueFallback;
    }
    let numValue = Number(value);
    if (Number.isNaN(numValue)) {
      return valueFallback;
    }
    if (valuePrecision === 0) {
      numValue = Math.round(numValue);
    } else if (valuePrecision !== null) {
      numValue = precisionRound(numValue, valuePrecision);
    }
    return intl.formatNumber(numValue);
  };

  return (
    <div className="Observation" key={key}>
      <span className="label">{labelEl}</span>
      <span className="value" title={title}>
        {prefix} {formattedValue()} <span className="unit">{unit}</span>
      </span>
    </div>
  );
};

Observation.propTypes = {
  intl: intlShape.isRequired,
  key: PropTypes.string,
  label: PropTypes.string,
  labelMessageId: PropTypes.string,
  maxValue: PropTypes.string,
  minValue: PropTypes.string,
  prefix: PropTypes.node,
  unit: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  valueFallback: PropTypes.string,
  valuePrecision: PropTypes.number,
};

Observation.defaultProps = {
  key: null,
  label: null,
  labelMessageId: null,
  maxValue: null,
  minValue: null,
  prefix: null,
  unit: null,
  value: null,
  valueFallback: null,
  valuePrecision: null,
};

export default injectIntl(Observation);
