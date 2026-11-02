/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Header, Divider, Button, Icon, Form, Loader, Message } from 'semantic-ui-react';
import selectors from '../../selectors';
import entryActions from '../../entry-actions';
import {
  getTelegramSettings,
  updateTelegramSettings,
  createLinkToken,
  checkLinkStatus,
  unlinkTelegram,
} from '../../api/telegram';
import { getTimezonesList } from '../../constants/Timezones';
import { openTelegramUrl } from '../../utils/telegram';

const TelegramSettingsSection = React.memo(() => {
  const dispatch = useDispatch();
  const bootstrap = useSelector(selectors.selectBootstrap);

  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const pollIntervalRef = useRef(null);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const loadSettings = useCallback(async () => {
    try {
      const { item } = await getTelegramSettings();
      setSettings(item);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bootstrap?.isTelegramBotEnabled) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [bootstrap, loadSettings]);

  const handleStartLink = useCallback(async () => {
    setLinking(true);
    setSuccessMsg('');
    try {
      const { item } = await createLinkToken();
      setLinkUrl(item.botUrl);

      const bot = item.botUsername || bootstrap?.telegramBotUsername;
      if (bot) {
        openTelegramUrl(bot, `link_${item.token}`);
      } else if (item.botUrl) {
        window.open(item.botUrl, '_blank', 'noopener,noreferrer');
      }

      stopPolling();
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await checkLinkStatus(item.token);
          if (res.item && res.item.isLinked) {
            stopPolling();
            setLinking(false);
            setSuccessMsg('Telegram-аккаунт успешно привязан!');
            loadSettings();
            dispatch(entryActions.fetchCurrentUser());
          }
        } catch {
          // ignore polling errors
        }
      }, 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setLinking(false);
    }
  }, [bootstrap, dispatch, loadSettings, stopPolling]);

  const handleUnlink = useCallback(async () => {
    try {
      await unlinkTelegram();
      loadSettings();
      dispatch(entryActions.fetchCurrentUser());
      setSuccessMsg('Telegram-аккаунт отвязан.');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }, [dispatch, loadSettings]);

  const handleUpdate = useCallback(async (payload) => {
    try {
      const { item } = await updateTelegramSettings(payload);
      setSettings(item);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
    }
  }, []);

  if (!bootstrap?.isTelegramBotEnabled) {
    return null;
  }

  let dueDateValue = 'on';
  if (settings && !settings.dueDateNotifications) {
    dueDateValue = 'off';
  } else if (
    settings &&
    settings.dueDateMutedUntil &&
    new Date(settings.dueDateMutedUntil) > new Date()
  ) {
    dueDateValue = 'muted';
  }

  let dailyValue = 'on';
  if (settings && !settings.dailyNotifications) {
    dailyValue = 'off';
  } else if (
    settings &&
    settings.dailyMutedUntil &&
    new Date(settings.dailyMutedUntil) > new Date()
  ) {
    dailyValue = 'muted';
  }

  let body = null;
  if (loading) {
    body = <Loader active inline="centered" size="small" />;
  } else if (settings?.isLinked) {
    body = (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div>
            <strong>Статус:</strong>{' '}
            <span style={{ color: '#16a34a' }}>
              ✓ Подключен {settings.telegramUsername ? `@${settings.telegramUsername}` : ''}
            </span>
          </div>
          <Button size="tiny" basic color="red" onClick={handleUnlink}>
            Отвязать
          </Button>
        </div>

        <Form>
          <Form.Group widths="equal">
            <Form.Field>
              <label htmlFor="telegram-due-date-select">
                Уведомления по срокам задач
                <select
                  id="telegram-due-date-select"
                  className="ui dropdown"
                  value={dueDateValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'off') {
                      handleUpdate({ dueDateNotifications: false });
                    } else if (val === 'muted') {
                      handleUpdate({ dueDateNotifications: true, dueDateMuteOption: 'week' });
                    } else {
                      handleUpdate({ dueDateNotifications: true, dueDateMuteOption: 'none' });
                    }
                  }}
                >
                  <option value="on">Включены</option>
                  <option value="muted">Отключены на 1 неделю</option>
                  <option value="off">Отключены</option>
                </select>
              </label>
            </Form.Field>

            <Form.Field>
              <label htmlFor="telegram-daily-select">
                Ежедневные уведомления
                <select
                  id="telegram-daily-select"
                  className="ui dropdown"
                  value={dailyValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'off') {
                      handleUpdate({ dailyNotifications: false });
                    } else if (val === 'muted') {
                      handleUpdate({ dailyNotifications: true, dailyMuteOption: 'week' });
                    } else {
                      handleUpdate({ dailyNotifications: true, dailyMuteOption: 'none' });
                    }
                  }}
                >
                  <option value="on">Включены</option>
                  <option value="muted">Отключены на 1 неделю</option>
                  <option value="off">Отключены</option>
                </select>
              </label>
            </Form.Field>
          </Form.Group>

          {dailyValue !== 'off' && (
            <Form.Group widths="equal">
              <Form.Field>
                <label htmlFor="telegram-daily-time-input">
                  Время отправки дайджеста
                  <input
                    id="telegram-daily-time-input"
                    type="time"
                    className="ui input"
                    value={settings.dailyDigestTime || '09:00'}
                    onChange={(e) => handleUpdate({ dailyDigestTime: e.target.value })}
                  />
                </label>
              </Form.Field>

              <Form.Field>
                <label htmlFor="telegram-daily-tz-select">
                  Часовой пояс
                  <select
                    id="telegram-daily-tz-select"
                    className="ui dropdown"
                    value={settings.dailyDigestTimezone || 'UTC'}
                    onChange={(e) => handleUpdate({ dailyDigestTimezone: e.target.value })}
                  >
                    {getTimezonesList(settings.dailyDigestTimezone).map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </label>
              </Form.Field>
            </Form.Group>
          )}
        </Form>
      </div>
    );
  } else {
    body = (
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <p style={{ color: '#64748b', marginBottom: '14px' }}>
          Подключите Telegram, чтобы получать напоминания о сроках задач и ежедневный дайджест.
        </p>
        {linking ? (
          <div>
            <Loader active inline="centered" size="small" style={{ marginBottom: '10px' }} />
            <div>Ожидание нажатия Start в Telegram…</div>
            {linkUrl && (
              <Button
                as="a"
                href={linkUrl}
                target="_blank"
                rel="noreferrer"
                color="blue"
                size="small"
                style={{ marginTop: '8px' }}
              >
                Открыть Telegram
              </Button>
            )}
          </div>
        ) : (
          <Button color="blue" icon labelPosition="left" onClick={handleStartLink}>
            <Icon name="telegram plane" />
            Подключить Telegram
          </Button>
        )}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '24px' }}>
      <Divider horizontal section>
        <Header as="h4">
          <Icon name="telegram plane" color="blue" /> Telegram
        </Header>
      </Divider>

      {successMsg && <Message positive content={successMsg} onDismiss={() => setSuccessMsg('')} />}

      {body}
    </div>
  );
});

export default TelegramSettingsSection;
