import type { FastifyInstance, FastifyRequest } from 'fastify';

import { renderPlannedRecipesMonthCalendar } from '../services/calendar-ics.js';
import { isAuthenticated } from './auth.js';

export const registerCalendarRoutes = (app: FastifyInstance) => {
  app.post('/calendar/token/regenerate', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.code(401).send({ message: 'Unauthorized token rotation request' });
    }

    const token = app.calendarTokenStore.regenerateToken();
    return reply.send({ token });
  });

  app.get<{ Querystring: { token?: string } }>('/calendar/planned-recipes/month.ics', async (request, reply) => {
    if (!hasCalendarAccess(request)) {
      return reply.code(401).send({ message: 'Unauthorized calendar feed access' });
    }

    try {
      const items = await app.norish.getPlannedRecipesMonth();
      const body = renderPlannedRecipesMonthCalendar(items);

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
