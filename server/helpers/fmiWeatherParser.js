const _ = require("lodash");

const FMI_CREDIT_TEXT = "Ilmatieteenlaitos.fi (CC BY 4.0)";
const FMI_CREDIT_URL = "https://en.ilmatieteenlaitos.fi/open-data";

const FMI_OBSERVATION_PARAMETERS = {
  temperature: "t2m", // Unit: Celsius degrees
  rainAmount: "r_1h", // Unit: millimeters
  rainIntensity: "ri_10min", // Unit: mm/h
  relativeHumidity: "rh", // Unit: percentage
  airPressure: "p_sea", // Unit: hPa
  visibility: "vis", // Unit: meters
  clouds: "n_man", // Unit: index between 1.0 and 8.0
};

function findObservationByType(observations, id) {
  return observations.find((observation) => {
    const observationId = _.get(
      observation,
      "om:featureOfInterest[0].sams:SF_SpatialSamplingFeature[0].$.gml:id"
    );
    return observationId.endsWith(id);
  });
}

const fmiWeatherParser = {
  getAllSupportedObservationParameters: function () {
    return _.values(FMI_OBSERVATION_PARAMETERS);
  },

  generateObservationResponse: function (data) {
    const observations = _.get(
      data,
      "wfs:FeatureCollection.wfs:member"
    ).map((member) => _.get(member, "omso:PointTimeSeriesObservation[0]"));
    const observationsByName = _.mapValues(
      FMI_OBSERVATION_PARAMETERS,
      (value) => findObservationByType(observations, value)
    );

    // Get metadata values from the first observation set
    const _temperature = _(observationsByName["temperature"]);
    const place = _temperature.get(
      "om:featureOfInterest[0].sams:SF_SpatialSamplingFeature[0].sams:shape[0].gml:Point[0].gml:name[0]"
    );
    const region = _temperature.get(
      "om:featureOfInterest[0].sams:SF_SpatialSamplingFeature[0].sam:sampledFeature[0].target:LocationCollection[0].target:member[0].target:Location[0].target:region[0]._"
    );
    const locationLatLon = _temperature
      .get(
        "om:featureOfInterest[0].sams:SF_SpatialSamplingFeature[0].sams:shape[0].gml:Point[0].gml:pos[0]"
      )
      .split(" ");
    const startTime = _temperature.get(
      "om:phenomenonTime[0].gml:TimePeriod[0].gml:beginPosition[0]"
    );
    const endTime = _temperature.get(
      "om:phenomenonTime[0].gml:TimePeriod[0].gml:endPosition[0]"
    );

    const response = {
      location: {
        place: place,
        region: region,
        latitude: locationLatLon[0],
        longitude: locationLatLon[1],
      },
      meta: {
        timestamp: _.get(data, "wfs:FeatureCollection.$.timeStamp"),
        startTime: startTime,
        endTime: endTime,
        creditText: FMI_CREDIT_TEXT,
        creditUrl: FMI_CREDIT_URL,
      },
      temperature: {},
    };
    // Append observation results to response
    _.forEach(observationsByName, (observation, name) => {
      response[name] = this.generateObservationSet(observation);
    });
    return response;
  },

  generateObservationSet: function (observationData) {
    const timeseries = _.get(
      observationData,
      "om:result[0].wml2:MeasurementTimeseries[0].wml2:point"
    );
    const history = timeseries.map((measurement) => ({
      time: _.get(measurement, "wml2:MeasurementTVP[0].wml2:time[0]"),
      value: parseFloat(
        _.get(measurement, "wml2:MeasurementTVP[0].wml2:value[0]")
      ),
    }));
    const filteredHistory = history.filter((item) => !isNaN(item.value));
    const latestItem = _.maxBy(filteredHistory, (item) => item.time);
    const values = _.map(filteredHistory, (item) => item.value);
    return {
      minValue: _.min(values),
      maxValue: _.max(values),
      latest: latestItem,
      history: filteredHistory,
    };
  },
};

module.exports = fmiWeatherParser;
