// eslint-disable-next-line import/prefer-default-export
export function trimStr(input, maxLength, trimMarker = "") {
  if (!input) {
    return input;
  }
  const inputStr = typeof input === "string" ? input : JSON.stringify(input);
  const trimmedStr = inputStr.substring(
    0,
    Math.min(maxLength, inputStr.length)
  );
  return trimmedStr.length < inputStr.length
    ? trimmedStr + trimMarker
    : trimmedStr;
}
