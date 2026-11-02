/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    initData: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    invalidInitData: {
      responseType: 'unauthorized',
    },
    userNotLinked: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const token = sails.config.custom.telegramBotToken;
    if (!token) {
      throw 'invalidInitData';
    }

    let tgUser;
    try {
      tgUser = sails.helpers.telegram.verifyInitData(inputs.initData, token);
    } catch (error) {
      throw 'invalidInitData';
    }

    const user = await User.qm.getOneByTelegramUserId(String(tgUser.id));
    if (!user || user.isDeactivated) {
      throw 'userNotLinked';
    }

    const remoteAddress =
      this.req.headers['x-forwarded-for'] || this.req.connection.remoteAddress || '127.0.0.1';

    const result = await sails.helpers.accessTokens.handleSteps.with({
      user,
      remoteAddress,
      request: this.req,
      response: this.res,
      withHttpOnlyToken: true,
    });

    return {
      item: {
        accessToken: result.item,
        user: sails.helpers.users.presentOne(user, user),
      },
    };
  },
};
