import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export type MealSlotTimeKey = 'Breakfast' | 'Lunch' | 'Dinner';

export type CalendarMealTimeSettings = Record<MealSlotTimeKey, string>;
export type CalendarMealDurationSettings = Record<MealSlotTimeKey, number>;

export type CalendarSettings = {
  timeZone: string;
  mealTimes: CalendarMealTimeSettings;
  mealDurations: CalendarMealDurationSettings;
};

type CalendarSettingsInput = {
  timeZone?: unknown;
  mealTimes?: Partial<Record<MealSlotTimeKey, unknown>>;
  mealDurations?: Partial<Record<MealSlotTimeKey, unknown>>;
};

const defaultSettings: CalendarMealTimeSettings = {
  Breakfast: '08:00',
  Lunch: '12:30',
  Dinner: '18:30',
};

const defaultDurations: CalendarMealDurationSettings = {
  Breakfast: 30,
  Lunch: 30,
  Dinner: 30,
};

const defaultTimeZone = getDefaultTimeZone();

const defaultSettingsFilePath = resolve(process.cwd(), '.data', 'calendar-meal-times.json');

export type CalendarSettingsStore = ReturnType<typeof createCalendarSettingsStore>;

export const createCalendarSettingsStore = (filePath = defaultSettingsFilePath) => {
  const getSettings = () => {
    const storedSettings = readSettings(filePath);
    return storedSettings ?? { timeZone: defaultTimeZone, mealTimes: defaultSettings, mealDurations: defaultDurations };
  };

  const updateSettings = (nextSettings: CalendarSettingsInput) => {
    const normalizedSettings = normalizeSettings(nextSettings);
    persistSettings(filePath, normalizedSettings);
    return normalizedSettings;
  };

  return {
    filePath,
    getSettings,
    updateSettings,
  };
};

const readSettings = (filePath: string): CalendarSettings | null => {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as CalendarSettingsInput;
    return normalizeSettings(parsed);
  } catch {
    return null;
  }
};

const persistSettings = (filePath: string, settings: CalendarSettings) => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(settings, null, 2)}\n`, { encoding: 'utf8' });
};

const normalizeSettings = (value: CalendarSettingsInput): CalendarSettings => ({
  timeZone: normalizeTimeZone(value.timeZone, defaultTimeZone),
  mealTimes: {
    Breakfast: normalizeTime(value.mealTimes?.Breakfast, defaultSettings.Breakfast),
    Lunch: normalizeTime(value.mealTimes?.Lunch, defaultSettings.Lunch),
    Dinner: normalizeTime(value.mealTimes?.Dinner, defaultSettings.Dinner),
  },
  mealDurations: {
    Breakfast: normalizeDuration(value.mealDurations?.Breakfast, defaultDurations.Breakfast),
    Lunch: normalizeDuration(value.mealDurations?.Lunch, defaultDurations.Lunch),
    Dinner: normalizeDuration(value.mealDurations?.Dinner, defaultDurations.Dinner),
  },
});

const normalizeTime = (value: unknown, fallback: string) => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(candidate) ? candidate : fallback;
};

const normalizeDuration = (value: unknown, fallback: number) => {
  const candidate =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseInt(value.trim(), 10)
        : Number.NaN;

  return Number.isInteger(candidate) && candidate > 0 && candidate <= 720 ? candidate : fallback;
};

function normalizeTimeZone(value: unknown, fallback: string) {
  const candidate = typeof value === 'string' ? value.trim() : '';

  if (!candidate) {
    return fallback;
  }

  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: candidate }).format(new Date());
    return candidate;
  } catch {
    return fallback;
  }
}

function getDefaultTimeZone() {
  return normalizeTimeZone(process.env.TZ, 'UTC');
}