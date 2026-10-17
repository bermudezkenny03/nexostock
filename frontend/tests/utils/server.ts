import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

/** Same base URL the app uses when VITE_API_BASE_URL is not set. */
export const API = 'http://localhost:3000/api';

export const server = setupServer();

export function useMockServer(): void {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
}
