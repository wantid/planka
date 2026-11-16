/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const DEFAULT_NOTIFICATION_DAYS = [1, 2, 3, 4, 5];

module.exports = {
  sync: true,

  inputs: {
    user: {
      type: 'ref',
      required: true,
    },
  },

  fn(inputs) {
    const { user } = inputs;

    return {
      isLinked: !!user.telegramUserId,
      telegramUsername: user.telegramUsername,
      dueDateNotifications: user.telegramDueDateNotifications !== false,
      dueDateMutedUntil: user.telegramDueDateMutedUntil,
      dailyNotifications: user.telegramDailyNotifications !== false,
      dailyMutedUntil: user.telegramDailyMutedUntil,
      dailyDigestTime: user.telegramDailyDigestTime || '09:00',
      dailyDigestTimezone: user.telegramDailyDigestTimezone || 'UTC',
      notificationDays: Array.isArray(user.telegramNotificationDays)
        ? user.telegramNotificationDays
        : DEFAULT_NOTIFICATION_DAYS,
    };
  },
};
