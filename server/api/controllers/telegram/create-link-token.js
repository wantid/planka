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
    const { currentUser } = this.req;
    const botUsername = sails.config.custom.telegramBotUsername;

    if (!sails.config.custom.telegramBotToken) {
      throw 'botNotConfigured';
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // Delete any old link tokens for this user
    await sails.sendNativeQuery('DELETE FROM telegram_link_token WHERE user_id = $1', [
      currentUser.id,
    ]);

    await sails.sendNativeQuery(
      'INSERT INTO telegram_link_token (token, user_id, expires_at, created_at) VALUES ($1, $2, $3, NOW())',
      [token, currentUser.id, expiresAt],
    );

    const botUrl = botUsername ? `https://t.me/${botUsername}?start=link_${token}` : null;

    return {
      item: {
        token,
        botUrl,
        expiresAt,
      },
    };
  },
};
