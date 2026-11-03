/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuid } = require('uuid');
const { ProxyAgent, fetch: undiciFetch } = require('undici');
const { rimraf } = require('rimraf');

module.exports = {
  inputs: {
    user: {
      type: 'ref',
      required: true,
    },
    telegramUserId: {
      type: 'string',
    },
    force: {
      type: 'boolean',
      defaultsTo: false,
    },
  },

  async fn(inputs) {
    const telegramHook = sails.hooks.telegram;
    if (!telegramHook) {
      return null;
    }

    const bot = telegramHook.getBot();
    if (!bot || !bot.api) {
      return null;
    }

    const tgUserId = inputs.telegramUserId || inputs.user.telegramUserId;
    if (!tgUserId) {
      return null;
    }

    try {
      const photosRes = await bot.api.getUserProfilePhotos(Number(tgUserId), { limit: 1 });
      if (!photosRes || !photosRes.photos || photosRes.photos.length === 0) {
        return null;
      }

      const photoSizes = photosRes.photos[0];
      if (!photoSizes || photoSizes.length === 0) {
        return null;
      }

      const largestPhoto = photoSizes[photoSizes.length - 1];
      const fileUniqueId = largestPhoto.file_unique_id;

      if (
        !inputs.force &&
        inputs.user.avatar &&
        inputs.user.telegramAvatarFileUniqueId === fileUniqueId
      ) {
        return null;
      }

      const fileInfo = await bot.api.getFile(largestPhoto.file_id);
      if (!fileInfo || !fileInfo.file_path) {
        return null;
      }

      const token = sails.config.custom.telegramBotToken;
      const downloadUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;

      const proxyUrl =
        sails.config.custom.outgoingProxy || process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

      const res = await undiciFetch(downloadUrl, { dispatcher });
      if (!res.ok) {
        sails.log.warn(`Telegram avatar: Failed to download file: HTTP ${res.status}`);
        return null;
      }

      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const tempFd = path.join(os.tmpdir(), `tg-avatar-${uuid()}.jpg`);
      await fs.promises.writeFile(tempFd, buffer);

      let avatar;
      try {
        avatar = await sails.helpers.users.processUploadedAvatarFile({
          fd: tempFd,
          type: 'image/jpeg',
          size: buffer.length,
        });
      } catch (procErr) {
        if (fs.existsSync(tempFd)) {
          await rimraf(tempFd).catch(() => {});
        }
        sails.log.warn('Telegram avatar: Failed to process image file:', procErr);
        return null;
      }

      const freshUser = await User.qm.getOneById(inputs.user.id);
      if (!freshUser) {
        return null;
      }

      const updatedUser = await sails.helpers.users.updateOne.with({
        record: freshUser,
        values: {
          avatar,
          telegramAvatarFileUniqueId: fileUniqueId,
        },
        actorUser: freshUser,
      });

      sails.log.info(`Telegram avatar synced for user ${freshUser.id} (${freshUser.name})`);
      return updatedUser;
    } catch (error) {
      sails.log.warn(`Telegram avatar sync error for user ${inputs.user.id}:`, error.message);
      return null;
    }
  },
};
