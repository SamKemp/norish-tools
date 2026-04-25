import type { NorishCalendarListItem } from './norish-client.js';
import type { CalendarSettings, MealSlotTimeKey } from './calendar-settings-store.js';

const calendarName = 'Norish Planned Recipes';
const calendarProductId = '-//Norish Tools//Calendar Feed//EN';

export const renderPlannedRecipesMonthCalendar = (items: NorishCalendarListItem[], settings: CalendarSettings) => {
  const sortedItems = [...items].sort((left, right) => {
    const dateComparison = left.date.localeCompare(right.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }

    return left.id.localeCompare(right.id);
  });

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${calendarProductId}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    `X-WR-TIMEZONE:${escapeText(settings.timeZone)}`,
    ...sortedItems.flatMap((item) => renderEvent(item, settings)),
    'END:VCALENDAR',
  ];

  return `${lines.map(foldLine).join('\r\n')}\r\n`;
};

const renderEvent = (item: NorishCalendarListItem, settings: CalendarSettings) => {
  const summaryTitle = item.recipeName ?? item.title ?? 'Untitled item';
  const summary = `${item.slot}: ${summaryTitle}`;
  const descriptionParts = [
    `Meal slot: ${item.slot}`,
    item.recipeName ? `Recipe: ${item.recipeName}` : null,
    item.title && item.title !== item.recipeName ? `Title: ${item.title}` : null,
    item.itemType ? `Item type: ${item.itemType}` : null,
    item.servings !== null ? `Servings: ${item.servings}` : null,
    item.calories !== null ? `Calories: ${item.calories}` : null,
    item.recipeId ? `Recipe ID: ${item.recipeId}` : null,
    `Planned item ID: ${item.id}`,
    ...buildTimeDescription(item.slot, settings),
  ].filter((value): value is string => value !== null);

  const timedSlot = getTimedSlot(item.slot);
  const eventTiming = timedSlot
    ? buildTimedEvent(item.date, settings.mealTimes[timedSlot], settings.mealDurations[timedSlot], settings.timeZone)
    : buildAllDayEvent(item.date);

  return [
    'BEGIN:VEVENT',
    `UID:${item.id}@norish-tools`,
    `DTSTAMP:${formatTimestamp(new Date())}`,
    ...eventTiming,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(descriptionParts.join('\n'))}`,
    `CATEGORIES:${escapeText(item.slot)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ];
};

const buildAllDayEvent = (date: string) => {
  const startDate = formatDateForIcs(date);
  const endDate = formatDateForIcs(addDays(date, 1));

  return [`DTSTART;VALUE=DATE:${startDate}`, `DTEND;VALUE=DATE:${endDate}`];
};

const buildTimedEvent = (date: string, time: string, durationMinutes: number, timeZone: string) => {
  const start = formatLocalDateTime(date, time);
  const end = formatLocalDateTime(date, addMinutes(time, durationMinutes));
  const escapedTimeZone = escapePropertyParameter(timeZone);

  return [`DTSTART;TZID=${escapedTimeZone}:${start}`, `DTEND;TZID=${escapedTimeZone}:${end}`];
};

const buildTimeDescription = (slot: NorishCalendarListItem['slot'], settings: CalendarSettings) => {
  const timedSlot = getTimedSlot(slot);
  return timedSlot
    ? [`Scheduled time: ${settings.mealTimes[timedSlot]}`, `Duration: ${settings.mealDurations[timedSlot]} minutes`]
    : [];
};

const getTimedSlot = (slot: NorishCalendarListItem['slot']): MealSlotTimeKey | null => {
  if (slot === 'Breakfast' || slot === 'Lunch' || slot === 'Dinner') {
    return slot;
  }

  return null;
};

const formatTimestamp = (value: Date) =>
  `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}${pad(value.getUTCSeconds())}Z`;

const formatDateForIcs = (value: string) => value.replaceAll('-', '');

const formatLocalDateTime = (date: string, time: string) => `${formatDateForIcs(date)}T${time.replace(':', '')}00`;

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
};

const addMinutes = (value: string, minutes: number) => {
  const [hoursString, minutesString] = value.split(':');
  const totalMinutes = Number.parseInt(hoursString ?? '0', 10) * 60 + Number.parseInt(minutesString ?? '0', 10) + minutes;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const remainingMinutes = normalizedMinutes % 60;

  return `${pad(hours)}:${pad(remainingMinutes)}`;
};

const pad = (value: number) => value.toString().padStart(2, '0');

const escapeText = (value: string) =>
  value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll('\n', '\\n');

const foldLine = (value: string) => {
  if (value.length <= 75) {
    return value;
  }

  const chunks: string[] = [];

  for (let index = 0; index < value.length; index += 75) {
    chunks.push(`${index === 0 ? '' : ' '}${value.slice(index, index + 75)}`);
  }

  return chunks.join('\r\n');
};

const escapePropertyParameter = (value: string) => value.replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll(':', '\\:');
