/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports.up = async (knex) => {
  await knex.schema.alterTable('user_account', (table) => {
    table.text('telegram_user_id');
    table.text('telegram_chat_id');
    table.text('telegram_username');
    table.boolean('telegram_due_date_notifications').notNullable().defaultTo(true);
    table.timestamp('telegram_due_date_muted_until', true);
    table.boolean('telegram_daily_notifications').notNullable().defaultTo(true);
    table.timestamp('telegram_daily_muted_until', true);
    table.text('telegram_daily_last_sent_date');
    table.text('telegram_daily_digest_time').notNullable().defaultTo('09:00');
    table.text('telegram_daily_digest_timezone').notNullable().defaultTo('UTC');

    table.unique(['telegram_user_id']);
  });

  await knex.schema.createTable('telegram_link_token', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.text('token').notNullable().unique();
    table.bigInteger('user_id').notNullable();
    table.timestamp('expires_at', true).notNullable();
    table.timestamp('created_at', true).notNullable().defaultTo(knex.fn.now());

    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.index('token');
  });

  await knex.schema.createTable('telegram_login_token', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.text('token').notNullable().unique();
    table.text('telegram_user_id');
    table.bigInteger('user_id');
    table.text('access_token');
    table.boolean('is_confirmed').notNullable().defaultTo(false);
    table.timestamp('expires_at', true).notNullable();
    table.timestamp('created_at', true).notNullable().defaultTo(knex.fn.now());

    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.index('token');
  });

  await knex.schema.createTable('telegram_task_notification', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('card_id').notNullable();
    table.bigInteger('user_id').notNullable();
    table.text('type').notNullable();
    table.timestamp('due_date', true).notNullable();
    table.timestamp('created_at', true).notNullable().defaultTo(knex.fn.now());

    table.foreign('card_id').references('id').inTable('card').onDelete('CASCADE');
    table.foreign('user_id').references('id').inTable('user_account').onDelete('CASCADE');
    table.unique(['card_id', 'user_id', 'type', 'due_date']);
  });
};

module.exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('telegram_task_notification');
  await knex.schema.dropTableIfExists('telegram_login_token');
  await knex.schema.dropTableIfExists('telegram_link_token');

  await knex.schema.alterTable('user_account', (table) => {
    table.dropUnique(['telegram_user_id']);
    table.dropColumn('telegram_daily_digest_timezone');
    table.dropColumn('telegram_daily_digest_time');
    table.dropColumn('telegram_daily_last_sent_date');
    table.dropColumn('telegram_daily_muted_until');
    table.dropColumn('telegram_daily_notifications');
    table.dropColumn('telegram_due_date_muted_until');
    table.dropColumn('telegram_due_date_notifications');
    table.dropColumn('telegram_username');
    table.dropColumn('telegram_chat_id');
    table.dropColumn('telegram_user_id');
  });
};
