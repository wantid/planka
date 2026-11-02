/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
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

const TelegramTaskItem = React.memo(({ card, project, board, list }) => {
  const dueInfo = formatDueDateChip(card.dueDate);

  return (
    <div className={styles.cardItem}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>{card.name}</div>
      </div>

      <div className={styles.badges}>
        {project && <span className={styles.projectBadge}>{project.name}</span>}
        {board && (
          <span className={styles.listBadge}>
            {board.name} • {list?.name || 'Список'}
          </span>
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
});

TelegramTaskItem.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
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
};

TelegramTaskItem.defaultProps = {
  project: null,
  board: null,
  list: null,
};

export default TelegramTaskItem;
