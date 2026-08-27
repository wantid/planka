/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import upperFirst from 'lodash/upperFirst';
import camelCase from 'lodash/camelCase';
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import Paths from '../../../../constants/Paths';
import DueDateChip from '../../../cards/DueDateChip';
import UserAvatar from '../../../users/UserAvatar';
import CustomFieldValueChip from '../../../custom-field-values/CustomFieldValueChip';
import globalStyles from '../../../../styles.module.scss';

import styles from './MyTasksDashboard.module.scss';

const MyTasksDashboardItem = React.memo(({ cardId, showBoardMeta = true }) => {
  const [t] = useTranslation();

  const selectCardById = useMemo(() => selectors.makeSelectCardById(), []);
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);
  const selectListById = useMemo(() => selectors.makeSelectListById(), []);
  const selectUserIdsByCardId = useMemo(() => selectors.makeSelectUserIdsByCardId(), []);
  const selectShownOnFrontOfCardCustomFieldValueIdsByCardId = useMemo(
    () => selectors.makeSelectShownOnFrontOfCardCustomFieldValueIdsByCardId(),
    [],
  );
  const selectNotificationsTotalByCardId = useMemo(
    () => selectors.makeSelectNotificationsTotalByCardId(),
    [],
  );

  const card = useSelector((state) => selectCardById(state, cardId));
  const board = useSelector((state) => selectBoardById(state, card?.boardId));
  const list = useSelector((state) => selectListById(state, card?.listId));
  const userIds = useSelector((state) => selectUserIdsByCardId(state, cardId));
  const customFieldValueIds = useSelector((state) =>
    selectShownOnFrontOfCardCustomFieldValueIdsByCardId(state, cardId),
  );
  const notificationsTotal = useSelector((state) =>
    selectNotificationsTotalByCardId(state, cardId),
  );

  if (!card || !board || !list) {
    return null;
  }

  const cardPath = Paths.CARDS.replace(':id', cardId);
  const boardPath = Paths.BOARDS.replace(':id', board.id);

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <Link to={cardPath} className={styles.name}>
          {card.name}
        </Link>
        <div className={styles.mainRight}>
          {card.dueDate && (
            <DueDateChip
              value={card.dueDate}
              size="small"
              isCompleted={card.isDueCompleted}
              withStatus
            />
          )}
          {notificationsTotal > 0 && (
            <span className={styles.notification}>{notificationsTotal}</span>
          )}
        </div>
      </div>
      {customFieldValueIds.length > 0 && (
        <div className={styles.customFields}>
          {customFieldValueIds.map((customFieldValueId) => (
            <CustomFieldValueChip key={customFieldValueId} id={customFieldValueId} size="tiny" />
          ))}
        </div>
      )}
      <div className={styles.meta}>
        {showBoardMeta && (
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>{t('common.table')}:</span>
            <Link to={boardPath} className={styles.metaButton}>
              {board.name}
            </Link>
          </span>
        )}
        <span className={styles.metaItem}>
          <span className={styles.metaLabel}>{t('common.list')}:</span>
          <Link
            to={boardPath}
            className={classNames(
              styles.metaButton,
              list.color && globalStyles[`background${upperFirst(camelCase(list.color))}Soft`],
            )}
          >
            {list.color && (
              <Icon
                name="circle"
                className={classNames(
                  styles.metaButtonColor,
                  globalStyles[`color${upperFirst(camelCase(list.color))}`],
                )}
              />
            )}
            {list.name}
          </Link>
        </span>
      </div>
      {userIds.length > 0 && (
        <div className={styles.footer}>
          <div className={styles.users}>
            {userIds.map((userId) => (
              <UserAvatar key={userId} id={userId} size="small" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

MyTasksDashboardItem.propTypes = {
  cardId: PropTypes.string.isRequired,
  showBoardMeta: PropTypes.bool,
};

MyTasksDashboardItem.defaultProps = {
  showBoardMeta: false,
};

export default MyTasksDashboardItem;
