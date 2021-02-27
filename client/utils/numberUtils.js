// eslint-disable-next-line import/prefer-default-export
export function precisionRound(number, precision) {
  const factor = 10 ** precision;
  return Math.round(number * factor) / factor;
}
