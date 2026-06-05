import request from 'supertest';

/**
 * Generic wrapper to extract typed data from supertest responses.
 * Prevents repeating unsafe member access assertions across all E2E tests.
 */
export function getBody<T>(res: request.Response): T {
  return res.body.data as T;
}
