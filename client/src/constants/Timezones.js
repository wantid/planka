/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const FALLBACK_TIMEZONES = [
  'Europe/Kaliningrad',
  'Europe/Belgrade',
  'Europe/Moscow',
  'Europe/Samara',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Kamchatka',
  'Europe/Kyiv',
  'Europe/Minsk',
  'Asia/Tashkent',
  'Asia/Almaty',
  'Asia/Tbilisi',
  'Asia/Yerevan',
  'Asia/Baku',
  'UTC',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Vienna',
  'Europe/Prague',
  'Europe/Budapest',
  'Europe/Bucharest',
  'Europe/Sofia',
  'Europe/Athens',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
];

export const getTimezonesList = (currentTz) => {
  let allTzNames = [];
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
      allTzNames = Intl.supportedValuesOf('timeZone');
    }
  } catch {
    allTzNames = [];
  }

  if (allTzNames.length === 0) {
    allTzNames = FALLBACK_TIMEZONES;
  }

  const list = allTzNames.map((tz) => {
    let offset = '';
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'shortOffset',
      });
      const parts = formatter.formatToParts(now);
      const part = parts.find((p) => p.type === 'timeZoneName');
      if (part && part.value) {
        offset = ` (${part.value})`;
      }
    } catch {
      // ignore
    }
    return {
      value: tz,
      label: `${tz}${offset}`,
    };
  });

  // Ensure current timezone is always in the list
  if (currentTz && !list.some((item) => item.value === currentTz)) {
    list.unshift({
      value: currentTz,
      label: `${currentTz} (Текущий)`,
    });
  }

  return list;
};

export default {
  getTimezonesList,
};
