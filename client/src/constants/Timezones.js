/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

export const COMMON_TIMEZONES = [
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Moscow', label: 'Москва, Санкт-Петербург (UTC+3)' },
  { value: 'Europe/Samara', label: 'Самара, Саратов (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск, Томск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
  { value: 'Europe/Kyiv', label: 'Киев (UTC+2 / UTC+3)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (UTC+5)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+5)' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси (UTC+4)' },
  { value: 'Asia/Yerevan', label: 'Ереван (UTC+4)' },
  { value: 'Asia/Baku', label: 'Баку (UTC+4)' },
  { value: 'UTC', label: 'UTC (Всемирное время)' },
  { value: 'Europe/London', label: 'Лондон (UTC+0 / UTC+1)' },
  { value: 'Europe/Berlin', label: 'Берлин, Париж, Рим (UTC+1 / UTC+2)' },
  { value: 'Europe/Warsaw', label: 'Варшава (UTC+1 / UTC+2)' },
  { value: 'America/New_York', label: 'Нью-Йорк (UTC-5 / UTC-4)' },
  { value: 'America/Chicago', label: 'Чикаго (UTC-6 / UTC-5)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8 / UTC-7)' },
  { value: 'Asia/Dubai', label: 'Дубай (UTC+4)' },
  { value: 'Asia/Singapore', label: 'Сингапур (UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
];

export const getTimezonesList = (currentTz) => {
  if (!currentTz) {
    return COMMON_TIMEZONES;
  }
  const exists = COMMON_TIMEZONES.some((tz) => tz.value === currentTz);
  if (exists) {
    return COMMON_TIMEZONES;
  }
  return [{ value: currentTz, label: `${currentTz} (Текущий)` }, ...COMMON_TIMEZONES];
};

export default {
  COMMON_TIMEZONES,
  getTimezonesList,
};
