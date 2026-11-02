/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const openTelegramUrl = (botUsername, startParam) => {
  if (!botUsername) return;
  const bot = botUsername.replace(/^@/, '');
  const enc = encodeURIComponent(startParam || '');
  const https = enc ? `https://t.me/${bot}?start=${enc}` : `https://t.me/${bot}`;
  const tg = enc ? `tg://resolve?domain=${bot}&start=${enc}` : `tg://resolve?domain=${bot}`;

  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (mobile) {
    window.location.href = tg;
    window.setTimeout(() => {
      window.location.href = https;
    }, 1200);
  } else {
    window.location.href = tg;
    window.setTimeout(() => {
      window.open(https, '_blank', 'noopener,noreferrer');
    }, 600);
  }
};

export const getTelegramWebUrl = (botUsername, startParam) => {
  if (!botUsername) return '#';
  const bot = botUsername.replace(/^@/, '');
  const enc = encodeURIComponent(startParam || '');
  return enc ? `https://t.me/${bot}?start=${enc}` : `https://t.me/${bot}`;
};

export default {
  openTelegramUrl,
  getTelegramWebUrl,
};
