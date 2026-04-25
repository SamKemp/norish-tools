import type { FastifyInstance } from 'fastify';

import { env } from '../config/env.js';
import { renderLoginPage } from '../services/frontend.js';

const authCookieName = 'norish-tools-auth';

export const registerAuthRoutes = (app: FastifyInstance) => {
  app.get('/login', async (request, reply) => {
    if (isAuthenticated(request)) {
      return reply.redirect('/');
    }

    return reply.type('text/html; charset=utf-8').send(renderLoginPage());
  });

  app.post<{ Body: { token?: string } }>('/login', async (request, reply) => {
    if (request.body?.token !== env.APP_ACCESS_TOKEN) {
      return reply.code(401).send({ message: 'Invalid access token' });
    }

    reply.setCookie(authCookieName, 'authenticated', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      signed: true,
      secure: env.NODE_ENV === 'production',
    });

    return reply.send({ success: true });
  });

  app.post('/logout', async (_request, reply) => {
    reply.clearCookie(authCookieName, {
      path: '/',
    });

    return reply.redirect('/login');
  });
};

export const isAuthenticated = (request: { cookies: Record<string, string | undefined>; unsignCookie: (value: string) => { valid: boolean; value: string | null } }) => {
  const rawCookie = request.cookies[authCookieName];

  if (!rawCookie) {
    return false;
  }

  const unsignedCookie = request.unsignCookie(rawCookie);
  return unsignedCookie.valid && unsignedCookie.value === 'authenticated';
};
