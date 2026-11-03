/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria) => BoardMembership.find(criteria).sort('id');

/* Query methods */

const createOne = (values) => BoardMembership.create({ ...values }).fetch();

const getByIds = (ids) => defaultFind(ids);

const getByProjectId = (projectId) =>
  defaultFind({
    projectId,
  });

const getByProjectIdAndUserId = (projectId, userId) =>
  defaultFind({
    projectId,
    userId,
  });

const getByProjectIds = (projectIds) => {
  if (!projectIds || (Array.isArray(projectIds) && projectIds.length === 0)) {
    return Promise.resolve([]);
  }

  return defaultFind({
    projectId: projectIds,
  });
};

const getByBoardId = (boardId) =>
  defaultFind({
    boardId,
  });

const getByBoardIds = (boardIds, { exceptUserIdOrIds } = {}) => {
  if (!boardIds || (Array.isArray(boardIds) && boardIds.length === 0)) {
    return Promise.resolve([]);
  }

  const criteria = {
    boardId: boardIds,
  };

  if (exceptUserIdOrIds && (!Array.isArray(exceptUserIdOrIds) || exceptUserIdOrIds.length > 0)) {
    criteria.userId = {
      '!=': exceptUserIdOrIds,
    };
  }

  return defaultFind(criteria);
};

const getByBoardIdsAndUserId = (boardIds, userId) =>
  defaultFind({
    userId,
    boardId: boardIds,
  });

const getByUserId = (userId, { exceptProjectIdOrIds } = {}) => {
  const criteria = {
    userId,
  };

  if (
    exceptProjectIdOrIds &&
    (!Array.isArray(exceptProjectIdOrIds) || exceptProjectIdOrIds.length > 0)
  ) {
    criteria.projectId = {
      '!=': exceptProjectIdOrIds,
    };
  }

  return defaultFind(criteria);
};

const getOneById = (id) => BoardMembership.findOne(id);

const getOneByBoardIdAndUserId = (boardId, userId) =>
  BoardMembership.findOne({
    boardId,
    userId,
  });

const updateOne = async (criteria, values) =>
  BoardMembership.updateOne(criteria).set({ ...values });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => BoardMembership.destroy(criteria).fetch();

const deleteOne = (criteria) => BoardMembership.destroyOne(criteria);

module.exports = {
  createOne,
  getByIds,
  getByProjectId,
  getByProjectIdAndUserId,
  getByProjectIds,
  getByBoardId,
  getByBoardIds,
  getByBoardIdsAndUserId,
  getByUserId,
  getOneById,
  getOneByBoardIdAndUserId,
  updateOne,
  deleteOne,
  delete: delete_,
};
