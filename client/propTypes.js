import { arrayOf, number, object, shape, string } from "prop-types";

export const intlShape = object;

export const sensorHeaderType = string;

export const sensorType = shape({
  id: string,
  title: string,
  decimals: number,
  unitPostfix: string,
});

export const sensorsType = arrayOf(sensorType);

export const weatherLocationType = shape({
  country: string,
  county: string,
  city: string.isRequired,
  lat: number.isRequired,
  lon: number.isRequired,
});

export const observationLocationType = string;

export const transportationRegionType = string;

export const transportationStopType = shape({
  digitransitId: string,
  includeOnlyLines: arrayOf(string),
  excludeLines: arrayOf(string),
  walkInMinutes: number,
});

export const transportationDirectionType = shape({
  name: string,
  show: number,
  stops: arrayOf(transportationStopType),
});

export const transportationDirectionsType = arrayOf(
  transportationDirectionType
);
