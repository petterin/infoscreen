import React from "react";
import { injectIntl } from "react-intl";

import { intlShape } from "../propTypes";
import dateHelperInit from "../util/dateHelper";

import "../styles/Clock.css";

class Clock extends React.Component {
  constructor(props) {
    super(props);
    this.dateHelper = dateHelperInit(props.intl.locale);
    this.state = {
      time: this.dateHelper.currentTime(),
    };
  }

  componentDidMount() {
    this.tick = setInterval(
      () => this.setState({ time: this.dateHelper.currentTime() }),
      1000
    );
  }

  componentWillUnmount() {
    clearInterval(this.tick);
  }

  displayDate() {
    const { intl } = this.props;
    const { time } = this.state;
    return intl.formatDate(time, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  displayTime() {
    const { intl } = this.props;
    const { time } = this.state;
    const LOCALES_WITH_12H_CLOCK = ["en"];
    const use12h = LOCALES_WITH_12H_CLOCK.indexOf(intl.locale) !== -1;
    return (
      <span>
        {use12h ? (
          <span className="am-pm">{this.dateHelper.format(time, "A")}</span>
        ) : null}
        <span className="hours">
          {this.dateHelper.format(time, use12h ? "h" : "HH")}
        </span>
        :<span className="minutes">{this.dateHelper.format(time, "mm")}</span>:
        <span className="seconds">{this.dateHelper.format(time, "ss")}</span>
      </span>
    );
  }

  render() {
    return (
      <div className="clock">
        <div className="time">{this.displayTime()}</div>
        <div className="date">{this.displayDate()}</div>
      </div>
    );
  }
}

Clock.propTypes = {
  intl: intlShape.isRequired,
};

Clock.defaultProps = {};

export default injectIntl(Clock);
