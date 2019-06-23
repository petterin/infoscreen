const _ = require("lodash");
const mqtt = require("mqtt");

const RESPONSE_TIMEOUT_MS = 30 * 1000; // 30 seconds
const UNSUBSCRIBE_AFTER_MINUTES = 60;

const SENSORS = {};

let _mqttClient;

function getMqttClient(url) {
  if (!_mqttClient) {
    _mqttClient = mqtt.connect(url);
    _mqttClient.on("message", onMqttMessage);
    _mqttClient.on("close", () => {
      // eslint-disable-next-line no-console
      console.log(`MQTT connection to '${url}' closed.`);
      _.forEach(SENSORS, sensor => (sensor.initialized = false));
    });
  }
  return _mqttClient;
}

function onMqttMessage(topic, message) {
  const sensor = _.last(
    _.filter(SENSORS, s => s.initialized && s.mqttTopic === topic)
  );
  if (sensor) {
    sensor.latestValue = message.toString();
    sensor.lastUpdated = new Date();
    unsubscribeIfInactive(sensor);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `WARN: Received an MQTT message from an unexpected topic: ${topic}`
    );
  }
}

function unsubscribeIfInactive(sensor) {
  if (sensor.lastUsed === undefined || UNSUBSCRIBE_AFTER_MINUTES <= 0) {
    return;
  }
  const timeSinceLastUse = new Date() - sensor.lastUsed; // milliseconds
  const unsubscribeThreshold = UNSUBSCRIBE_AFTER_MINUTES * 60 * 1000;
  if (timeSinceLastUse > unsubscribeThreshold) {
    _mqttClient.unsubscribe(sensor.mqttTopic);
    sensor.initialized = false;
    sensor.latestValue = sensor.lastUpdated = undefined;
    // eslint-disable-next-line no-console
    console.log(
      `Unsubscribed from MQTT topic '${sensor.mqttTopic}' because it hasn't been read for ${UNSUBSCRIBE_AFTER_MINUTES} minutes.`
    );
  }
}

function getOrInitializeSensor(sensorId, config) {
  if (_.get(SENSORS, `${sensorId}.initialized`) === true) {
    return SENSORS[sensorId];
  }

  const sensorConf = _.find(
    _.get(config, `sensors.sensors`, sensorId),
    s => s["id"] === sensorId
  );
  if (SENSORS[sensorId] === undefined && sensorConf === undefined) {
    return undefined;
  }
  SENSORS[sensorId] = {
    mqttTopic: sensorConf.mqttTopic
  };
  const sensorState = SENSORS[sensorId];

  // Initialize MQTT subscription for the sensor

  const mqttUrl = _.get(config, "sensors.mqttBrokerUrl");
  const client = getMqttClient(mqttUrl);
  sensorState.initialized = true;

  function subscribe(client, mqttUrl, topic) {
    // eslint-disable-next-line no-console
    console.log(`Subscribing to MQTT topic '${topic}' on '${mqttUrl}'.`);
    client.subscribe(topic);
  }

  if (client.connected) {
    subscribe(client, mqttUrl, sensorState.mqttTopic);
  } else {
    client.on("connect", () => {
      subscribe(client, mqttUrl, sensorState.mqttTopic);
    });
  }

  return sensorState;
}

module.exports = config => ({
  getLatestData: function(sensorId) {
    const sensorConf = getOrInitializeSensor(sensorId, config);
    if (sensorConf === undefined) {
      return new Promise((resolve, reject) => {
        const err = new Error(`Unknown sensor ID: ${sensorId}`);
        err.status = 404;
        reject(err);
      });
    }

    sensorConf.lastUsed = new Date();

    // Get the latest value if present, or wait for it to update (via MQTT subscription)
    return new Promise((resolve, reject) => {
      let retryTimer;
      const timeoutTimer = setTimeout(() => {
        clearTimeout(retryTimer);
        reject(new Error("Timed out waiting for sensor data."));
      }, RESPONSE_TIMEOUT_MS);

      function resolveOrRetry() {
        if (sensorConf.lastUpdated) {
          clearTimeout(timeoutTimer);
          resolve({
            value: sensorConf.latestValue,
            timestamp: sensorConf.lastUpdated
          });
        } else {
          retryTimer = setTimeout(resolveOrRetry, 1000); // try after 1 seconds
        }
      }
      resolveOrRetry();
    });
  }
});
