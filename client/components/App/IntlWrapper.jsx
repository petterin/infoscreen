import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { IntlProvider } from "react-intl";

const DEFAULT_LOCALE = "en-US";
const SUPPORTED_LOCALES = ["fi-FI", "en-US"];

const loadMessages = async (langCode) => {
  let module;
  if (langCode === "fi-FI") {
    module = await import(
      /* webpackChunkName: 'messages_fi-FI' */ "../../messages/fi-FI"
    );
  } else {
    module = await import(
      /* webpackChunkName: 'messages_en-US' */ "../../messages/en-US"
    );
  }
  return module.default;
};

function IntlWrapper({ language, fallback, children }) {
  const [messages, setMessages] = useState(null);

  const isLanguageSupported = SUPPORTED_LOCALES.includes(language);
  const languageCode = isLanguageSupported ? language : DEFAULT_LOCALE;

  useEffect(() => {
    async function loadAndSetMessages() {
      const msgs = await loadMessages(languageCode);
      setMessages(msgs);
    }
    loadAndSetMessages();
    if (!isLanguageSupported) {
      // eslint-disable-next-line no-console
      console.warn(
        `Unsupported locale "${language}" in configuration, using default locale.`
      );
    }
  }, [isLanguageSupported, language, languageCode]);

  if (!messages) {
    return fallback;
  }
  return (
    <IntlProvider locale={languageCode} messages={messages}>
      {children}
    </IntlProvider>
  );
}

IntlWrapper.propTypes = {
  language: PropTypes.string.isRequired,
  fallback: PropTypes.node,
  children: PropTypes.node,
};

IntlWrapper.defaultProps = {
  fallback: null,
  children: null,
};

export default IntlWrapper;
