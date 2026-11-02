/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  async fn() {
    if (sails.hooks.telegram && sails.hooks.telegram.handleWebhook) {
      await sails.hooks.telegram.handleWebhook(this.req, this.res);
      return;
    }

    this.res.status(200).send('OK');
  },
};
