/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import classNames from 'classnames';
import Config from '../../constants/Config';
import { getMyCards, authWithTelegram } from '../../api/telegram';
import { setAccessToken, getAccessToken } from '../../utils/access-token-storage';
import TelegramTaskItem from './TelegramTaskItem';
import TelegramTaskCreateModal from './TelegramTaskCreateModal';
import TelegramSettingsModal from './TelegramSettingsModal';
import styles from './TelegramMiniApp.module.scss';

const TelegramMiniApp = React.memo(() => {
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [tasksLoading, setTasksLoading] = useState(false);

  const [cards, setCards] = useState([]);
  const [included, setIncluded] = useState({ projects: [], boards: [], lists: [] });
  const [selectedProjectId, setSelectedProjectId] = useState('ALL');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initialize Telegram WebApp SDK and synchronize background colors
  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;

    const tg = window.Telegram?.WebApp;
    const tgBg = tg?.backgroundColor || 'var(--tg-theme-bg-color, #f7f9fa)';
    document.body.style.backgroundColor = tgBg;
    if (document.documentElement) {
      document.documentElement.style.backgroundColor = tgBg;
    }

    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.setHeaderColor) {
        tg.setHeaderColor('bg_color');
      }
      if (tg.setBackgroundColor) {
        tg.setBackgroundColor('bg_color');
      }
    }

    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      if (document.documentElement) {
        document.documentElement.style.backgroundColor = prevHtmlBg;
      }
    };
  }, []);

  const loadCards = useCallback(async () => {
    setTasksLoading(true);
    try {
      const data = await getMyCards();
      setCards(data.items || []);
      setIncluded(data.included || { projects: [], boards: [], lists: [] });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load my cards:', err);
    } finally {
      setTasksLoading(false);
    }
  }, []);

  // Authentication Flow
  const authenticate = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const tg = window.Telegram?.WebApp;
      const initData = tg?.initData;

      if (initData) {
        const authRes = await authWithTelegram(initData);
        if (authRes.item && authRes.item.accessToken) {
          setAccessToken(authRes.item.accessToken);
          try {
            localStorage.setItem('telegram_access_token', authRes.item.accessToken);
          } catch {
            // ignore
          }
          setAuthLoading(false);
          loadCards();
          return;
        }
      }

      // Check if already authenticated via cookie or token
      let token = getAccessToken();
      if (!token) {
        try {
          token = localStorage.getItem('telegram_access_token');
        } catch {
          // ignore
        }
      }

      if (token) {
        setAccessToken(token);
        setAuthLoading(false);
        loadCards();
        return;
      }

      // Not authenticated and no initData
      setAuthError('not_linked');
    } catch (err) {
      if (
        err?.status === 404 ||
        err?.code === 'userNotLinked' ||
        err?.message === 'userNotLinked' ||
        err?.data?.code === 'userNotLinked'
      ) {
        setAuthError('not_linked');
      } else {
        setAuthError('auth_failed');
      }
    } finally {
      setAuthLoading(false);
    }
  }, [loadCards]);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  const projectsById = useMemo(
    () => new Map((included.projects || []).map((p) => [p.id, p])),
    [included.projects],
  );

  const boardsById = useMemo(
    () => new Map((included.boards || []).map((b) => [b.id, b])),
    [included.boards],
  );

  const listsById = useMemo(
    () => new Map((included.lists || []).map((l) => [l.id, l])),
    [included.lists],
  );

  // Derive unique projects that have tasks
  const projectTabs = useMemo(() => {
    const projectMap = new Map();

    cards.forEach((card) => {
      const list = listsById.get(card.listId);
      const board = list ? boardsById.get(list.boardId) : null;
      const project = board ? projectsById.get(board.projectId) : null;

      if (project) {
        const count = projectMap.get(project.id)?.count || 0;
        projectMap.set(project.id, {
          id: project.id,
          name: project.name,
          count: count + 1,
        });
      }
    });

    return Array.from(projectMap.values());
  }, [cards, listsById, boardsById, projectsById]);

  // Filter tasks based on selected project tab
  const filteredCards = useMemo(() => {
    if (selectedProjectId === 'ALL') {
      return cards;
    }

    return cards.filter((card) => {
      const list = listsById.get(card.listId);
      const board = list ? boardsById.get(list.boardId) : null;
      return board && board.projectId === selectedProjectId;
    });
  }, [cards, selectedProjectId, listsById, boardsById]);

  const handleCardListChanged = useCallback((cardId, nextListId) => {
    setCards((prevCards) =>
      prevCards.map((c) => (c.id === cardId ? { ...c, listId: nextListId } : c)),
    );
  }, []);

  if (authLoading) {
    return (
      <div className={styles.loadingWrapper}>
        <div style={{ fontSize: '32px' }}>⏳</div>
        <div>Загрузка Planka…</div>
      </div>
    );
  }

  if (authError === 'auth_failed') {
    return (
      <div className={styles.emptyState} style={{ minHeight: '80vh' }}>
        <div className={styles.emptyIcon}>⚠️</div>
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--tg-theme-text-color, #1e293b)' }}>
          Не удалось авторизоваться
        </h3>
        <p style={{ margin: '0 0 20px 0', maxWidth: '300px', lineHeight: 1.4 }}>
          Произошла ошибка при проверке данных авторизации Telegram.
        </p>
        <button type="button" className={styles.submitButton} onClick={authenticate}>
          Попробовать снова
        </button>
      </div>
    );
  }

  if (authError === 'not_linked') {
    return (
      <div className={styles.emptyState} style={{ minHeight: '80vh' }}>
        <div className={styles.emptyIcon}>🔗</div>
        <h3 style={{ margin: '0 0 8px 0', color: 'var(--tg-theme-text-color, #1e293b)' }}>
          Telegram не привязан к Planka
        </h3>
        <p style={{ margin: '0 0 20px 0', maxWidth: '300px', lineHeight: 1.4 }}>
          Чтобы просматривать и создавать свои задачи в Telegram, войдите в Planka на компьютере и
          нажмите «Привязать Telegram» в настройках.
        </p>
        <button
          type="button"
          className={styles.submitButton}
          onClick={() => {
            window.location.href = Config.BASE_PATH || '/';
          }}
        >
          Перейти на сайт Planka
        </button>
      </div>
    );
  }

  return (
    <div className={styles.miniAppWrapper}>
      {/* Pinned Top Bar */}
      <div className={styles.topBar}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <span>📋</span>
            <span>Мои задачи</span>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.iconButton}
              title="Настройки уведомлений"
              onClick={() => setIsSettingsOpen(true)}
            >
              ⚙️
            </button>
            <button
              type="button"
              className={styles.createButton}
              onClick={() => setIsCreateOpen(true)}
            >
              + Задача
            </button>
          </div>
        </header>

        {/* Horizontal Project Tabs */}
        <div className={styles.tabsContainer}>
          <button
            type="button"
            className={classNames(styles.tab, selectedProjectId === 'ALL' && styles.tabActive)}
            onClick={() => setSelectedProjectId('ALL')}
          >
            Все ({cards.length})
          </button>
          {projectTabs.map((p) => (
            <button
              key={p.id}
              type="button"
              className={classNames(styles.tab, selectedProjectId === p.id && styles.tabActive)}
              onClick={() => setSelectedProjectId(p.id)}
            >
              {p.name} ({p.count})
            </button>
          ))}
        </div>
      </div>

      {/* Main Content / Tasks List */}
      <main className={styles.content}>
        {(() => {
          if (tasksLoading && cards.length === 0) {
            return (
              <div className={styles.loadingWrapper}>
                <div>Обновление задач…</div>
              </div>
            );
          }
          if (filteredCards.length === 0) {
            return (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🎉</div>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Все задачи выполнены!</div>
                <div style={{ fontSize: '13px' }}>Здесь пока нет активных задач.</div>
              </div>
            );
          }
          return filteredCards.map((card) => {
            const list = listsById.get(card.listId);
            const board = list ? boardsById.get(list.boardId) : null;
            const project = board ? projectsById.get(board.projectId) : null;
            const availableLists = board
              ? (included.lists || [])
                  .filter((l) => l.boardId === board.id)
                  .sort((a, b) => a.position - b.position)
              : [];

            return (
              <TelegramTaskItem
                key={card.id}
                card={card}
                project={project}
                board={board}
                list={list}
                availableLists={availableLists}
                onListChange={handleCardListChanged}
              />
            );
          });
        })()}
      </main>

      {/* Modals */}
      {isCreateOpen && (
        <TelegramTaskCreateModal
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            loadCards();
          }}
        />
      )}

      {isSettingsOpen && <TelegramSettingsModal onClose={() => setIsSettingsOpen(false)} />}
    </div>
  );
});

export default TelegramMiniApp;
