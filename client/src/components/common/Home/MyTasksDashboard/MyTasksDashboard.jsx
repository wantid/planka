/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Icon } from 'semantic-ui-react';

import selectors from '../../../../selectors';
import { MyTasksIcon } from '../../../../constants/Icons';
import MyTasksProjectColumn from './MyTasksProjectColumn';

import styles from './MyTasksDashboard.module.scss';

const MyTasksDashboard = React.memo(() => {
  const [t] = useTranslation();
  const projectGroups = useSelector(selectors.selectMyTaskProjectGroups);

  return (
    <div className={styles.wrapper}>
      <div className={styles.title}>
        <Icon name={MyTasksIcon} className={styles.titleIcon} />
        {t('common.myTasks', {
          context: 'title',
        })}
      </div>
      {projectGroups.length === 0 ? (
        <p className={styles.empty}>{t('common.noTasks')}</p>
      ) : (
        <div className={styles.board}>
          <div className={styles.columns}>
            {projectGroups.map(({ projectId, cardIds }) => (
              <MyTasksProjectColumn key={projectId} projectId={projectId} cardIds={cardIds} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default MyTasksDashboard;
