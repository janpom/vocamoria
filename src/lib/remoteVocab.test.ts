import { describe, expect, it, vi } from 'vitest';
import { RemoteVocabError, fetchRemoteVocab } from './remoteVocab';

const goodBody = JSON.stringify({
  settings: { articlePrefixes: ['der'] },
  words: [{ id: 'hund', term: 'der Hund', translation: 'pes' }],
});

const mockFetch = (init: ResponseInit, body = '') =>
  vi.fn(async () => new Response(body, init)) as unknown as typeof fetch;

describe('fetchRemoteVocab', () => {
  it('rejects non-http(s) URLs', async () => {
    await expect(fetchRemoteVocab('javascript:alert(1)')).rejects.toThrow(RemoteVocabError);
    await expect(fetchRemoteVocab('javascript:alert(1)')).rejects.toThrow(/http/);
    await expect(fetchRemoteVocab('file:///etc/passwd')).rejects.toThrow(/http/);
  });

  it('rejects malformed URLs', async () => {
    await expect(fetchRemoteVocab('not a url')).rejects.toThrow(/valid URL/);
  });

  it('wraps network errors', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch');
    }) as unknown as typeof fetch;
    await expect(fetchRemoteVocab('https://example.com/v.json', f)).rejects.toThrow(
      /CORS|Failed to fetch/,
    );
  });

  it('throws on non-2xx response', async () => {
    const f = mockFetch({ status: 404, statusText: 'Not Found' }, 'nope');
    await expect(fetchRemoteVocab('https://example.com/v.json', f)).rejects.toThrow(/404/);
  });

  it('throws RemoteVocabError when body is not valid vocab JSON', async () => {
    const f = mockFetch({ status: 200 }, 'not json');
    await expect(fetchRemoteVocab('https://example.com/v.json', f)).rejects.toThrow(
      RemoteVocabError,
    );
    const f2 = mockFetch({ status: 200 }, JSON.stringify({ words: [{ id: '!' }] }));
    await expect(fetchRemoteVocab('https://example.com/v.json', f2)).rejects.toThrow(
      /not valid vocab JSON/,
    );
  });

  it('returns the parsed Vocab on success', async () => {
    const f = mockFetch({ status: 200 }, goodBody);
    const v = await fetchRemoteVocab('https://example.com/v.json', f);
    expect(v.words).toHaveLength(1);
    expect(v.words[0]).toEqual({ id: 'hund', term: 'der Hund', translation: 'pes' });
    expect(v.settings.articlePrefixes).toEqual(['der']);
  });
});
