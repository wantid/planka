/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

module.exports = {
  async fn() {
    const { currentUser } = this.req;

    let accessibleBoards = [];
    let projects = [];

    if (currentUser.role === User.Roles.ADMIN) {
      projects = await Project.find().sort('name ASC');
      accessibleBoards = await Board.find().sort('position ASC');
    } else {
      const managerProjectIds = await sails.helpers.users.getManagerProjectIds(currentUser.id);
      const boardMemberships = await BoardMembership.qm.getByUserId(currentUser.id);
      const membershipBoardIds = sails.helpers.utils.mapRecords(boardMemberships, 'boardId');

      // Also get boards where user is a card member
      const userCards = await Card.qm.getByMemberUserId(currentUser.id);
      const userCardListIds = sails.helpers.utils.mapRecords(userCards, 'listId', true);
      const userCardLists =
        userCardListIds.length > 0 ? await List.qm.getByIds(userCardListIds) : [];
      const userCardBoardIds = sails.helpers.utils.mapRecords(userCardLists, 'boardId', true);

      const allDirectBoardIds = _.uniq([...membershipBoardIds, ...userCardBoardIds]);

      const fullyVisibleBoards =
        managerProjectIds.length > 0 ? await Board.qm.getByProjectIds(managerProjectIds) : [];

      const membershipBoards =
        allDirectBoardIds.length > 0
          ? await Board.qm.getByIds(
              allDirectBoardIds,
              managerProjectIds.length > 0
                ? { exceptProjectIdOrIds: managerProjectIds }
                : undefined,
            )
          : [];

      accessibleBoards = _.uniqBy([...fullyVisibleBoards, ...membershipBoards], 'id');
      const projectIds = sails.helpers.utils.mapRecords(accessibleBoards, 'projectId', true);
      projects = projectIds.length > 0 ? await Project.qm.getByIds(projectIds) : [];
    }

    const accessibleBoardIds = sails.helpers.utils.mapRecords(accessibleBoards);
    if (accessibleBoardIds.length === 0 || projects.length === 0) {
      return { items: [] };
    }

    const projectIds = sails.helpers.utils.mapRecords(projects);

    // Get lists for accessible boards (exclude archive and trash)
    const lists = await List.qm.getByBoardIds(accessibleBoardIds);
    const activeLists = lists.filter(
      (l) => l.type !== List.Types.ARCHIVE && l.type !== List.Types.TRASH,
    );

    // Get members for accessible boards and project managers
    const allBoardMemberships = await BoardMembership.qm.getByBoardIds(accessibleBoardIds);
    const allProjectManagers = await ProjectManager.qm.getByProjectIds(projectIds);
    const userIds = _.uniq([
      ...sails.helpers.utils.mapRecords(allBoardMemberships, 'userId'),
      ...sails.helpers.utils.mapRecords(allProjectManagers, 'userId'),
    ]);
    const users = await User.qm.getByIds(userIds);
    const userById = _.keyBy(users, 'id');

    const listsByBoardId = _.groupBy(activeLists, 'boardId');
    const membershipsByBoardId = _.groupBy(allBoardMemberships, 'boardId');
    const managersByProjectId = _.groupBy(allProjectManagers, 'projectId');
    const boardsByProjectId = _.groupBy(accessibleBoards, 'projectId');

    const tree = projects
      .map((p) => {
        const projectBoards = boardsByProjectId[p.id] || [];
        const projectManagerUsers = (managersByProjectId[p.id] || [])
          .map((pm) => userById[pm.userId])
          .filter(Boolean);

        const boardsWithLists = projectBoards
          .map((b) => {
            const boardLists = (listsByBoardId[b.id] || []).sort(
              (a, bList) => a.position - bList.position,
            );
            const boardMemberUsers = (membershipsByBoardId[b.id] || [])
              .map((bm) => userById[bm.userId])
              .filter(Boolean);

            const uniqueBoardUsers = _.uniqBy([...boardMemberUsers, ...projectManagerUsers], 'id');

            const boardMembers = uniqueBoardUsers.map((u) => ({
              id: u.id,
              name: u.name,
              username: u.username,
            }));

            return {
              id: b.id,
              name: b.name,
              lists: boardLists.map((l) => ({
                id: l.id,
                name: l.name,
                position: l.position,
              })),
              members: boardMembers,
            };
          })
          .filter((b) => b.lists.length > 0);

        return {
          id: p.id,
          name: p.name,
          boards: boardsWithLists,
        };
      })
      .filter((p) => p.boards.length > 0);

    return {
      items: tree,
    };
  },
};
