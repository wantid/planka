/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const defaultFind = (criteria, { sort = 'id' } = {}) => Board.find(criteria).sort(sort);

/* Query methods */

const createOne = (values, { user } = {}) =>
  sails.getDatastore().transaction(async (db) => {
    const board = await Board.create({ ...values })
      .fetch()
      .usingConnection(db);

    const boardMembership = await BoardMembership.create({
      projectId: board.projectId,
      boardId: board.id,
      userId: user.id,
      role: BoardMembership.Roles.EDITOR,
    })
      .fetch()
      .usingConnection(db);

    const lists = await List.createEach(
      [List.Types.ARCHIVE, List.Types.TRASH].map((type) => ({
        type,
        boardId: board.id,
      })),
    )
      .fetch()
      .usingConnection(db);

    return { board, boardMembership, lists };
  });

const getByIds = (ids, { exceptProjectIdOrIds } = {}) => {
  if (!ids || (Array.isArray(ids) && ids.length === 0)) {
    return Promise.resolve([]);
  }

  const criteria = {
    id: ids,
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

const getByProjectId = (projectId, { exceptIdOrIds, sort = ['position', 'id'] } = {}) => {
  const criteria = {
    projectId,
  };

  if (exceptIdOrIds && (!Array.isArray(exceptIdOrIds) || exceptIdOrIds.length > 0)) {
    criteria.id = {
      '!=': exceptIdOrIds,
    };
  }

  return defaultFind(criteria, { sort });
};

const getByProjectIds = (projectIds, { sort = ['position', 'id'] } = {}) => {
  if (!projectIds || (Array.isArray(projectIds) && projectIds.length === 0)) {
    return Promise.resolve([]);
  }

  return defaultFind(
    {
      projectId: projectIds,
    },
    { sort },
  );
};

const getOneById = (id) => Board.findOne(id);

const updateOne = (criteria, values) => Board.updateOne(criteria).set({ ...values });

// eslint-disable-next-line no-underscore-dangle
const delete_ = (criteria) => Board.destroy(criteria).fetch();

const deleteOne = (criteria) => Board.destroyOne(criteria);

module.exports = {
  createOne,
  getByIds,
  getByProjectId,
  getByProjectIds,
  getOneById,
  updateOne,
  deleteOne,
  delete: delete_,
};
