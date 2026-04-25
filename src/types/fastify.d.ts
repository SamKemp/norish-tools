import type { Env } from '../config/env.js';
import type { CalendarTokenStore } from '../services/calendar-token-store.js';
import type { NorishClient } from '../services/norish-client.js';
import type { RecipeTextGenerator } from '../services/openai-client.js';

declare module 'fastify' {
  interface FastifyInstance {
    calendarTokenStore: CalendarTokenStore;
    config: Env;
    norish: NorishClient;
    recipeTextGenerator: RecipeTextGenerator;
  }

  interface FastifyRequest {
    cookies: Record<string, string | undefined>;
    unsignCookie(value: string): { valid: boolean; value: string | null };
  }

  interface FastifyReply {
    setCookie(name: string, value: string, options?: Record<string, unknown>): FastifyReply;
    clearCookie(name: string, options?: Record<string, unknown>): FastifyReply;
  }
}

export {};