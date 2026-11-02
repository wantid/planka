/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Modal, Button, Icon, Header, Loader } from 'semantic-ui-react';
import selectors from '../../selectors';
import entryActions from '../../entry-actions';
import { createLinkToken, checkLinkStatus } from '../../api/telegram';
import { openTelegramUrl } from '../../utils/telegram';

const DISMISS_KEY = 'planka_tg_link_prompt_dismissed_until';

const TelegramLinkPromptModal = React.memo(() => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectors.selectCurrentUser);
  const bootstrap = useSelector(selectors.selectBootstrap);

  const [isOpen, setIsOpen] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const pollIntervalRef = useRef(null);

  useEffect(() => {
    let timer;
    if (bootstrap?.isTelegramBotEnabled && currentUser && !currentUser.telegramUserId) {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (!dismissedUntil || Number(dismissedUntil) <= Date.now()) {
        timer = setTimeout(() => {
          setIsOpen(true);
        }, 1500);
      }
    } else {
      setIsOpen(false);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [bootstrap, currentUser]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const handleDismiss = useCallback(() => {
    stopPolling();
    setIsOpen(false);
    // Dismiss for 7 days
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  }, [stopPolling]);

  const handleStartLink = useCallback(async () => {
    setIsLinking(true);
    try {
      const { item } = await createLinkToken();
      setTokenData(item);

      const bot = item.botUsername || bootstrap?.telegramBotUsername;
      if (bot) {
        openTelegramUrl(bot, `link_${item.token}`);
      } else if (item.botUrl) {
        window.open(item.botUrl, '_blank', 'noopener,noreferrer');
      }

      // Start polling status
      stopPolling();
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await checkLinkStatus(item.token);
          if (res.item && res.item.isLinked) {
            stopPolling();
            setIsSuccess(true);
            dispatch(entryActions.fetchCurrentUser());
            setTimeout(() => {
              setIsOpen(false);
            }, 2500);
          }
        } catch {
          // ignore polling errors
        }
      }, 1500);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to create link token:', err);
      setIsLinking(false);
    }
  }, [bootstrap, dispatch, stopPolling]);

  const handleRepeatOpen = useCallback(() => {
    if (!tokenData?.token) return;
    const bot = tokenData?.botUsername || bootstrap?.telegramBotUsername;
    if (bot) {
      openTelegramUrl(bot, `link_${tokenData.token}`);
    } else if (tokenData?.botUrl) {
      window.open(tokenData.botUrl, '_blank', 'noopener,noreferrer');
    }
  }, [bootstrap, tokenData]);

  if (!isOpen) {
    return null;
  }

  let bodyContent = (
    <div>
      <p style={{ fontSize: '15px', lineHeight: 1.5 }}>Привяжите Telegram-аккаунт, чтобы:</p>
      <ul style={{ fontSize: '14px', lineHeight: 1.8, color: '#334155' }}>
        <li>⏰ Получать напоминания о сроках задач (в день сдачи, за 1, 3 и 7 дней)</li>
        <li>📋 Получать ежедневную сводку текущих задач</li>
        <li>🚀 Быстро создавать и просматривать задачи через Mini App</li>
        <li>🔑 Входить в систему в один клик через Telegram</li>
      </ul>
    </div>
  );

  if (isSuccess) {
    bodyContent = (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <Icon name="check circle" size="huge" color="green" />
        <Header as="h3" style={{ marginTop: '12px', color: '#16a34a' }}>
          Telegram успешно подключен!
        </Header>
        <p style={{ color: '#64748b' }}>
          Теперь вы будете получать уведомления по назначенным задачам в боте.
        </p>
      </div>
    );
  } else if (isLinking) {
    bodyContent = (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <Loader active inline="centered" size="medium" style={{ marginBottom: '16px' }} />
        <Header as="h4">Ожидание подтверждения в Telegram…</Header>
        <p style={{ color: '#64748b', fontSize: '13px' }}>
          Мы открыли диалог с ботом. В приложении Telegram нажмите кнопку <b>«Запустить» (Start)</b>
          .
        </p>
      </div>
    );
  }

  return (
    <Modal open size="tiny" onClose={handleDismiss} closeIcon centered={false}>
      <Modal.Header>
        <Icon name="telegram plane" color="blue" /> Подключите Telegram
      </Modal.Header>
      <Modal.Content>{bodyContent}</Modal.Content>
      <Modal.Actions style={{ padding: '12px 16px' }}>
        {!isSuccess && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              width: '100%',
            }}
          >
            <Button
              basic
              onClick={handleDismiss}
              style={{
                flex: 1,
                margin: 0,
                textAlign: 'center',
                justifyContent: 'center',
              }}
            >
              Напомнить позже
            </Button>
            {!isLinking ? (
              <Button
                color="blue"
                icon
                labelPosition="right"
                onClick={handleStartLink}
                style={{
                  flex: 1,
                  margin: 0,
                  textAlign: 'center',
                  justifyContent: 'center',
                }}
              >
                Привязать Telegram
                <Icon name="telegram plane" />
              </Button>
            ) : (
              <Button
                color="blue"
                onClick={handleRepeatOpen}
                style={{
                  flex: 1,
                  margin: 0,
                  textAlign: 'center',
                  justifyContent: 'center',
                }}
              >
                Открыть Telegram
              </Button>
            )}
          </div>
        )}
      </Modal.Actions>
    </Modal>
  );
});

export default TelegramLinkPromptModal;
