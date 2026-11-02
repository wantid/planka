/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import Config from '../constants/Config';
import { getAccessToken } from '../utils/access-token-storage';

const jsonFetch = async (url, options = {}) => {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${Config.BASE_PATH}/api${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || response.statusText);
    error.status = response.status;
    error.code = body?.code;
    error.data = body;
    throw error;
  }
  return body;
};

export const authWithTelegram = (initData) =>
  jsonFetch('/telegram/auth', {
    method: 'POST',
    body: JSON.stringify({ initData }),
  });

export const createLinkToken = () =>
  jsonFetch('/telegram/link-token', {
    method: 'POST',
  });

export const checkLinkStatus = (token) => jsonFetch(`/telegram/link-status/${token}`);

export const createLoginToken = () =>
  jsonFetch('/telegram/login-token', {
    method: 'POST',
  });

export const checkLoginStatus = (token) => jsonFetch(`/telegram/login-status/${token}`);

export const unlinkTelegram = () =>
  jsonFetch('/telegram/unlink', {
    method: 'POST',
  });

export const getTelegramSettings = () => jsonFetch('/telegram/settings');

export const updateTelegramSettings = (data) =>
  jsonFetch('/telegram/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const getProjectsTree = () => jsonFetch('/telegram/projects-tree');

export const createTelegramCard = (data) =>
  jsonFetch('/telegram/cards', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getTelegramStatus = () => jsonFetch('/telegram/status');

export const getMyCards = () => jsonFetch('/users/me/cards');

export default {
  authWithTelegram,
  createLinkToken,
  checkLinkStatus,
  createLoginToken,
  checkLoginStatus,
  unlinkTelegram,
  getTelegramSettings,
  updateTelegramSettings,
  getProjectsTree,
  createTelegramCard,
  getTelegramStatus,
  getMyCards,
};
