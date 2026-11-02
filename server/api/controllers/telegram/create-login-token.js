/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

module.exports = {
  exits: {
    botNotConfigured: {
      responseType: 'badRequest',
    },
  },

  async fn() {
    const botUsername = sails.config.custom.telegramBotUsername;

    if (!sails.config.custom.telegramBotToken) {
      throw 'botNotConfigured';
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await sails.sendNativeQuery(
      'INSERT INTO telegram_login_token (token, expires_at, created_at) VALUES ($1, $2, NOW())',
      [token, expiresAt],
    );

    const botUrl = botUsername ? `https://t.me/${botUsername}?start=login_${token}` : null;

    return {
      item: {
        token,
        botUsername,
        botUrl,
        expiresAt,
      },
    };
  },
};
