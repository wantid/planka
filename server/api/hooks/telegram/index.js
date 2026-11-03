/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { Bot, InlineKeyboard } = require('grammy');
const { ProxyAgent } = require('undici');
const escapeHtml = require('escape-html');

module.exports = function defineTelegramHook() {
  let bot = null;
  let retryTimer = null;
  let retryAttempt = 0;
  let dueDateInterval = null;
  let dailyDigestInterval = null;

  const getBaseUrl = () => {
    const raw = sails.config.custom.baseUrl || 'http://localhost:1337';
    return raw.replace(/\/$/, '');
  };

  const getMiniAppUrl = () => `${getBaseUrl()}/tg-app`;

  const formatDueDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const checkDueDates = async () => {
    try {
      const now = new Date();
      const nowTime = now.getTime();

      const query = `
        SELECT
          card.id AS card_id,
          card.name AS card_name,
          card.due_date,
          card.board_id,
          board.name AS board_name,
          board.project_id,
          project.name AS project_name,
          cm.user_id,
          ua.telegram_chat_id,
          ua.telegram_due_date_notifications,
          ua.telegram_due_date_muted_until
        FROM card
        JOIN list ON card.list_id = list.id
        JOIN board ON card.board_id = board.id
        JOIN project ON board.project_id = project.id
        JOIN card_membership cm ON card.id = cm.card_id
        JOIN user_account ua ON cm.user_id = ua.id
        WHERE card.is_closed = false
          AND card.due_date IS NOT NULL
          AND list.type NOT IN ('archive', 'trash')
          AND ua.telegram_chat_id IS NOT NULL
          AND ua.telegram_due_date_notifications = true
          AND (ua.telegram_due_date_muted_until IS NULL OR ua.telegram_due_date_muted_until < NOW())
      `;

      const result = await sails.sendNativeQuery(query);
      const rows = result.rows || [];

      await Promise.all(
        rows.map(async (row) => {
          const dueTime = new Date(row.due_date).getTime();
          const diffHours = (dueTime - nowTime) / (1000 * 60 * 60);

          let type = null;
          let label = null;

          const dueDateObj = new Date(row.due_date);
          const isSameCalendarDay = now.toDateString() === dueDateObj.toDateString();

          if (diffHours >= 144 && diffHours <= 180) {
            type = 'week';
            label = 'За неделю до срока';
          } else if (diffHours >= 60 && diffHours <= 96) {
            type = 'three_days';
            label = 'За 3 дня до срока';
          } else if (diffHours >= 18 && diffHours <= 36) {
            type = 'one_day';
            label = 'Завтра срок сдачи';
          } else if (isSameCalendarDay || (diffHours >= -2 && diffHours <= 16)) {
            type = 'due_date';
            label = 'Сегодня день сдачи';
          }

          if (!type) {
            return;
          }

          const checkSql = `
            SELECT 1 FROM telegram_task_notification
            WHERE card_id = $1 AND user_id = $2 AND type = $3 AND due_date = $4
          `;
          const exists = await sails.sendNativeQuery(checkSql, [
            row.card_id,
            row.user_id,
            type,
            row.due_date,
          ]);

          if ((exists.rows && exists.rows.length > 0) || exists.rowCount > 0) {
            return;
          }

          const text =
            `⏰ <b>${label}</b>\n\n` +
            `<b>${escapeHtml(row.card_name)}</b>\n` +
            `📁 Проект: <i>${escapeHtml(row.project_name)}</i>\n` +
            `📋 Доска: <i>${escapeHtml(row.board_name)}</i>\n` +
            `📅 Срок: <b>${formatDueDate(row.due_date)}</b>`;

          const keyboard = new InlineKeyboard()
            .webApp('📱 Мои задачи', getMiniAppUrl())
            .url('🌐 Открыть карточку', `${getBaseUrl()}/cards/${row.card_id}`);

          try {
            await bot.api.sendMessage(row.telegram_chat_id, text, {
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });

            await sails.sendNativeQuery(
              `INSERT INTO telegram_task_notification (card_id, user_id, type, due_date, created_at)
               VALUES ($1, $2, $3, $4, NOW())
               ON CONFLICT DO NOTHING`,
              [row.card_id, row.user_id, type, row.due_date],
            );
          } catch (sendErr) {
            // If the user blocked the bot or chat was deleted (403), record to prevent log spam
            if (sendErr && sendErr.error_code === 403) {
              await sails.sendNativeQuery(
                `INSERT INTO telegram_task_notification (card_id, user_id, type, due_date, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT DO NOTHING`,
                [row.card_id, row.user_id, type, row.due_date],
              );
            }
            sails.log.warn('Failed to send Telegram due date notification:', sendErr.message);
          }
        }),
      );
    } catch (err) {
      sails.log.error('Error checking due dates for Telegram notifications:', err);
    }
  };

  const getUserTimeInTz = (date, timezone) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone || 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const parts = formatter.formatToParts(date);
      const partMap = {};
      parts.forEach((p) => {
        partMap[p.type] = p.value;
      });
      const dateStr = `${partMap.year}-${partMap.month}-${partMap.day}`;
      const timeStr = `${partMap.hour}:${partMap.minute}`;
      return { dateStr, timeStr };
    } catch (err) {
      const dateStr = date.toISOString().slice(0, 10);
      const hour = String(date.getUTCHours()).padStart(2, '0');
      const minute = String(date.getUTCMinutes()).padStart(2, '0');
      return { dateStr, timeStr: `${hour}:${minute}` };
    }
  };

  const checkDailyDigests = async () => {
    try {
      const now = new Date();

      const userSql = `
        SELECT id, name, telegram_chat_id, telegram_daily_last_sent_date,
               telegram_daily_digest_time, telegram_daily_digest_timezone
        FROM user_account
        WHERE telegram_chat_id IS NOT NULL
          AND telegram_daily_notifications = true
          AND (telegram_daily_muted_until IS NULL OR telegram_daily_muted_until < NOW())
      `;
      const usersRes = await sails.sendNativeQuery(userSql);
      const users = usersRes.rows || [];

      await Promise.all(
        users.map(async (user) => {
          const userTz = user.telegram_daily_digest_timezone || 'UTC';
          const { dateStr, timeStr } = getUserTimeInTz(now, userTz);

          if (user.telegram_daily_last_sent_date === dateStr) {
            return;
          }

          const targetTime = user.telegram_daily_digest_time || '09:00';
          if (timeStr < targetTime) {
            return;
          }

          const tasksSql = `
            SELECT card.id, card.name, card.due_date
            FROM card
            JOIN list ON card.list_id = list.id
            JOIN card_membership cm ON card.id = cm.card_id
            WHERE cm.user_id = $1
              AND card.is_closed = false
              AND list.type NOT IN ('archive', 'trash')
            ORDER BY card.due_date ASC NULLS LAST, card.id ASC
            LIMIT 20
          `;
          const tasksRes = await sails.sendNativeQuery(tasksSql, [user.id]);
          const tasks = tasksRes.rows || [];

          await sails.sendNativeQuery(
            'UPDATE user_account SET telegram_daily_last_sent_date = $1 WHERE id = $2',
            [dateStr, user.id],
          );

          if (tasks.length === 0) {
            return;
          }

          let message = '📋 <b>Ваши текущие задачи:</b>\n\n';
          tasks.forEach((t) => {
            const dueStr = t.due_date ? `до ${formatShortDate(t.due_date)}` : 'без срока';
            message += `• «${escapeHtml(t.name)}» | ${dueStr}\n`;
          });

          const keyboard = new InlineKeyboard()
            .webApp('Мои задачи', getMiniAppUrl())
            .url('Перейти в дашборд', `${getBaseUrl()}/`);

          try {
            await bot.api.sendMessage(user.telegram_chat_id, message, {
              parse_mode: 'HTML',
              reply_markup: keyboard,
            });
          } catch (sendErr) {
            sails.log.warn('Failed to send Telegram daily digest:', sendErr.message);
          }
        }),
      );
    } catch (err) {
      sails.log.error('Error running daily digest for Telegram:', err);
    }
  };

  return {
    getBot() {
      return bot;
    },

    async handleWebhook(req, res) {
      if (!bot) {
        res.status(503).send('Telegram bot not ready');
        return;
      }

      const update = req.body;
      if (!update || typeof update !== 'object') {
        res.status(400).send('Invalid update body');
        return;
      }

      // Respond 200 OK immediately so Telegram doesn't retry or timeout
      res.status(200).send('OK');

      try {
        await bot.handleUpdate(update);
      } catch (err) {
        sails.log.error('Telegram hook: Error in handleUpdate:', err);
      }
    },

    async sendMessage(chatId, text, options = {}) {
      if (!bot) {
        return null;
      }
      return bot.api.sendMessage(chatId, text, options);
    },

    async initialize() {
      const token = sails.config.custom.telegramBotToken;
      if (!token) {
        sails.log.info('Telegram hook: TELEGRAM_BOT_TOKEN not provided, Telegram bot disabled.');
        return;
      }

      try {
        const botId = parseInt(token.split(':')[0], 10) || 0;
        const initialUsername = (sails.config.custom.telegramBotUsername || 'PlankaBot').replace(
          /^@/,
          '',
        );

        const clientOptions = {};
        const proxyUrl =
          sails.config.custom.outgoingProxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
        if (proxyUrl) {
          clientOptions.baseFetchConfig = {
            dispatcher: new ProxyAgent(proxyUrl),
          };
        }

        bot = new Bot(token, {
          botInfo: {
            id: botId,
            is_bot: true,
            first_name: initialUsername,
            username: initialUsername,
            can_join_groups: true,
            can_read_all_group_messages: false,
            supports_inline_queries: false,
            can_connect_to_business: false,
            has_main_web_app: false,
          },
          client: clientOptions,
        });

        bot.catch((err) => {
          const updateId = err.ctx && err.ctx.update ? err.ctx.update.update_id : 'unknown';
          sails.log.error(
            `Telegram hook: Error while handling update ${updateId}:`,
            err.error || err,
          );
        });

        bot.command('start', async (ctx) => {
          const rawText = (ctx.message && ctx.message.text) || '';
          const match = ctx.match ? ctx.match.trim() : '';
          const fallback = rawText.replace(/^\/start(?:@\w+)?\s*/i, '').trim();
          const payload = match || fallback;

          if (payload.startsWith('link_')) {
            const tokenStr = payload.slice(5).trim();
            const tokenRes = await sails.sendNativeQuery(
              'SELECT * FROM telegram_link_token WHERE token = $1 AND expires_at > NOW()',
              [tokenStr],
            );

            if (tokenRes.rows && tokenRes.rows.length > 0) {
              const linkRecord = tokenRes.rows[0];
              const userId = linkRecord.user_id;

              // Check if this Telegram account is already linked to another Planka user
              const existingWithTg = await sails.sendNativeQuery(
                'SELECT id, name FROM user_account WHERE telegram_user_id = $1 AND id != $2',
                [String(ctx.from.id), userId],
              );
              if (existingWithTg.rows && existingWithTg.rows.length > 0) {
                await ctx.reply(
                  '⚠️ Этот Telegram-аккаунт уже привязан к другому пользователю Planka. Если вы хотите привязать его сюда, сначала отвяжите его с помощью команды /unlink в боте.',
                );
                return;
              }

              await sails.sendNativeQuery(
                `UPDATE user_account
                 SET telegram_user_id = $1, telegram_chat_id = $2, telegram_username = $3
                 WHERE id = $4`,
                [String(ctx.from.id), String(ctx.chat.id), ctx.from.username || null, userId],
              );

              await sails.sendNativeQuery('DELETE FROM telegram_link_token WHERE id = $1', [
                linkRecord.id,
              ]);

              const updatedUser = await User.qm.getOneById(userId);
              sails.sockets.broadcast(`user:${userId}`, 'userUpdate', {
                item: sails.helpers.users.presentOne(updatedUser, updatedUser),
              });

              const keyboard = new InlineKeyboard()
                .webApp('📱 Мои задачи', getMiniAppUrl())
                .url('🌐 Перейти в Planka', getBaseUrl());

              await ctx.reply(
                '✅ <b>Telegram успешно привязан к вашему аккаунту Planka!</b>\n\n' +
                  'Теперь вы будете получать уведомления по назначенным задачам.\n' +
                  'Также вам доступно мини-приложение для просмотра своих задач и быстрого создания новых.',
                { parse_mode: 'HTML', reply_markup: keyboard },
              );
              return;
            }

            await ctx.reply(
              '❌ Ссылка для привязки устарела или недействительна. Сгенерируйте новую ссылку в настройках профиля Planka.',
            );
            return;
          }

          if (payload.startsWith('login_')) {
            const tokenStr = payload.slice(6).trim();
            const tokenRes = await sails.sendNativeQuery(
              'SELECT * FROM telegram_login_token WHERE token = $1 AND expires_at > NOW()',
              [tokenStr],
            );

            if (tokenRes.rows && tokenRes.rows.length > 0) {
              const loginRecord = tokenRes.rows[0];
              const user = await User.qm.getOneByTelegramUserId(String(ctx.from.id));

              if (user && !user.isDeactivated) {
                // Ensure chat_id and username are updated as well
                await sails.sendNativeQuery(
                  `UPDATE user_account
                   SET telegram_chat_id = $1, telegram_username = $2
                   WHERE id = $3`,
                  [String(ctx.chat.id), ctx.from.username || null, user.id],
                );

                const { token: accessToken } = sails.helpers.utils.createJwtToken(user.id);
                await sails.sendNativeQuery(
                  `UPDATE telegram_login_token
                   SET is_confirmed = true, user_id = $1, access_token = $2, telegram_user_id = $3
                   WHERE id = $4`,
                  [user.id, accessToken, String(ctx.from.id), loginRecord.id],
                );

                const keyboard = new InlineKeyboard()
                  .webApp('📱 Мои задачи', getMiniAppUrl())
                  .url('🌐 Перейти в Planka', getBaseUrl());

                await ctx.reply(
                  '✅ <b>Вход в Planka успешно подтверждён!</b>\n\n' +
                    'Вернитесь в браузер — авторизация произойдёт автоматически.',
                  { parse_mode: 'HTML', reply_markup: keyboard },
                );
                return;
              }

              if (user && user.isDeactivated) {
                await sails.sendNativeQuery(
                  `UPDATE telegram_login_token
                   SET telegram_user_id = 'deactivated'
                   WHERE id = $1`,
                  [loginRecord.id],
                );
                await ctx.reply('⚠️ Ваш аккаунт в Planka деактивирован.');
                return;
              }

              // Telegram account not linked to any Planka user
              await sails.sendNativeQuery(
                `UPDATE telegram_login_token
                 SET telegram_user_id = 'not_linked'
                 WHERE id = $1`,
                [loginRecord.id],
              );

              const keyboard = new InlineKeyboard().url('🌐 Открыть страницу входа', getBaseUrl());

              await ctx.reply(
                '⚠️ <b>Этот Telegram-аккаунт ещё не привязан к пользователю Planka.</b>\n\n' +
                  'Сначала выполните вход на сайте по логину и паролю и привяжите Telegram в настройках профиля (или через окно привязки после входа).',
                { parse_mode: 'HTML', reply_markup: keyboard },
              );
              return;
            }

            await ctx.reply('❌ Сессия входа не найдена или устарела. Попробуйте снова на сайте.');
            return;
          }

          const existingUser = await User.qm.getOneByTelegramUserId(String(ctx.from.id));
          if (existingUser) {
            if (
              existingUser.telegramChatId !== String(ctx.chat.id) ||
              existingUser.telegramUsername !== (ctx.from.username || null)
            ) {
              await sails.sendNativeQuery(
                `UPDATE user_account
                 SET telegram_chat_id = $1, telegram_username = $2
                 WHERE id = $3`,
                [String(ctx.chat.id), ctx.from.username || null, existingUser.id],
              );
            }

            const keyboard = new InlineKeyboard()
              .webApp('📱 Мои задачи', getMiniAppUrl())
              .url('🌐 Перейти в Planka', getBaseUrl());

            await ctx.reply(
              `👋 Привет, <b>${escapeHtml(existingUser.name)}</b>!\n\n` +
                'Вы можете открыть свои задачи в Mini App или перейти в веб-версию Planka.',
              { parse_mode: 'HTML', reply_markup: keyboard },
            );
            return;
          }

          const keyboard = new InlineKeyboard().url('🌐 Открыть Planka', getBaseUrl());
          await ctx.reply(
            '👋 Привет!\n\n' +
              'Этот бот интегрирован с системой управления проектами <b>Planka</b>.\n\n' +
              'Чтобы привязать свой Telegram и получать уведомления, войдите в Planka на сайте и нажмите кнопку «Привязать Telegram».',
            { parse_mode: 'HTML', reply_markup: keyboard },
          );
        });

        bot.command(['tasks', 'menu'], async (ctx) => {
          const keyboard = new InlineKeyboard()
            .webApp('📱 Мои задачи', getMiniAppUrl())
            .url('🌐 Перейти в Planka', getBaseUrl());

          await ctx.reply('📌 <b>Меню Planka</b>', {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          });
        });

        bot.command('unlink', async (ctx) => {
          const user = await User.qm.getOneByTelegramUserId(String(ctx.from.id));
          if (!user) {
            await ctx.reply('Ваш Telegram-аккаунт не привязан к Planka.');
            return;
          }

          await sails.sendNativeQuery(
            `UPDATE user_account
             SET telegram_user_id = NULL, telegram_chat_id = NULL, telegram_username = NULL
             WHERE id = $1`,
            [user.id],
          );

          const updatedUser = await User.qm.getOneById(user.id);
          sails.sockets.broadcast(`user:${user.id}`, 'userUpdate', {
            item: sails.helpers.users.presentOne(updatedUser, updatedUser),
          });

          await ctx.reply('✅ Telegram-аккаунт успешно отвязан от Planka.');
        });

        const connectAndRegister = async () => {
          try {
            const me = await bot.api.getMe();
            bot.botInfo = me;
            sails.config.custom.telegramBotUsername = me.username;
            sails.log.info(
              `Telegram hook: Connected to Telegram API as @${me.username} (id: ${me.id})`,
            );

            try {
              await bot.api.setMyCommands([
                { command: 'start', description: 'Начать / личный кабинет' },
                { command: 'tasks', description: 'Мои задачи (Mini App)' },
                { command: 'menu', description: 'Меню Planka' },
                { command: 'unlink', description: 'Отвязать Telegram-аккаунт' },
              ]);
            } catch (cmdErr) {
              sails.log.warn('Telegram hook: Failed to set commands:', cmdErr.message);
            }

            const configMode = sails.config.custom.telegramBotMode || 'auto';
            const baseUrl = getBaseUrl();
            const configuredWebhookUrl = sails.config.custom.telegramWebhookUrl;
            let useWebhook = false;

            if (configMode === 'webhook') {
              useWebhook = true;
            } else if (configMode === 'auto') {
              if (configuredWebhookUrl || baseUrl.startsWith('https://')) {
                useWebhook = true;
              } else {
                sails.log.info(
                  'Telegram hook: BASE_URL is not https, falling back to polling mode',
                );
                useWebhook = false;
              }
            }

            if (useWebhook) {
              const webhookUrl = configuredWebhookUrl || `${baseUrl}/api/telegram/webhook`;
              await bot.api.setWebhook(webhookUrl, {
                drop_pending_updates: false,
                allowed_updates: ['message', 'edited_message', 'callback_query'],
              });
              const info = await bot.api.getWebhookInfo();
              sails.log.info(
                `Telegram hook: Webhook registered at ${webhookUrl} (pending updates: ${info.pending_update_count}, last error: ${info.last_error_message || 'none'})`,
              );
            } else {
              try {
                await bot.api.deleteWebhook({ drop_pending_updates: false });
              } catch (delErr) {
                /* empty */
              }
              bot.start({
                allowed_updates: ['message', 'edited_message', 'callback_query'],
                onStart: (info) => {
                  sails.log.info(`Telegram hook: Bot @${info.username} started in polling mode`);
                },
              });
            }

            if (retryTimer) {
              clearTimeout(retryTimer);
              retryTimer = null;
            }
          } catch (err) {
            retryAttempt += 1;
            const delay = Math.min(30, retryAttempt * 5) * 1000;
            sails.log.warn(
              `Telegram hook: Connection to Telegram API failed (${err.message}). Retrying in ${delay / 1000}s...`,
            );
            retryTimer = setTimeout(connectAndRegister, delay);
          }
        };

        connectAndRegister();

        dueDateInterval = setInterval(checkDueDates, 60 * 1000);
        dailyDigestInterval = setInterval(checkDailyDigests, 60 * 1000);

        setTimeout(() => {
          checkDueDates();
          checkDailyDigests();
        }, 10 * 1000);
      } catch (err) {
        sails.log.error('Failed to initialize Telegram hook:', err);
      }
    },

    async teardown() {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      if (dueDateInterval) {
        clearInterval(dueDateInterval);
      }
      if (dailyDigestInterval) {
        clearInterval(dailyDigestInterval);
      }
      if (bot) {
        try {
          await bot.stop();
        } catch (err) {
          /* empty */
        }
      }
    },
  };
};
