import type { NorishPlannedRecipe } from './norish-client.js';

const calendarName = 'Norish Planned Recipes';
const calendarProductId = '-//Norish Tools//Calendar Feed//EN';

export const renderPlannedRecipesMonthCalendar = (items: NorishPlannedRecipe[]) => {
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
    ...sortedItems.flatMap((item) => renderEvent(item)),
    'END:VCALENDAR',
  ];

  return `${lines.map(foldLine).join('\r\n')}\r\n`;
};

const renderEvent = (item: NorishPlannedRecipe) => {
  const startDate = formatDateForIcs(item.date);
  const endDate = formatDateForIcs(addDays(item.date, 1));
  const summary = `${item.slot}: ${item.recipeName ?? 'Untitled recipe'}`;
  const descriptionParts = [
    `Meal slot: ${item.slot}`,
    item.recipeName ? `Recipe: ${item.recipeName}` : null,
    item.servings !== null ? `Servings: ${item.servings}` : null,
    item.calories !== null ? `Calories: ${item.calories}` : null,
    `Recipe ID: ${item.recipeId}`,
    `Planned item ID: ${item.id}`,
  ].filter((value): value is string => value !== null);

  return [
    'BEGIN:VEVENT',
    `UID:${item.id}@norish-tools`,
    `DTSTAMP:${formatTimestamp(new Date())}`,
    `DTSTART;VALUE=DATE:${startDate}`,
    `DTEND;VALUE=DATE:${endDate}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(descriptionParts.join('\n'))}`,
    `CATEGORIES:${escapeText(item.slot)}`,
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ];
};

const formatTimestamp = (value: Date) =>
  `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}T${pad(value.getUTCHours())}${pad(value.getUTCMinutes())}${pad(value.getUTCSeconds())}Z`;

const formatDateForIcs = (value: string) => value.replaceAll('-', '');

const addDays = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
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
