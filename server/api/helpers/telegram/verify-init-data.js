/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

const crypto = require('crypto');

module.exports = {
  sync: true,

  inputs: {
    initData: {
      type: 'string',
      required: true,
    },
    botToken: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    invalidHash: {},
    expired: {},
    missingUser: {},
  },

  fn(inputs) {
    const params = new URLSearchParams(inputs.initData);
    const hash = params.get('hash');

    if (!hash) {
      throw 'invalidHash';
    }

    params.delete('hash');

    const pairs = [];
    params.forEach((value, key) => {
      pairs.push(`${key}=${value}`);
    });
    pairs.sort();
    const dataCheck = pairs.join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(inputs.botToken).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheck).digest('hex');

    if (
      hash.length !== expectedHash.length ||
      !crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'))
    ) {
      throw 'invalidHash';
    }

    const authDate = parseInt(params.get('auth_date'), 10);
    if (authDate && Date.now() / 1000 - authDate > 86400 * 7) {
      throw 'expired';
    }

    const userRaw = params.get('user');
    if (!userRaw) {
      throw 'missingUser';
    }

    try {
      const user = JSON.parse(userRaw);
      return {
        ...user,
        authDate,
      };
    } catch (error) {
      throw 'missingUser';
    }
  },
};
