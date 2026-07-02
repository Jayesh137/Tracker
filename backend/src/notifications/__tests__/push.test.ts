import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn()
  }
}));

import webpush from 'web-push';
import { configurePush, sendPushNotification, sendToAllSubscriptions } from '../push.js';

const sub = (endpoint: string) => ({
  endpoint,
  keys: { p256dh: 'p', auth: 'a' }
});

const mockSend = webpush.sendNotification as ReturnType<typeof vi.fn>;

describe('push expiry semantics', () => {
  beforeEach(() => {
    mockSend.mockReset();
    configurePush('pub', 'priv', 'mailto:x@x.com');
  });

  it('returns ok on success', async () => {
    mockSend.mockResolvedValue({});
    expect(await sendPushNotification(sub('e1'), 't', 'b')).toBe('ok');
  });

  it('returns expired only for 404/410', async () => {
    mockSend.mockRejectedValueOnce({ statusCode: 410, message: 'gone' });
    expect(await sendPushNotification(sub('e1'), 't', 'b')).toBe('expired');
    mockSend.mockRejectedValueOnce({ statusCode: 404, message: 'not found' });
    expect(await sendPushNotification(sub('e1'), 't', 'b')).toBe('expired');
  });

  it('treats 5xx and network errors as transient failures', async () => {
    mockSend.mockRejectedValueOnce({ statusCode: 503, message: 'unavailable' });
    expect(await sendPushNotification(sub('e1'), 't', 'b')).toBe('failed');
    mockSend.mockRejectedValueOnce(new Error('ECONNRESET'));
    expect(await sendPushNotification(sub('e1'), 't', 'b')).toBe('failed');
  });

  it('sendToAllSubscriptions only reports truly expired endpoints for removal', async () => {
    mockSend.mockImplementation(async ({ endpoint }: { endpoint: string }) => {
      if (endpoint === 'expired') throw { statusCode: 410, message: 'gone' };
      if (endpoint === 'flaky') throw { statusCode: 503, message: 'unavailable' };
      return {};
    });

    const expired = await sendToAllSubscriptions(
      [sub('ok'), sub('expired'), sub('flaky')],
      't',
      'b'
    );

    expect(expired).toEqual(['expired']);
  });
});
