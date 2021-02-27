import * as React from "react";
import PropTypes from "prop-types";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error /* , errorInfo */) {
    const { name } = this.props;
    // eslint-disable-next-line no-console
    console.error(
      `Infoscreen error boundary caught an error in '${name}':\n${error.toString()}`
    );
  }

  render() {
    const { hasError, error } = this.state;
    const { children, name } = this.props;
    if (hasError) {
      return (
        <div>
          <h1>An error occured with {name}.</h1>
          <pre>{error && error.toString()}</pre>
          <p>You could try to reload the page.</p>
        </div>
      );
    }
    return children;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  name: PropTypes.string.isRequired,
};

export default ErrorBoundary;
