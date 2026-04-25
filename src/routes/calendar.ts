import type { FastifyInstance, FastifyRequest } from 'fastify';

import type { CalendarMealDurationSettings, CalendarMealTimeSettings } from '../services/calendar-settings-store.js';
import { renderPlannedRecipesMonthCalendar } from '../services/calendar-ics.js';
import { isAuthenticated } from './auth.js';

type CalendarSettingsBody = {
  mealTimes?: Partial<CalendarMealTimeSettings>;
  mealDurations?: Partial<CalendarMealDurationSettings>;
};

export const registerCalendarRoutes = (app: FastifyInstance) => {
  app.post('/calendar/token/regenerate', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.code(401).send({ message: 'Unauthorized token rotation request' });
    }

    const token = app.calendarTokenStore.regenerateToken();
    return reply.send({ token });
  });

  app.post<{ Body: CalendarSettingsBody }>('/calendar/settings', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.code(401).send({ message: 'Unauthorized calendar settings update' });
    }

    const settings = app.calendarSettingsStore.updateSettings({
      mealTimes: {
        Breakfast: request.body?.mealTimes?.Breakfast,
        Lunch: request.body?.mealTimes?.Lunch,
        Dinner: request.body?.mealTimes?.Dinner,
      },
      mealDurations: {
        Breakfast: request.body?.mealDurations?.Breakfast,
        Lunch: request.body?.mealDurations?.Lunch,
        Dinner: request.body?.mealDurations?.Dinner,
      },
    });

    return reply.send({
      message: 'Calendar meal times updated.',
      settings,
    });
  });

  app.get<{ Querystring: { token?: string } }>('/calendar/planned-recipes/month.ics', async (request, reply) => {
    if (!hasCalendarAccess(request)) {
      return reply.code(401).send({ message: 'Unauthorized calendar feed access' });
    }

    try {
      const items = await app.norish.getPlannedRecipesMonth();
      const body = renderPlannedRecipesMonthCalendar(items, app.calendarSettingsStore.getSettings());

      return reply
        .header('content-type', 'text/calendar; charset=utf-8')
        .header('content-disposition', 'inline; filename="norish-planned-recipes-month.ics"')
        .send(body);
    } catch (error) {
      request.log.error(error, 'Unable to build planned recipe calendar feed');

      return reply.code(502).send({ message: 'Unable to fetch monthly planned recipes from Norish' });
    }
  });
};

const hasCalendarAccess = (request: FastifyRequest<{ Querystring: { token?: string } }>) => {
  if (isAuthenticated(request)) {
    return true;
  }

  return request.query.token === request.server.calendarTokenStore.getToken();
};
