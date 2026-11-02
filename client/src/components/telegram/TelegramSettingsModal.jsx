/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getTelegramSettings, updateTelegramSettings } from '../../api/telegram';
import { getTimezonesList } from '../../constants/Timezones';
import styles from './TelegramMiniApp.module.scss';

const TelegramSettingsModal = React.memo(({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dueDateMode, setDueDateMode] = useState('on'); // 'on' | 'week' | 'two_weeks' | 'off'
  const [dailyMode, setDailyMode] = useState('on'); // 'on' | 'week' | 'two_weeks' | 'off'
  const [dailyTime, setDailyTime] = useState('09:00');
  const [dailyTimezone, setDailyTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });

  const timezones = useMemo(() => getTimezonesList(dailyTimezone), [dailyTimezone]);

  useEffect(() => {
    getTelegramSettings()
      .then(({ item }) => {
        // Evaluate due date mode
        if (!item.dueDateNotifications) {
          setDueDateMode('off');
        } else if (item.dueDateMutedUntil && new Date(item.dueDateMutedUntil) > new Date()) {
          const diffDays =
            (new Date(item.dueDateMutedUntil).getTime() - Date.now()) / (24 * 3600 * 1000);
          setDueDateMode(diffDays > 8 ? 'two_weeks' : 'week');
        } else {
          setDueDateMode('on');
        }

        // Evaluate daily mode
        if (!item.dailyNotifications) {
          setDailyMode('off');
        } else if (item.dailyMutedUntil && new Date(item.dailyMutedUntil) > new Date()) {
          const diffDays =
            (new Date(item.dailyMutedUntil).getTime() - Date.now()) / (24 * 3600 * 1000);
          setDailyMode(diffDays > 8 ? 'two_weeks' : 'week');
        } else {
          setDailyMode('on');
        }

        if (item.dailyDigestTime) {
          setDailyTime(item.dailyDigestTime);
        }

        if (item.dailyDigestTimezone) {
          setDailyTimezone(item.dailyDigestTimezone);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(
    async (newDueDateMode, newDailyMode, newTime, newTz) => {
      setSaving(true);
      try {
        const payload = {};

        if (newDueDateMode === 'off') {
          payload.dueDateNotifications = false;
        } else if (newDueDateMode === 'week') {
          payload.dueDateNotifications = true;
          payload.dueDateMuteOption = 'week';
        } else if (newDueDateMode === 'two_weeks') {
          payload.dueDateNotifications = true;
          payload.dueDateMuteOption = 'two_weeks';
        } else {
          payload.dueDateNotifications = true;
          payload.dueDateMuteOption = 'none';
        }

        if (newDailyMode === 'off') {
          payload.dailyNotifications = false;
        } else if (newDailyMode === 'week') {
          payload.dailyNotifications = true;
          payload.dailyMuteOption = 'week';
        } else if (newDailyMode === 'two_weeks') {
          payload.dailyNotifications = true;
          payload.dailyMuteOption = 'two_weeks';
        } else {
          payload.dailyNotifications = true;
          payload.dailyMuteOption = 'none';
        }

        payload.dailyDigestTime = newTime !== undefined ? newTime : dailyTime;
        payload.dailyDigestTimezone = newTz !== undefined ? newTz : dailyTimezone;

        await updateTelegramSettings(payload);
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setSaving(false);
      }
    },
    [dailyTime, dailyTimezone],
  );

  const selectDueDateMode = (mode) => {
    setDueDateMode(mode);
    handleSave(mode, dailyMode, dailyTime, dailyTimezone);
  };

  const selectDailyMode = (mode) => {
    setDailyMode(mode);
    handleSave(dueDateMode, mode, dailyTime, dailyTimezone);
  };

  const handleTimeChange = (val) => {
    setDailyTime(val);
    handleSave(dueDateMode, dailyMode, val, dailyTimezone);
  };

  const handleTimezoneChange = (val) => {
    setDailyTimezone(val);
    handleSave(dueDateMode, dailyMode, dailyTime, val);
  };

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true">
      <button
        type="button"
        className={styles.modalBackdrop}
        onClick={onClose}
        aria-label="Закрыть"
      />
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Настройки уведомлений</div>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>Загрузка…</div>
        ) : (
          <>
            <div className={styles.settingsSection}>
              <div className={styles.settingsSectionTitle}>
                Уведомления по срокам задач
                <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>
                  (в день сдачи, за день, за 3 дня, за неделю)
                </div>
              </div>
              <div className={styles.settingsOptions}>
                <button
                  type="button"
                  className={classNames(
                    styles.settingOptionButton,
                    dueDateMode === 'on' && styles.settingOptionActive,
                  )}
                  onClick={() => selectDueDateMode('on')}
                >
                  🔔 Включены
                </button>
                <button
                  type="button"
                  className={classNames(
                    styles.settingOptionButton,
                    dueDateMode === 'week' && styles.settingOptionActive,
                  )}
                  onClick={() => selectDueDateMode('week')}
                >
                  ⏳ На 1 неделю
                </button>
                <button
                  type="button"
                  className={classNames(
                    styles.settingOptionButton,
                    dueDateMode === 'two_weeks' && styles.settingOptionActive,
                  )}
                  onClick={() => selectDueDateMode('two_weeks')}
                >
                  ⏳ На 2 недели
                </button>
                <button
                  type="button"
                  className={classNames(
                    styles.settingOptionButton,
                    dueDateMode === 'off' && styles.settingOptionActive,
                  )}
                  onClick={() => selectDueDateMode('off')}
                >
                  🔕 Отключены
                </button>
              </div>
            </div>

            <div className={styles.settingsSection}>
              <div className={styles.settingsSectionTitle}>
                Ежедневные уведомления
                <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#64748b' }}>
                  (ежедневный список актуальных задач)
                </div>
              </div>
              <div className={styles.settingsOptions}>
                <button
                  type="button"
                  className={classNames(
                    styles.settingOptionButton,
                    dailyMode === 'on' && styles.settingOptionActive,
                  )}
                  onClick={() => selectDailyMode('on')}
                >
                  🔔 Включены
                </button>
                <button
                  type="button"
                  className={classNames(
                    styles.settingOptionButton,
                    dailyMode === 'week' && styles.settingOptionActive,
                  )}
                  onClick={() => selectDailyMode('week')}
                >
                  ⏳ На 1 неделю
                </button>
                <button
                  type="button"
                  className={classNames(
                    styles.settingOptionButton,
                    dailyMode === 'two_weeks' && styles.settingOptionActive,
                  )}
                  onClick={() => selectDailyMode('two_weeks')}
                >
                  ⏳ На 2 недели
                </button>
                <button
                  type="button"
                  className={classNames(
                    styles.settingOptionButton,
                    dailyMode === 'off' && styles.settingOptionActive,
                  )}
                  onClick={() => selectDailyMode('off')}
                >
                  🔕 Отключены
                </button>
              </div>

              {dailyMode !== 'off' && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '12px',
                    background: 'var(--tg-theme-secondary-bg-color, #f8fafc)',
                    borderRadius: '10px',
                    marginTop: '4px',
                  }}
                >
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="dailyTimeInput">
                      Время отправки
                      <input
                        id="dailyTimeInput"
                        type="time"
                        className={styles.formInput}
                        value={dailyTime}
                        onChange={(e) => handleTimeChange(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel} htmlFor="dailyTimezoneSelect">
                      Часовой пояс
                      <select
                        id="dailyTimezoneSelect"
                        className={styles.formSelect}
                        value={dailyTimezone}
                        onChange={(e) => handleTimezoneChange(e.target.value)}
                      >
                        {timezones.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className={styles.submitButton}
              onClick={onClose}
              disabled={saving}
            >
              {saving ? 'Сохранение…' : 'Готово'}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

TelegramSettingsModal.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default TelegramSettingsModal;
