import { describe, it, expect, afterEach, vi } from 'vitest';
import { requireToken } from '../routes.js';

function run(headers: Record<string, string>, query: Record<string, string> = {}) {
  const req: any = {
    header: (name: string) => headers[name.toLowerCase()],
    query
  };
  const res: any = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }
  };
  const next = vi.fn();
  requireToken(req, res, next);
  return { res, next };
}

describe('requireToken', () => {
  afterEach(() => {
    delete process.env.API_TOKEN;
  });

  it('is open when API_TOKEN is unset', () => {
    const { next } = run({});
    expect(next).toHaveBeenCalled();
  });

  it('rejects missing or wrong token with 401', () => {
    process.env.API_TOKEN = 'secret';
    expect(run({}).res.statusCode).toBe(401);
    expect(run({ 'x-api-token': 'nope' }).res.statusCode).toBe(401);
  });

  it('accepts the token via header or query param', () => {
    process.env.API_TOKEN = 'secret';
    expect(run({ 'x-api-token': 'secret' }).next).toHaveBeenCalled();
    expect(run({}, { token: 'secret' }).next).toHaveBeenCalled();
  });
});
