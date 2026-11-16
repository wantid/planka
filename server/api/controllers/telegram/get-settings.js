/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  async fn() {
    const { currentUser } = this.req;

    if (currentUser.telegramUserId) {
      sails.helpers.telegram.syncUserAvatar
        .with({
          user: currentUser,
          telegramUserId: currentUser.telegramUserId,
        })
        .catch(() => {});
    }

    return {
      item: sails.helpers.telegram.presentSettings(currentUser),
    };
  },
};
