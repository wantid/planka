/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import MyTasksBoardColumn from '../../common/Home/MyTasksDashboard/MyTasksBoardColumn';
import dashboardStyles from '../../common/Home/MyTasksDashboard/MyTasksDashboard.module.scss';

import styles from './ProjectTasksDashboard.module.scss';

const ProjectTasksDashboard = React.memo(() => {
  const [t] = useTranslation();
  const boardGroups = useSelector(selectors.selectMyTaskBoardGroupsForCurrentProject);

  return (
    <div className={styles.wrapper}>
      {boardGroups.length === 0 ? (
        <p className={dashboardStyles.empty}>{t('common.noTasks')}</p>
      ) : (
        <div className={dashboardStyles.board}>
          <div className={dashboardStyles.columns}>
            {boardGroups.map(({ boardId, cardIds }) => (
              <MyTasksBoardColumn key={boardId} boardId={boardId} cardIds={cardIds} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ProjectTasksDashboard;
