/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports.up = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table
      .jsonb('telegram_notification_days')
      .notNullable()
      .defaultTo(JSON.stringify([1, 2, 3, 4, 5]));
  });
};

module.exports.down = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table.dropColumn('telegram_notification_days');
  });
};
