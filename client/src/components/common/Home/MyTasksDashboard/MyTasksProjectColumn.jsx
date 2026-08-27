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

import selectors from '../../../../selectors';
import Paths from '../../../../constants/Paths';
import { ProjectBackgroundTypes } from '../../../../constants/Enums';
import MyTasksDashboardItem from './MyTasksDashboardItem';
import globalStyles from '../../../../styles.module.scss';

import styles from './MyTasksDashboard.module.scss';

const MyTasksProjectColumn = React.memo(({ projectId, cardIds }) => {
  const selectProjectById = useMemo(() => selectors.makeSelectProjectById(), []);
  const selectFirstBoardIdByProjectId = useMemo(
    () => selectors.makeSelectFirstBoardIdByProjectId(),
    [],
  );

  const project = useSelector((state) => selectProjectById(state, projectId));
  const firstBoardId = useSelector((state) => selectFirstBoardIdByProjectId(state, projectId));

  if (!project) {
    return null;
  }

  const boardPath = firstBoardId
    ? Paths.BOARDS.replace(':id', firstBoardId)
    : Paths.PROJECTS.replace(':id', projectId);
  const isProjectGradient = project.backgroundType === ProjectBackgroundTypes.GRADIENT;

  return (
    <div className={styles.column}>
      <div className={styles.columnInner}>
        <Link
          to={boardPath}
          className={classNames(
            styles.columnHeader,
            isProjectGradient &&
              globalStyles[`background${upperFirst(camelCase(project.backgroundGradient))}`],
            isProjectGradient && styles.columnHeaderOnGradient,
          )}
        >
          {project.name}
        </Link>
        <div className={styles.columnCards}>
          {cardIds.map((cardId) => (
            <MyTasksDashboardItem key={cardId} cardId={cardId} />
          ))}
        </div>
      </div>
    </div>
  );
});

MyTasksProjectColumn.propTypes = {
  projectId: PropTypes.string.isRequired,
  cardIds: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
};

export default MyTasksProjectColumn;
