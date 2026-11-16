/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const DEFAULT_NOTIFICATION_DAYS = [1, 2, 3, 4, 5];

export const WEEKDAYS = [
  { value: 1, short: 'Пн', label: 'Понедельник' },
  { value: 2, short: 'Вт', label: 'Вторник' },
  { value: 3, short: 'Ср', label: 'Среда' },
  { value: 4, short: 'Чт', label: 'Четверг' },
  { value: 5, short: 'Пт', label: 'Пятница' },
  { value: 6, short: 'Сб', label: 'Суббота' },
  { value: 7, short: 'Вс', label: 'Воскресенье' },
];

export const toggleNotificationDay = (currentDays, dayValue) => {
  const days = Array.isArray(currentDays) ? currentDays : DEFAULT_NOTIFICATION_DAYS;
  if (days.includes(dayValue)) {
    return days.filter((d) => d !== dayValue);
  }
  return [...days, dayValue].sort((a, b) => a - b);
};
