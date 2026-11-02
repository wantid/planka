/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  inputs: {
    listId: {
      type: 'string',
      required: true,
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 1024,
    },
    description: {
      type: 'string',
      maxLength: 1048576,
      allowNull: true,
    },
    dueDate: {
      type: 'string',
      allowNull: true,
    },
    userIds: {
      type: 'ref',
    },
  },

  exits: {
    listNotFound: {
      responseType: 'notFound',
    },
    notEnoughRights: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let pathInfo;
    try {
      pathInfo = await sails.helpers.lists.getPathToProjectById(inputs.listId);
    } catch (err) {
      throw 'listNotFound';
    }

    const { list, board, project } = pathInfo;

    const isManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);
    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );

    const canEdit =
      isManager ||
      currentUser.role === User.Roles.ADMIN ||
      (boardMembership && boardMembership.role === BoardMembership.Roles.EDITOR);

    if (!canEdit) {
      throw 'notEnoughRights';
    }

    const lastCard = await Card.findOne({ listId: list.id }).sort('position DESC');
    const position = (lastCard ? lastCard.position : 0) + 65536;

    let dueDate = null;
    if (inputs.dueDate) {
      const parsed = new Date(inputs.dueDate);
      if (!Number.isNaN(parsed.getTime())) {
        dueDate = parsed.toISOString();
      }
    }

    const card = await sails.helpers.cards.createOne.with({
      project,
      values: {
        type: 'project',
        name: inputs.name.trim(),
        description: inputs.description ? inputs.description.trim() : null,
        dueDate,
        position,
        board,
        list,
        creatorUser: currentUser,
      },
      request: this.req,
    });

    if (Array.isArray(inputs.userIds) && inputs.userIds.length > 0) {
      const boardMemberships = await BoardMembership.qm.getByBoardId(board.id);
      const projectManagers = await ProjectManager.qm.getByProjectId(project.id);
      const allowedUserIds = new Set([
        ...boardMemberships.map((bm) => bm.userId),
        ...projectManagers.map((pm) => pm.userId),
      ]);
      const validUserIds = inputs.userIds.filter((uid) => allowedUserIds.has(uid));

      if (validUserIds.length > 0) {
        const users = await User.qm.getByIds(validUserIds);
        await Promise.all(
          users.map(async (memberUser) => {
            try {
              await sails.helpers.cardMemberships.createOne.with({
                project,
                board,
                list,
                values: {
                  card,
                  user: memberUser,
                },
                actorUser: currentUser,
                request: this.req,
              });
            } catch (err) {
              /* ignore duplicate or error */
            }
          }),
        );
      }
    }

    return {
      item: card,
    };
  },
};
