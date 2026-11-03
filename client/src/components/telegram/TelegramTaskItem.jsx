/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { updateCardList } from '../../api/telegram';
import styles from './TelegramMiniApp.module.scss';

const formatDueDateChip = (dueDate) => {
  if (!dueDate) {
    return null;
  }
  const date = new Date(dueDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = Date.now();
  const time = date.getTime();
  const diffHours = (time - now) / (1000 * 3600);

  let statusClass = '';
  let statusText = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  if (diffHours < 0) {
    statusClass = styles.overdue;
    statusText = `Просрочено (${statusText})`;
  } else if (diffHours < 24) {
    statusClass = styles.dueSoon;
    statusText = `Сегодня (${statusText})`;
  }

  return {
    className: statusClass,
    text: statusText,
  };
};

const TelegramTaskItem = React.memo(
  ({ card, project, board, list, availableLists, onListChange }) => {
    const [updatingStage, setUpdatingStage] = useState(false);
    const dueInfo = formatDueDateChip(card.dueDate);

    const handleCardClick = useCallback(
      (e) => {
        // Prevent opening card URL if user tapped on the stage dropdown or other control
        if (e.target.closest('[data-prevent-card-click="true"]')) {
          return;
        }

        const cardUrl = `${window.location.origin}/cards/${card.id}`;
        const tg = window.Telegram?.WebApp;
        if (tg && typeof tg.openLink === 'function') {
          tg.openLink(cardUrl);
        } else {
          window.open(cardUrl, '_blank', 'noopener,noreferrer');
        }
      },
      [card.id],
    );

    const handleStageChange = useCallback(
      async (e) => {
        const nextListId = e.target.value;
        if (!nextListId || nextListId === card.listId) {
          return;
        }

        setUpdatingStage(true);
        if (onListChange) {
          onListChange(card.id, nextListId);
        }

        try {
          await updateCardList(card.id, nextListId);
          if (window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Failed to change stage:', err);
          // Rollback if needed
          if (onListChange) {
            onListChange(card.id, card.listId);
          }
        } finally {
          setUpdatingStage(false);
        }
      },
      [card.id, card.listId, onListChange],
    );

    return (
      <div
        className={styles.cardItem}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCardClick(e);
          }
        }}
      >
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>{card.name}</div>
          <span className={styles.openCardIcon} title="Открыть в Planka">
            ↗
          </span>
        </div>

        <div className={styles.badges}>
          {project && <span className={styles.projectBadge}>{project.name}</span>}
          {board && <span className={styles.boardBadge}>{board.name}</span>}

          {/* Interactive Stage (List) Selector */}
          {availableLists && availableLists.length > 0 ? (
            <div className={styles.stageSelectWrapper} data-prevent-card-click="true">
              <select
                className={styles.stageSelect}
                value={card.listId}
                onChange={handleStageChange}
                disabled={updatingStage}
                aria-label="Изменить стадию задачи"
              >
                {availableLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <span
                className={classNames(styles.stageBadge, updatingStage && styles.stageBadgeLoading)}
              >
                <span className={styles.stageDot} />
                <span>{list?.name || 'Стадия'}</span>
                <span className={styles.stageArrow}>▼</span>
              </span>
            </div>
          ) : (
            list && <span className={styles.listBadge}>{list.name}</span>
          )}
        </div>

        {dueInfo && (
          <div className={styles.cardFooter}>
            <span className={classNames(styles.dueDateChip, dueInfo.className)}>
              📅 {dueInfo.text}
            </span>
          </div>
        )}
      </div>
    );
  },
);

TelegramTaskItem.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    listId: PropTypes.string.isRequired,
    dueDate: PropTypes.string,
    isDueCompleted: PropTypes.bool,
  }).isRequired,
  project: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  }),
  board: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  }),
  list: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  }),
  availableLists: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
    }),
  ),
  onListChange: PropTypes.func,
};

TelegramTaskItem.defaultProps = {
  project: null,
  board: null,
  list: null,
  availableLists: [],
  onListChange: null,
};

export default TelegramTaskItem;
