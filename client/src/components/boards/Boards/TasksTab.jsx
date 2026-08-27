/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { useSelector } from 'react-redux';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import selectors from '../../../selectors';
import Paths from '../../../constants/Paths';

import styles from './Item.module.scss';

const TasksTab = React.memo(({ projectId }) => {
  const [t] = useTranslation();
  const isActive = useSelector(selectors.selectIsProjectTasksView);

  return (
    <div className={styles.wrapper}>
      <div className={classNames(styles.tab, isActive && styles.tabActive)}>
        <Link
          to={Paths.PROJECTS.replace(':id', projectId)}
          title={t('common.myTasks', {
            context: 'title',
          })}
          className={styles.link}
        >
          <span className={styles.name}>
            {t('common.myTasks', {
              context: 'title',
            })}
          </span>
        </Link>
      </div>
    </div>
  );
});

TasksTab.propTypes = {
  projectId: PropTypes.string.isRequired,
};

export default TasksTab;
