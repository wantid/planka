/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getProjectsTree, createTelegramCard } from '../../api/telegram';
import styles from './TelegramMiniApp.module.scss';

const TelegramTaskCreateModal = React.memo(({ onClose, onCreated }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projectsTree, setProjectsTree] = useState([]);

  const [projectId, setProjectId] = useState('');
  const [boardId, setBoardId] = useState('');
  const [listId, setListId] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState([]);

  useEffect(() => {
    getProjectsTree()
      .then(({ items }) => {
        setProjectsTree(items || []);
        if (items && items.length > 0) {
          const firstProj = items[0];
          setProjectId(firstProj.id);
          if (firstProj.boards && firstProj.boards.length > 0) {
            const firstBoard = firstProj.boards[0];
            setBoardId(firstBoard.id);
            if (firstBoard.lists && firstBoard.lists.length > 0) {
              setListId(firstBoard.lists[0].id);
            }
          }
        }
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to load projects tree:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const currentProject = useMemo(
    () => projectsTree.find((p) => p.id === projectId),
    [projectsTree, projectId],
  );

  const availableBoards = useMemo(() => currentProject?.boards || [], [currentProject]);

  const currentBoard = useMemo(
    () => availableBoards.find((b) => b.id === boardId),
    [availableBoards, boardId],
  );

  const availableLists = useMemo(() => currentBoard?.lists || [], [currentBoard]);

  const availableMembers = useMemo(() => currentBoard?.members || [], [currentBoard]);

  const handleProjectChange = useCallback(
    (e) => {
      const newProjId = e.target.value;
      setProjectId(newProjId);
      const proj = projectsTree.find((p) => p.id === newProjId);
      if (proj && proj.boards.length > 0) {
        setBoardId(proj.boards[0].id);
        if (proj.boards[0].lists.length > 0) {
          setListId(proj.boards[0].lists[0].id);
        } else {
          setListId('');
        }
      } else {
        setBoardId('');
        setListId('');
      }
      setSelectedUserIds([]);
    },
    [projectsTree],
  );

  const handleBoardChange = useCallback(
    (e) => {
      const newBoardId = e.target.value;
      setBoardId(newBoardId);
      const b = availableBoards.find((item) => item.id === newBoardId);
      if (b && b.lists.length > 0) {
        setListId(b.lists[0].id);
      } else {
        setListId('');
      }
      setSelectedUserIds([]);
    },
    [availableBoards],
  );

  const toggleUser = useCallback((userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!name.trim() || !listId) {
        return;
      }

      setSubmitting(true);
      try {
        const payload = {
          listId,
          name: name.trim(),
          description: description.trim() || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
        };

        await createTelegramCard(payload);
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        onCreated();
        onClose();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    },
    [name, listId, description, dueDate, selectedUserIds, onCreated, onClose],
  );

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
          <div className={styles.modalTitle}>Новая задача</div>
          <button type="button" className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        {(() => {
          if (loading) {
            return (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                Загрузка…
              </div>
            );
          }
          if (projectsTree.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                У вас пока нет доступных проектов для создания задач.
              </div>
            );
          }
          return (
            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="projectSelect">
                  Проект
                  <select
                    id="projectSelect"
                    className={styles.formSelect}
                    value={projectId}
                    onChange={handleProjectChange}
                    required
                  >
                    {projectsTree.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="boardSelect">
                    Доска
                    <select
                      id="boardSelect"
                      className={styles.formSelect}
                      value={boardId}
                      onChange={handleBoardChange}
                      required
                    >
                      {availableBoards.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="listSelect">
                    Колонка
                    <select
                      id="listSelect"
                      className={styles.formSelect}
                      value={listId}
                      onChange={(e) => setListId(e.target.value)}
                      required
                    >
                      {availableLists.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="taskTitle">
                  Название задачи *
                  <input
                    id="taskTitle"
                    type="text"
                    className={styles.formInput}
                    placeholder="Что нужно сделать?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus // eslint-disable-line jsx-a11y/no-autofocus
                    required
                  />
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="taskDesc">
                  Описание
                  <textarea
                    id="taskDesc"
                    className={styles.formTextarea}
                    placeholder="Детали, ссылки, комментарии…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="taskDueDate">
                  Срок исполнения
                  <input
                    id="taskDueDate"
                    type="datetime-local"
                    className={styles.formInput}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
              </div>

              {availableMembers.length > 0 && (
                <div className={styles.formGroup}>
                  <span className={styles.formLabel}>Участники</span>
                  <div className={styles.membersPills}>
                    {availableMembers.map((m) => {
                      const isSelected = selectedUserIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={classNames(
                            styles.memberPill,
                            isSelected && styles.memberPillSelected,
                          )}
                          onClick={() => toggleUser(m.id)}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {m.name || m.username}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={submitting || !name.trim() || !listId}
              >
                {submitting ? 'Создание…' : 'Создать задачу'}
              </button>
            </form>
          );
        })()}
      </div>
    </div>
  );
});

TelegramTaskCreateModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onCreated: PropTypes.func.isRequired,
};

export default TelegramTaskCreateModal;
