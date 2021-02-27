import {
  addHours,
  addMinutes,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  getUnixTime,
  format,
  fromUnixTime,
  isSameDay,
  parseISO,
} from "date-fns";
import enUSLocale from "date-fns/locale/en-US";
import fiLocale from "date-fns/locale/fi";

const SUPPORTED_DATE_LOCALES = {
  "en-US": enUSLocale,
  "fi-FI": fiLocale,
};

function getLocale(localeCode) {
  return SUPPORTED_DATE_LOCALES[localeCode];
}

export default function dateHelperInit(localeCode) {
  const localeObj = getLocale(localeCode);
  const dateHelpers = {
    currentTime: () => new Date(),
    format: (date, pattern) => {
      if (date === undefined || date === null) {
        return date;
      }
      return format(date, pattern, { locale: localeObj });
    },
    toEpochSeconds: (date) => getUnixTime(date),
    parseEpochSeconds: (timestamp) => fromUnixTime(timestamp),
    addHours: (date, amount) => addHours(date, amount),
    addMinutes: (date, amount) => addMinutes(date, amount),
    differenceInHours: (laterDate, earlierDate) =>
      differenceInHours(laterDate, earlierDate),
    differenceInMinutes: (laterDate, earlierDate) =>
      differenceInMinutes(laterDate, earlierDate),
    differenceInSeconds: (laterDate, earlierDate) =>
      differenceInSeconds(laterDate, earlierDate),
    isSameDay: (date1, date2) => isSameDay(date1, date2),
    parseISO: (isoDateString) => {
      if (isoDateString === undefined || isoDateString === null) {
        return isoDateString;
      }
      return parseISO(isoDateString);
    },
    parseAndFormatDate: (isoDateString, pattern) => {
      const date = dateHelpers.parseISO(isoDateString);
      return dateHelpers.format(date, pattern);
    },
  };
  return dateHelpers;
}
