/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const { idInput } = require('../../../utils/inputs');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
};

module.exports = {
  inputs: {
    id: {
      ...idInput,
      required: true,
    },
    listId: {
      ...idInput,
      required: true,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
    listNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let pathToProject;
    try {
      pathToProject = await sails.helpers.cards.getPathToProjectById(inputs.id);
    } catch (err) {
      throw Errors.CARD_NOT_FOUND;
    }

    const { card, list: currentList, board, project } = pathToProject;

    // Check permissions
    const isManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);
    const boardMembership = await BoardMembership.qm.getOneByBoardIdAndUserId(
      board.id,
      currentUser.id,
    );
    const cardMembership = await CardMembership.findOne({
      cardId: card.id,
      userId: currentUser.id,
    });

    const canEdit =
      currentUser.role === User.Roles.ADMIN ||
      isManager ||
      (boardMembership && boardMembership.role === BoardMembership.Roles.EDITOR) ||
      !!cardMembership;

    if (!canEdit) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const targetList = await List.findOne({ id: inputs.listId });
    if (
      !targetList ||
      targetList.boardId !== board.id ||
      targetList.type === List.Types.ARCHIVE ||
      targetList.type === List.Types.TRASH
    ) {
      throw Errors.LIST_NOT_FOUND;
    }

    if (card.listId === targetList.id) {
      return {
        item: card,
      };
    }

    const lastCard = await Card.findOne({ listId: targetList.id }).sort('position DESC');
    const position = (lastCard ? lastCard.position : 0) + 65536;

    const updatedCard = await sails.helpers.cards.updateOne.with({
      project,
      board,
      list: currentList,
      record: card,
      values: {
        list: targetList,
        position,
      },
      actorUser: currentUser,
      request: this.req,
    });

    return {
      item: updatedCard,
    };
  },
};
