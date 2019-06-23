import addHours from "date-fns/add_hours";
import addMinutes from "date-fns/add_minutes";
import differenceInHours from "date-fns/difference_in_hours";
import differenceInMinutes from "date-fns/difference_in_minutes";
import differenceInSeconds from "date-fns/difference_in_seconds";
import format from "date-fns/format";
import getTime from "date-fns/get_time";
import isSameDay from "date-fns/is_same_day";
import parse from "date-fns/parse";
import en from "date-fns/locale/en";
import fi from "date-fns/locale/fi";

const SUPPORTED_DATE_LOCALES = { en, fi };

function getLocale(localeCode) {
  return SUPPORTED_DATE_LOCALES[localeCode];
}

export default function dateHelperInit(localeCode) {
  const localeObj = getLocale(localeCode);
  return {
    currentTime: () => new Date(),
    format: (date, pattern) => format(date, pattern, { locale: localeObj }),
    toEpochSeconds: date => Math.round(getTime(date) / 1000.0),
    parseEpochSeconds: timestamp => parse(1000 * timestamp),
    addHours: (date, amount) => addHours(date, amount),
    addMinutes: (date, amount) => addMinutes(date, amount),
    differenceInHours: (laterDate, earlierDate) =>
      differenceInHours(laterDate, earlierDate),
    differenceInMinutes: (laterDate, earlierDate) =>
      differenceInMinutes(laterDate, earlierDate),
    differenceInSeconds: (laterDate, earlierDate) =>
      differenceInSeconds(laterDate, earlierDate),
    isSameDay: (date1, date2) => isSameDay(date1, date2)
  };
}
