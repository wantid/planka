/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const DEFAULT_NOTIFICATION_DAYS = [1, 2, 3, 4, 5];

const WEEKDAY_MAP = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

const getWeekdayInTimezone = (date, timezone) => {
  try {
    const weekdayShort = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      weekday: 'short',
    }).format(date);

    if (WEEKDAY_MAP[weekdayShort]) {
      return WEEKDAY_MAP[weekdayShort];
    }
  } catch (err) {
    // Fallback to UTC below
  }

  const utcDay = date.getUTCDay();
  return utcDay === 0 ? 7 : utcDay;
};

module.exports = {
  sync: true,

  inputs: {
    notificationDays: {
      type: 'ref',
    },
    timezone: {
      type: 'string',
      allowNull: true,
    },
    date: {
      type: 'ref',
    },
  },

  fn(inputs) {
    const days = Array.isArray(inputs.notificationDays)
      ? inputs.notificationDays
      : DEFAULT_NOTIFICATION_DAYS;
    const targetDate = inputs.date instanceof Date ? inputs.date : new Date();
    const weekday = getWeekdayInTimezone(targetDate, inputs.timezone);

    return days.includes(weekday);
  },
};
