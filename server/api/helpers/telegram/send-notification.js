/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { InlineKeyboard } = require('grammy');
const escapeHtml = require('escape-html');
const { mentionMarkupToText } = require('../../../utils/mentions');

const buildTitle = (notification, t) => {
  switch (notification.type) {
    case Notification.Types.MOVE_CARD:
      return t('Card Moved');
    case Notification.Types.COMMENT_CARD:
      return t('New Comment');
    case Notification.Types.ADD_MEMBER_TO_CARD:
      return t('You Were Added to Card');
    case Notification.Types.MENTION_IN_COMMENT:
      return t('You Were Mentioned in Comment');
    default:
      return null;
  }
};

const buildBody = (board, card, notification, actorUser, t) => {
  const baseUrl = (sails.config.custom.baseUrl || 'http://localhost:1337').replace(/\/$/, '');
  const htmlCardLink = `<a href="${baseUrl}/cards/${card.id}">${escapeHtml(card.name)}</a>`;
  const actorName = (actorUser && actorUser.name) || 'Planka';

  switch (notification.type) {
    case Notification.Types.MOVE_CARD: {
      const fromListName = sails.helpers.lists.resolveName(notification.data.fromList, t);
      const toListName = sails.helpers.lists.resolveName(notification.data.toList, t);

      return t(
        '%s moved %s from %s to %s on %s',
        escapeHtml(actorName),
        htmlCardLink,
        `<b>${escapeHtml(fromListName)}</b>`,
        `<b>${escapeHtml(toListName)}</b>`,
        escapeHtml(board.name),
      );
    }
    case Notification.Types.COMMENT_CARD: {
      const commentText = _.truncate(mentionMarkupToText(notification.data.text));

      return `${t(
        '%s left a new comment to %s on %s',
        escapeHtml(actorName),
        htmlCardLink,
        escapeHtml(board.name),
      )}:\n\n<i>${escapeHtml(commentText)}</i>`;
    }
    case Notification.Types.ADD_MEMBER_TO_CARD:
      return t(
        '%s added you to %s on %s',
        escapeHtml(actorName),
        htmlCardLink,
        escapeHtml(board.name),
      );
    case Notification.Types.MENTION_IN_COMMENT: {
      const commentText = _.truncate(mentionMarkupToText(notification.data.text));

      return `${t(
        '%s mentioned you in %s on %s',
        escapeHtml(actorName),
        htmlCardLink,
        escapeHtml(board.name),
      )}:\n\n<i>${escapeHtml(commentText)}</i>`;
    }
    default:
      return null;
  }
};

module.exports = {
  inputs: {
    board: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
      required: true,
    },
    notification: {
      type: 'ref',
      required: true,
    },
    actorUser: {
      type: 'ref',
      required: true,
    },
    notifiableUser: {
      type: 'ref',
      required: true,
    },
  },

  async fn(inputs) {
    const telegramHook = sails.hooks.telegram;
    if (!telegramHook) {
      return;
    }

    const bot = telegramHook.getBot();
    if (!bot || !inputs.notifiableUser || !inputs.notifiableUser.telegramChatId) {
      return;
    }

    try {
      const t = sails.helpers.utils.makeTranslator(inputs.notifiableUser.language);
      const title = buildTitle(inputs.notification, t);
      const bodyHtml = buildBody(
        inputs.board,
        inputs.card,
        inputs.notification,
        inputs.actorUser,
        t,
      );

      if (!title || !bodyHtml) {
        return;
      }

      const emojiByType = {
        [Notification.Types.ADD_MEMBER_TO_CARD]: '👤',
        [Notification.Types.COMMENT_CARD]: '💬',
        [Notification.Types.MENTION_IN_COMMENT]: '📣',
        [Notification.Types.MOVE_CARD]: '🔄',
      };
      const icon = emojiByType[inputs.notification.type] || '🔔';

      const message = `${icon} <b>${escapeHtml(title)}</b>\n\n${bodyHtml}`;

      const baseUrl = (sails.config.custom.baseUrl || 'http://localhost:1337').replace(/\/$/, '');
      const miniAppUrl = `${baseUrl}/tg-app`;
      const cardUrl = `${baseUrl}/cards/${inputs.card.id}`;

      const keyboard = new InlineKeyboard();
      if (miniAppUrl.startsWith('https:')) {
        keyboard.webApp('📱 Мои задачи', miniAppUrl);
      }
      keyboard.url('🌐 Открыть карточку', cardUrl);

      await bot.api.sendMessage(inputs.notifiableUser.telegramChatId, message, {
        parse_mode: 'HTML',
        reply_markup: keyboard,
      });
    } catch (error) {
      sails.log.warn(
        `Failed to forward notification to Telegram (user ${inputs.notifiableUser.id}):`,
        error.message,
      );
    }
  },
};
