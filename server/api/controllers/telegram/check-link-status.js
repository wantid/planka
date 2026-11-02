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
    const { currentUser } = this.req;

    if (currentUser && currentUser.telegramUserId) {
      return {
        item: {
          isLinked: true,
          telegramUsername: currentUser.telegramUsername,
        },
      };
    }

    const tokenRes = await sails.sendNativeQuery(
      'SELECT * FROM telegram_link_token WHERE token = $1',
      [inputs.token],
    );

    if (!tokenRes.rows || tokenRes.rows.length === 0) {
      if (currentUser) {
        const user = await User.qm.getOneById(currentUser.id);
        if (user && user.telegramUserId) {
          return {
            item: {
              isLinked: true,
              telegramUsername: user.telegramUsername,
            },
          };
        }
      }

      return {
        item: {
          isLinked: false,
          isExpired: true,
        },
      };
    }

    const row = tokenRes.rows[0];
    const isExpired = new Date(row.expires_at) < new Date();

    return {
      item: {
        isLinked: false,
        isExpired,
      },
    };
  },
};
