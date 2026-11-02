/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    token: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const res = await sails.sendNativeQuery(
      'SELECT * FROM telegram_login_token WHERE token = $1 AND expires_at > NOW()',
      [inputs.token],
    );

    if (!res.rows || res.rows.length === 0) {
      return {
        item: {
          isConfirmed: false,
          isExpired: true,
        },
      };
    }

    const row = res.rows[0];

    if (row.is_confirmed && row.access_token) {
      // Clean up token after successful consumption
      await sails.sendNativeQuery('DELETE FROM telegram_login_token WHERE id = $1', [row.id]);

      return {
        item: {
          isConfirmed: true,
          accessToken: row.access_token,
        },
      };
    }

    if (row.telegram_user_id === 'not_linked') {
      await sails.sendNativeQuery('DELETE FROM telegram_login_token WHERE id = $1', [row.id]);

      return {
        item: {
          isConfirmed: false,
          error: 'not_linked',
        },
      };
    }

    if (row.telegram_user_id === 'deactivated') {
      await sails.sendNativeQuery('DELETE FROM telegram_login_token WHERE id = $1', [row.id]);

      return {
        item: {
          isConfirmed: false,
          error: 'deactivated',
        },
      };
    }

    return {
      item: {
        isConfirmed: false,
      },
    };
  },
};
