/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /users/me/cards:
 *   get:
 *     summary: Get current user's cards
 *     description: Retrieves all open cards where the current user is a member, across all accessible boards.
 *     tags:
 *       - Users
 *     operationId: getMyCards
 *     responses:
 *       200:
 *         description: Cards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - items
 *                 - included
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Card'
 *                 included:
 *                   type: object
 *                   required:
 *                     - projects
 *                     - boards
 *                     - lists
 *                     - labels
 *                     - cardLabels
 *                     - cardMemberships
 *                     - users
 *                     - customFieldGroups
 *                     - customFields
 *                     - customFieldValues
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Project'
 *                     boards:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Board'
 *                     lists:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/List'
 *                     labels:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Label'
 *                     cardLabels:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CardLabel'
 *                     cardMemberships:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CardMembership'
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     customFieldGroups:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CustomFieldGroup'
 *                     customFields:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CustomField'
 *                     customFieldValues:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CustomFieldValue'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

module.exports = {
  async fn() {
    const { currentUser } = this.req;

    const managerProjectIds = await sails.helpers.users.getManagerProjectIds(currentUser.id);
    const fullyVisibleProjectIds = [...managerProjectIds];

    if (currentUser.role === User.Roles.ADMIN) {
      const sharedProjects = await Project.qm.getShared({
        exceptIdOrIds: managerProjectIds,
      });

      fullyVisibleProjectIds.push(...sails.helpers.utils.mapRecords(sharedProjects));
    }

    const boardMemberships = await BoardMembership.qm.getByUserId(currentUser.id);
    const membershipBoardIds = sails.helpers.utils.mapRecords(boardMemberships, 'boardId');

    const membershipBoards = await Board.qm.getByIds(membershipBoardIds, {
      exceptProjectIdOrIds: fullyVisibleProjectIds,
    });

    const fullyVisibleBoards = await Board.qm.getByProjectIds(fullyVisibleProjectIds);
    const accessibleBoardIds = _.uniq([
      ...sails.helpers.utils.mapRecords(fullyVisibleBoards),
      ...sails.helpers.utils.mapRecords(membershipBoards),
    ]);

    const cards = await Card.qm.getByMemberUserId(currentUser.id, {
      boardIds: accessibleBoardIds,
    });

    if (cards.length === 0) {
      return {
        items: [],
        included: {
          projects: [],
          boards: [],
          lists: [],
          labels: [],
          cardLabels: [],
          cardMemberships: [],
          users: [],
          customFieldGroups: [],
          customFields: [],
          customFieldValues: [],
        },
      };
    }

    const cardIds = sails.helpers.utils.mapRecords(cards);
    const listIds = sails.helpers.utils.mapRecords(cards, 'listId', true);
    const lists = await List.qm.getByIds(listIds);
    const boardIds = sails.helpers.utils.mapRecords(lists, 'boardId', true);
    const boards = await Board.qm.getByIds(boardIds);
    const projectIds = sails.helpers.utils.mapRecords(boards, 'projectId', true);
    const projects = await Project.qm.getByIds(projectIds);
    const cardMemberships = await CardMembership.qm.getByCardIds(cardIds);
    const cardLabels = await CardLabel.qm.getByCardIds(cardIds);
    const labelIds = sails.helpers.utils.mapRecords(cardLabels, 'labelId', true);
    const labels = labelIds.length > 0 ? await Label.qm.getByIds(labelIds) : [];

    const userIds = sails.helpers.utils.mapRecords(cardMemberships, 'userId', true);
    const users = userIds.length > 0 ? await User.qm.getByIds(userIds) : [];

    const boardCustomFieldGroups = (
      await Promise.all(boardIds.map((boardId) => CustomFieldGroup.qm.getByBoardId(boardId)))
    ).flat();
    const cardCustomFieldGroups = await CustomFieldGroup.qm.getByCardIds(cardIds);
    const customFieldGroups = [...boardCustomFieldGroups, ...cardCustomFieldGroups];
    const customFieldGroupIds = sails.helpers.utils.mapRecords(customFieldGroups);
    const customFields =
      customFieldGroupIds.length > 0
        ? await CustomField.qm.getByCustomFieldGroupIds(customFieldGroupIds)
        : [];
    const customFieldValues = await CustomFieldValue.qm.getByCardIds(cardIds);

    return {
      items: cards,
      included: {
        projects,
        boards,
        lists,
        labels,
        cardLabels,
        cardMemberships,
        users: sails.helpers.users.presentMany(users, currentUser),
        customFieldGroups,
        customFields,
        customFieldValues,
      },
    };
  },
};
