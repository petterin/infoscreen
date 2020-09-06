import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { IntlProvider } from "react-intl";

const loadMessages = async (langCode) => {
  let module;
  if (langCode === "fi") {
    module = await import(
      /* webpackChunkName: 'messages_fi-FI' */ "../messages/fi-FI"
    );
  } else {
    module = await import(
      /* webpackChunkName: 'messages_en-US' */ "../messages/en-US"
    );
  }
  return module.default;
};

const IntlWrapper = ({ language, locale, fallback, children }) => {
  const [messages, setMessages] = useState(null);

  useEffect(() => {
    async function loadAndSetMessages() {
      const msgs = await loadMessages(language);
      setMessages(msgs);
    }
    loadAndSetMessages();
  }, [language]);

  if (!messages) {
    return fallback;
  }
  return (
    <IntlProvider locale={locale} messages={messages}>
      {children}
    </IntlProvider>
  );
};

IntlWrapper.propTypes = {
  language: PropTypes.string.isRequired,
  locale: PropTypes.string.isRequired,
  fallback: PropTypes.node,
  children: PropTypes.node,
};

IntlWrapper.defaultProps = {
  fallback: null,
  children: null,
};

export default IntlWrapper;
