/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import { Link } from 'react-router';

import selectors from '../../../../selectors';
import Paths from '../../../../constants/Paths';
import MyTasksDashboardItem from './MyTasksDashboardItem';

import styles from './MyTasksDashboard.module.scss';

const MyTasksBoardColumn = React.memo(({ boardId, cardIds }) => {
  const selectBoardById = useMemo(() => selectors.makeSelectBoardById(), []);

  const board = useSelector((state) => selectBoardById(state, boardId));

  if (!board) {
    return null;
  }

  const boardPath = Paths.BOARDS.replace(':id', boardId);

  return (
    <div className={styles.column}>
      <div className={styles.columnInner}>
        <Link to={boardPath} className={styles.columnHeader}>
          {board.name}
        </Link>
        <div className={styles.columnCards}>
          {cardIds.map((cardId) => (
            <MyTasksDashboardItem key={cardId} cardId={cardId} showBoardMeta={false} />
          ))}
        </div>
      </div>
    </div>
  );
});

MyTasksBoardColumn.propTypes = {
  boardId: PropTypes.string.isRequired,
  cardIds: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default MyTasksBoardColumn;
