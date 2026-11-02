/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  async fn() {
    const { currentUser } = this.req;

    await sails.sendNativeQuery(
      `UPDATE user_account
       SET telegram_user_id = NULL, telegram_chat_id = NULL, telegram_username = NULL
       WHERE id = $1`,
      [currentUser.id],
    );

    const updatedUser = await User.qm.getOneById(currentUser.id);
    sails.sockets.broadcast(`user:${currentUser.id}`, 'userUpdate', {
      item: sails.helpers.users.presentOne(updatedUser, updatedUser),
    });

    return {
      item: sails.helpers.users.presentOne(updatedUser, updatedUser),
    };
  },
};
