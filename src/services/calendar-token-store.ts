import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const defaultTokenFilePath = resolve(process.cwd(), '.data', 'calendar-feed-token');

export type CalendarTokenStore = ReturnType<typeof createCalendarTokenStore>;

export const createCalendarTokenStore = (filePath = defaultTokenFilePath) => {
  const ensureToken = () => {
    const existingToken = readToken(filePath);

    if (existingToken) {
      return existingToken;
    }

    const generatedToken = generateToken();
    persistToken(filePath, generatedToken);
    return generatedToken;
  };

  const getToken = () => ensureToken();

  const regenerateToken = () => {
    const generatedToken = generateToken();
    persistToken(filePath, generatedToken);
    return generatedToken;
  };

  return {
    getToken,
    regenerateToken,
    filePath,
  };
};

const readToken = (filePath: string) => {
  try {
    const token = readFileSync(filePath, 'utf8').trim();
    return token.length >= 32 ? token : null;
  } catch {
    return null;
  }
};

const persistToken = (filePath: string, token: string) => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${token}\n`, { encoding: 'utf8' });
};

const generateToken = () => randomBytes(32).toString('hex');