/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, put, select, take } from 'redux-saga/effects';
import { push } from '../../../lib/redux-router';

import { logout } from './core';
import request from '../request';
import { fetchCardAndBoard } from '../requests/boards';
import selectors from '../../../selectors';
import actions from '../../../actions';
import api from '../../../api';
import { getAccessToken } from '../../../utils/access-token-storage';
import mergeRecords from '../../../utils/merge-records';
import ActionTypes from '../../../constants/ActionTypes';
import Paths from '../../../constants/Paths';

function* resetStuckBoardFetch(boardId) {
  if (!boardId) {
    return;
  }

  const boardModel = yield select(selectors.selectBoardById, boardId);

  if (boardModel && boardModel.isFetching) {
    yield put(actions.fetchBoard.failure(boardId));
  }
}

export function* goTo(pathname) {
  yield put(push(pathname));
}

export function* goToRoot() {
  yield call(goTo, Paths.ROOT);
}

export function* goToProject(projectId) {
  yield call(goTo, Paths.PROJECTS.replace(':id', projectId));
}

export function* goToBoard(boardId) {
  yield call(goTo, Paths.BOARDS.replace(':id', boardId));
}

export function* goToCard(cardId) {
  yield call(goTo, Paths.CARDS.replace(':id', cardId));
}

export function* handleLocationChange() {
  const accessToken = yield call(getAccessToken);

  if (!accessToken) {
    yield call(logout, false);
    return;
  }

  const pathsMatch = yield select(selectors.selectPathsMatch);

  if (!pathsMatch) {
    yield put(actions.handleLocationChange());
    return;
  }

  const pathnameAtStart = pathsMatch.pathname;
  let contentFetchStarted = false;
  let contentFetchGeneration = null;

  switch (pathsMatch.pattern.path) {
    case Paths.LOGIN:
      yield call(goToRoot);

      break;
    default:
  }

  const isInitializing = yield select(selectors.selectIsInitializing);

  if (isInitializing) {
    yield take(ActionTypes.CORE_INITIALIZE);
  }

  let currentBoardId = null;
  let currentCardId = null;
  let isEditModeEnabled;
  let board;
  let card;
  let users1;
  let users2;
  let projects;
  let boardMemberships;
  let labels;
  let lists;
  let cards;
  let cardMemberships1;
  let cardMemberships2;
  let cardLabels1;
  let cardLabels2;
  let taskLists1;
  let taskLists2;
  let tasks1;
  let tasks2;
  let attachments1;
  let attachments2;
  let customFieldGroups1;
  let customFieldGroups2;
  let customFields1;
  let customFields2;
  let customFieldValues1;
  let customFieldValues2;
  let notificationsToDelete;

  try {
    switch (pathsMatch.pattern.path) {
      case Paths.ROOT: {
        isEditModeEnabled = false;

        const { boardId } = yield select(({ core }) => ({
          boardId: core.boardId,
        }));

        yield call(resetStuckBoardFetch, boardId);

        break;
      }
      case Paths.PROJECTS: {
        const boardIds = yield select(selectors.selectBoardIdsForCurrentProject);

        if (boardIds && boardIds.length === 0) {
          isEditModeEnabled = true;
        }

        const { boardId } = yield select(({ core }) => ({
          boardId: core.boardId,
        }));

        yield call(resetStuckBoardFetch, boardId);

        break;
      }
      case Paths.BOARDS: {
        ({ id: currentBoardId } = pathsMatch.params);

        const boardModelForFetch = yield select(selectors.selectBoardById, currentBoardId);
        const shouldFetchBoard = !boardModelForFetch || boardModelForFetch.view == null;

        if (shouldFetchBoard) {
          yield put(actions.handleLocationChange.fetchContent());
          contentFetchStarted = true;
          contentFetchGeneration = yield select(({ core }) => core.contentFetchGeneration);

          if (!boardModelForFetch || boardModelForFetch.isFetching === null) {
            yield put(actions.handleLocationChange.fetchBoard(currentBoardId));
          }

          try {
            ({
              item: board,
              included: {
                projects,
                boardMemberships,
                labels,
                lists,
                cards,
                users: users1,
                cardMemberships: cardMemberships1,
                cardLabels: cardLabels1,
                taskLists: taskLists1,
                tasks: tasks1,
                attachments: attachments1,
                customFieldGroups: customFieldGroups1,
                customFields: customFields1,
                customFieldValues: customFieldValues1,
              },
            } = yield call(request, api.getBoard, currentBoardId, true));
          } catch {
            yield put(actions.fetchBoard.failure(currentBoardId));
          }
        }

        break;
      }
      case Paths.CARDS: {
        ({ cardId: currentCardId, boardId: currentBoardId } = yield select(selectors.selectPath));

        const boardModelForFetch = currentBoardId
          ? yield select(selectors.selectBoardById, currentBoardId)
          : null;
        const needsBoardFetch = !boardModelForFetch || boardModelForFetch.view == null;

        if (needsBoardFetch) {
          yield put(actions.handleLocationChange.fetchContent());
          contentFetchStarted = true;
          contentFetchGeneration = yield select(({ core }) => core.contentFetchGeneration);
        }

        ({
          card,
          board,
          users1,
          users2,
          projects,
          boardMemberships,
          labels,
          lists,
          cards,
          cardMemberships1,
          cardMemberships2,
          cardLabels1,
          cardLabels2,
          taskLists1,
          taskLists2,
          tasks1,
          tasks2,
          attachments1,
          attachments2,
          customFieldGroups1,
          customFieldGroups2,
          customFields1,
          customFields2,
          customFieldValues1,
          customFieldValues2,
        } = yield call(fetchCardAndBoard, pathsMatch.params.id, {
          skipBoardFetch: !needsBoardFetch,
        }));

        if (card) {
          ({ id: currentCardId, boardId: currentBoardId } = card);
        }

        if (card && needsBoardFetch && !board) {
          yield put(actions.fetchBoard.failure(card.boardId));
        }

        if (currentCardId) {
          const notificationIds = yield select(
            selectors.selectNotificationIdsByCardId,
            currentCardId,
          );

          if (notificationIds.length > 0) {
            try {
              ({
                included: { notifications: notificationsToDelete },
              } = yield call(request, api.readCardNotifications, currentCardId));
            } catch {
              /* empty */
            }
          }
        }

        break;
      }
      default:
    }

    const pathsMatchAtEnd = yield select(selectors.selectPathsMatch);

    if (
      !pathsMatchAtEnd ||
      pathsMatchAtEnd.pathname !== pathnameAtStart ||
      pathsMatchAtEnd.pattern.path !== pathsMatch.pattern.path
    ) {
      if (contentFetchStarted && contentFetchGeneration !== null) {
        yield put(actions.handleLocationChange.cancelContentFetch(contentFetchGeneration));
      } else if (yield select(({ core }) => core.isContentFetching)) {
        const generation = yield select(({ core }) => core.contentFetchGeneration);
        yield put(actions.handleLocationChange.cancelContentFetch(generation));
      }

      return;
    }

    yield put(
      actions.handleLocationChange(
        pathsMatch.pathname,
        currentBoardId,
        currentCardId,
        isEditModeEnabled,
        board,
        mergeRecords(users1, users2),
        projects,
        boardMemberships,
        labels,
        lists,
        mergeRecords(card && [card], cards),
        mergeRecords(cardMemberships1, cardMemberships2),
        mergeRecords(cardLabels1, cardLabels2),
        mergeRecords(taskLists1, taskLists2),
        mergeRecords(tasks1, tasks2),
        mergeRecords(attachments1, attachments2),
        mergeRecords(customFieldGroups1, customFieldGroups2),
        mergeRecords(customFields1, customFields2),
        mergeRecords(customFieldValues1, customFieldValues2),
        notificationsToDelete,
      ),
    );
  } catch {
    if (contentFetchStarted && contentFetchGeneration !== null) {
      yield put(actions.handleLocationChange.cancelContentFetch(contentFetchGeneration));
    } else if (yield select(({ core }) => core.isContentFetching)) {
      const generation = yield select(({ core }) => core.contentFetchGeneration);
      yield put(actions.handleLocationChange.cancelContentFetch(generation));
    }
  }
}

export default {
  goTo,
  goToRoot,
  goToProject,
  goToBoard,
  goToCard,
  handleLocationChange,
};
