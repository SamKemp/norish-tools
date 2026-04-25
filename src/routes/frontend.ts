import type { FastifyInstance } from 'fastify';

import {
  renderCalendarPage,
  renderCreateRecipePage,
  renderDeleteRecipePage,
  renderGrocyImportPage,
  renderHomePage,
  renderToolPage,
} from '../services/frontend.js';
import { getToolBySlug, toolCatalog } from '../services/tool-catalog.js';
import { isAuthenticated } from './auth.js';

export const registerFrontendRoutes = (app: FastifyInstance) => {
  app.get('/favicon.svg', async (_request, reply) => {
    try {
      const response = await fetch(new URL('/favicon.svg', app.config.NORISH_BASE_URL), {
        headers: {
          accept: 'image/svg+xml,image/*;q=0.8,*/*;q=0.5',
        },
      });

      if (!response.ok) {
        const body = await safeReadBody(response);
        requestLogProxyFailure(app, `Favicon proxy request failed with ${response.status}: ${body}`);
        return reply.code(502).type('text/plain; charset=utf-8').send('Unable to load favicon');
      }

      const contentType = response.headers.get('content-type') ?? 'image/svg+xml';
      const cacheControl = response.headers.get('cache-control') ?? 'public, max-age=3600';
      const bytes = Buffer.from(await response.arrayBuffer());

      return reply
        .header('cache-control', cacheControl)
        .type(contentType)
        .send(bytes);
    } catch (error) {
      requestLogProxyFailure(app, error instanceof Error ? error.message : 'Unknown favicon proxy error');
      return reply.code(502).type('text/plain; charset=utf-8').send('Unable to load favicon');
    }
  });

  app.get('/', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.redirect('/login');
    }

    return reply.type('text/html; charset=utf-8').send(renderHomePage(toolCatalog));
  });

  app.get<{ Params: { slug: string } }>('/app/tools/:slug', async (request, reply) => {
    if (!isAuthenticated(request)) {
      return reply.redirect('/login');
    }

    const tool = getToolBySlug(request.params.slug);

    if (!tool) {
      return reply.code(404).type('text/html; charset=utf-8').send('Tool page not found');
    }

    if (tool.slug === 'calendar') {
      const origin = getRequestOrigin(request);
      const calendarFeedUrl = `${origin}/calendar/planned-recipes/month.ics?token=${encodeURIComponent(app.calendarTokenStore.getToken())}`;

      return reply.type('text/html; charset=utf-8').send(renderCalendarPage(tool, calendarFeedUrl));
    }

    if (tool.slug === 'grocy-import') {
      return reply.type('text/html; charset=utf-8').send(renderGrocyImportPage(tool));
    }

    if (tool.slug === 'delete-recipe') {
      return reply.type('text/html; charset=utf-8').send(renderDeleteRecipePage(tool));
    }

    if (tool.slug === 'create-recipe') {
      return reply.type('text/html; charset=utf-8').send(renderCreateRecipePage(tool));
    }

    return reply.type('text/html; charset=utf-8').send(renderToolPage(tool));
  });
};

const getRequestOrigin = (request: { headers: Record<string, string | string[] | undefined> }) => {
  const forwardedProto = request.headers['x-forwarded-proto'];
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto ?? 'http';
  const hostHeader = request.headers.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader ?? '127.0.0.1:3000';

  return `${protocol}://${host}`;
};

const safeReadBody = async (response: Response) => {
  try {
    return await response.text();
  } catch {
    return '<unreadable response body>';
  }
};

const requestLogProxyFailure = (app: FastifyInstance, message: string) => {
  app.log.warn({ target: 'favicon-proxy' }, message);
};
