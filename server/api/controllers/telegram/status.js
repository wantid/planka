/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  async fn() {
    const { currentUser } = this.req;

    return {
      item: {
        isTelegramBotEnabled: !!sails.config.custom.telegramBotToken,
        telegramBotUsername: sails.config.custom.telegramBotUsername,
        isLinked: !!(currentUser && currentUser.telegramUserId),
        telegramUsername: currentUser && currentUser.telegramUsername,
      },
    };
  },
};
