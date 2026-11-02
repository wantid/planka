/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    dueDateNotifications: {
      type: 'boolean',
    },
    dueDateMuteOption: {
      type: 'string',
      isIn: ['none', 'week', 'two_weeks'],
    },
    dailyNotifications: {
      type: 'boolean',
    },
    dailyMuteOption: {
      type: 'string',
      isIn: ['none', 'week', 'two_weeks'],
    },
    dailyDigestTime: {
      type: 'string',
      regex: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    dailyDigestTimezone: {
      type: 'string',
      maxLength: 128,
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;
    const updateValues = {};

    if (inputs.dueDateNotifications !== undefined) {
      updateValues.telegramDueDateNotifications = inputs.dueDateNotifications;
    }

    if (inputs.dueDateMuteOption !== undefined) {
      if (inputs.dueDateMuteOption === 'week') {
        updateValues.telegramDueDateMutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (inputs.dueDateMuteOption === 'two_weeks') {
        updateValues.telegramDueDateMutedUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      } else if (inputs.dueDateMuteOption === 'none') {
        updateValues.telegramDueDateMutedUntil = null;
      }
    }

    if (inputs.dailyNotifications !== undefined) {
      updateValues.telegramDailyNotifications = inputs.dailyNotifications;
    }

    if (inputs.dailyMuteOption !== undefined) {
      if (inputs.dailyMuteOption === 'week') {
        updateValues.telegramDailyMutedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      } else if (inputs.dailyMuteOption === 'two_weeks') {
        updateValues.telegramDailyMutedUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      } else if (inputs.dailyMuteOption === 'none') {
        updateValues.telegramDailyMutedUntil = null;
      }
    }

    if (inputs.dailyDigestTime !== undefined) {
      updateValues.telegramDailyDigestTime = inputs.dailyDigestTime;
    }

    if (inputs.dailyDigestTimezone !== undefined) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: inputs.dailyDigestTimezone });
        updateValues.telegramDailyDigestTimezone = inputs.dailyDigestTimezone;
      } catch (err) {
        updateValues.telegramDailyDigestTimezone = 'UTC';
      }
    }

    if (Object.keys(updateValues).length > 0) {
      await User.updateOne(currentUser.id).set(updateValues);
    }

    const updatedUser = await User.qm.getOneById(currentUser.id);
    sails.sockets.broadcast(`user:${currentUser.id}`, 'userUpdate', {
      item: sails.helpers.users.presentOne(updatedUser, updatedUser),
    });

    return {
      item: {
        isLinked: !!updatedUser.telegramUserId,
        telegramUsername: updatedUser.telegramUsername,
        dueDateNotifications: updatedUser.telegramDueDateNotifications !== false,
        dueDateMutedUntil: updatedUser.telegramDueDateMutedUntil,
        dailyNotifications: updatedUser.telegramDailyNotifications !== false,
        dailyMutedUntil: updatedUser.telegramDailyMutedUntil,
        dailyDigestTime: updatedUser.telegramDailyDigestTime || '09:00',
        dailyDigestTimezone: updatedUser.telegramDailyDigestTimezone || 'UTC',
      },
    };
  },
};
