/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Icon, Modal, Loader, Header } from 'semantic-ui-react';
import Config from '../../constants/Config';
import { createLoginToken, checkLoginStatus } from '../../api/telegram';
import { setAccessToken } from '../../utils/access-token-storage';

const TelegramLoginButton = React.memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const pollIntervalRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleStartLogin = useCallback(async () => {
    try {
      const { item } = await createLoginToken();
      setTokenData(item);
      setIsOpen(true);

      if (item.botUrl) {
        window.open(item.botUrl, '_blank', 'noopener,noreferrer');
      }

      stopPolling();
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await checkLoginStatus(item.token);
          if (res.item && res.item.isConfirmed && res.item.accessToken) {
            stopPolling();
            setIsSuccess(true);
            setAccessToken(res.item.accessToken);
            setTimeout(() => {
              window.location.href = Config.BASE_PATH || '/';
            }, 1000);
          }
        } catch {
          // ignore polling errors
        }
      }, 1500);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to create login token:', err);
    }
  }, [stopPolling]);

  const handleClose = useCallback(() => {
    stopPolling();
    setIsOpen(false);
  }, [stopPolling]);

  return (
    <>
      <Button
        type="button"
        fluid
        color="telegram"
        icon
        labelPosition="left"
        onClick={handleStartLogin}
        style={{ marginTop: '12px', background: '#229ED9' }}
      >
        <Icon name="telegram plane" />
        Войти через Telegram
      </Button>

      {isOpen && (
        <Modal open size="tiny" onClose={handleClose} closeIcon centered={false}>
          <Modal.Header>
            <Icon name="telegram plane" color="blue" /> Вход через Telegram
          </Modal.Header>
          <Modal.Content style={{ textAlign: 'center', padding: '28px 16px' }}>
            {isSuccess ? (
              <div>
                <Icon name="check circle" size="huge" color="green" />
                <Header as="h3" style={{ marginTop: '12px', color: '#16a34a' }}>
                  Успешный вход!
                </Header>
                <p style={{ color: '#64748b' }}>Выполняется вход в Planka…</p>
              </div>
            ) : (
              <div>
                <Loader active inline="centered" size="medium" style={{ marginBottom: '16px' }} />
                <Header as="h4">Ожидание подтверждения входа…</Header>
                <p style={{ color: '#64748b', fontSize: '13px' }}>
                  Откройте диалог с ботом и нажмите кнопку <b>«Запустить» (Start)</b> для
                  авторизации.
                </p>
                {tokenData?.botUrl && (
                  <Button
                    as="a"
                    href={tokenData.botUrl}
                    target="_blank"
                    rel="noreferrer"
                    color="blue"
                    size="small"
                    style={{ marginTop: '12px' }}
                  >
                    Открыть Telegram
                  </Button>
                )}
              </div>
            )}
          </Modal.Content>
          <Modal.Actions>
            <Button onClick={handleClose}>Отмена</Button>
          </Modal.Actions>
        </Modal>
      )}
    </>
  );
});

export default TelegramLoginButton;
