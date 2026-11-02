/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button, Icon, Modal, Loader, Header, Message } from 'semantic-ui-react';
import Config from '../../constants/Config';
import selectors from '../../selectors';
import { createLoginToken, checkLoginStatus } from '../../api/telegram';
import { setAccessToken } from '../../utils/access-token-storage';
import { openTelegramUrl } from '../../utils/telegram';

const TelegramLoginButton = React.memo(() => {
  const bootstrap = useSelector(selectors.selectBootstrap);

  const [isOpen, setIsOpen] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const pollIntervalRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleStartLogin = useCallback(async () => {
    setError('');
    setIsSuccess(false);
    try {
      const { item } = await createLoginToken();
      setTokenData(item);
      setIsOpen(true);

      const bot = item.botUsername || bootstrap?.telegramBotUsername;
      if (bot) {
        openTelegramUrl(bot, `login_${item.token}`);
      } else if (item.botUrl) {
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
          } else if (res.item && res.item.error === 'not_linked') {
            stopPolling();
            setError(
              'Этот Telegram-аккаунт ещё не привязан к профилю Planka. Сначала выполните вход по логину/паролю и привяжите Telegram в настройках профиля.',
            );
          } else if (res.item && res.item.error === 'deactivated') {
            stopPolling();
            setError('Ваш аккаунт в Planka деактивирован.');
          } else if (res.item && res.item.isExpired) {
            stopPolling();
            setError('Время ожидания входа истекло. Попробуйте снова.');
          }
        } catch {
          // ignore polling errors
        }
      }, 1500);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to create login token:', err);
      setError('Не удалось начать вход через Telegram. Попробуйте снова.');
      setIsOpen(true);
    }
  }, [bootstrap, stopPolling]);

  const handleRepeatOpen = useCallback(() => {
    if (!tokenData?.token) return;
    const bot = tokenData?.botUsername || bootstrap?.telegramBotUsername;
    if (bot) {
      openTelegramUrl(bot, `login_${tokenData.token}`);
    } else if (tokenData?.botUrl) {
      window.open(tokenData.botUrl, '_blank', 'noopener,noreferrer');
    }
  }, [bootstrap, tokenData]);

  const handleClose = useCallback(() => {
    stopPolling();
    setIsOpen(false);
    setError('');
  }, [stopPolling]);

  let modalContent;
  if (isSuccess) {
    modalContent = (
      <div>
        <Icon name="check circle" size="huge" color="green" />
        <Header as="h3" style={{ marginTop: '12px', color: '#16a34a' }}>
          Успешный вход!
        </Header>
        <p style={{ color: '#64748b' }}>Выполняется вход в Planka…</p>
      </div>
    );
  } else if (error) {
    modalContent = (
      <div>
        <Icon name="warning circle" size="huge" color="orange" />
        <Header as="h3" style={{ marginTop: '12px', color: '#ea580c' }}>
          Не удалось выполнить вход
        </Header>
        <Message warning style={{ textAlign: 'left', marginTop: '16px' }}>
          <p>{error}</p>
        </Message>
      </div>
    );
  } else {
    modalContent = (
      <div>
        <Loader active inline="centered" size="medium" style={{ marginBottom: '16px' }} />
        <Header as="h4">Ожидание подтверждения входа…</Header>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Мы открыли приложение Telegram. Нажмите кнопку <b>«Запустить» (Start)</b> для авторизации.
        </p>
        <Button color="blue" size="small" onClick={handleRepeatOpen} style={{ marginTop: '12px' }}>
          Открыть Telegram повторно
        </Button>
      </div>
    );
  }

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
            {modalContent}
          </Modal.Content>
          <Modal.Actions>
            <Button onClick={handleClose}>{error ? 'Понятно' : 'Отмена'}</Button>
          </Modal.Actions>
        </Modal>
      )}
    </>
  );
});

export default TelegramLoginButton;
