/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import { call, select } from 'redux-saga/effects';

import request from '../request';
import selectors from '../../../selectors';
import api from '../../../api';
import mergeRecords from '../../../utils/merge-records';
import Paths from '../../../constants/Paths';

export function* fetchCardAndBoard(cardId, { skipBoardFetch = false } = {}) {
  let card;
  let board;
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

  try {
    ({
      item: card,
      included: {
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
    } = yield call(request, api.getCard, cardId));
  } catch {
    return {
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
    };
  }

  if (!card) {
    return {
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
    };
  }

  if (skipBoardFetch) {
    return {
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
    };
  }

  const boardModel = yield select(selectors.selectBoardById, card.boardId);

  if (boardModel && boardModel.view != null) {
    return {
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
    };
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
        users: users2,
        cardMemberships: cardMemberships2,
        cardLabels: cardLabels2,
        taskLists: taskLists2,
        tasks: tasks2,
        attachments: attachments2,
        customFieldGroups: customFieldGroups2,
        customFields: customFields2,
        customFieldValues: customFieldValues2,
      },
    } = yield call(request, api.getBoard, card.boardId, true));
  } catch {
    /* empty */
  }

  return {
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
  };
}

export function* fetchBoardByCurrentPath() {
  const pathsMatch = yield select(selectors.selectPathsMatch);

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

  if (pathsMatch) {
    let boardId;
    if (pathsMatch.pattern.path === Paths.BOARDS) {
      boardId = pathsMatch.params.id;
    } else if (pathsMatch.pattern.path === Paths.CARDS) {
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
      } = yield call(fetchCardAndBoard, pathsMatch.params.id));

      return {
        board,
        card,
        boardMemberships,
        labels,
        lists,
        cards,
        project: projects && projects[0],
        users: mergeRecords(users1, users2),
        cardMemberships: mergeRecords(cardMemberships1, cardMemberships2),
        cardLabels: mergeRecords(cardLabels1, cardLabels2),
        taskLists: mergeRecords(taskLists1, taskLists2),
        tasks: mergeRecords(tasks1, tasks2),
        attachments: mergeRecords(attachments1, attachments2),
        customFieldGroups: mergeRecords(customFieldGroups1, customFieldGroups2),
        customFields: mergeRecords(customFields1, customFields2),
        customFieldValues: mergeRecords(customFieldValues1, customFieldValues2),
      };
    }

    if (boardId) {
      ({
        item: board,
        included: {
          projects,
          boardMemberships,
          labels,
          lists,
          cards,
          users: users2,
          cardMemberships: cardMemberships2,
          cardLabels: cardLabels2,
          taskLists: taskLists2,
          tasks: tasks2,
          attachments: attachments2,
          customFieldGroups: customFieldGroups2,
          customFields: customFields2,
          customFieldValues: customFieldValues2,
        },
      } = yield call(request, api.getBoard, boardId, true));
    }
  }

  return {
    board,
    card,
    boardMemberships,
    labels,
    lists,
    cards,
    project: projects && projects[0],
    users: mergeRecords(users1, users2),
    cardMemberships: mergeRecords(cardMemberships1, cardMemberships2),
    cardLabels: mergeRecords(cardLabels1, cardLabels2),
    taskLists: mergeRecords(taskLists1, taskLists2),
    tasks: mergeRecords(tasks1, tasks2),
    attachments: mergeRecords(attachments1, attachments2),
    customFieldGroups: mergeRecords(customFieldGroups1, customFieldGroups2),
    customFields: mergeRecords(customFields1, customFields2),
    customFieldValues: mergeRecords(customFieldValues1, customFieldValues2),
  };
}

export default {
  fetchBoardByCurrentPath,
  fetchCardAndBoard,
};
