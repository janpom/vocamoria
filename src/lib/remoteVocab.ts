import type { Vocab } from './types';
import { VocabValidationError, importVocab } from './vocab';

export class RemoteVocabError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RemoteVocabError';
  }
}

function validateUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new RemoteVocabError(`Not a valid URL: ${raw}`);
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') {
    throw new RemoteVocabError(`Only http(s) URLs are supported (got ${u.protocol}).`);
  }
  return u;
}

export async function fetchRemoteVocab(url: string, fetchImpl: typeof fetch = fetch): Promise<Vocab> {
  const u = validateUrl(url);
  let res: Response;
  try {
    res = await fetchImpl(u.toString(), { redirect: 'follow' });
  } catch (e) {
    throw new RemoteVocabError(
      `Could not reach the URL — network error or CORS blocked. ${(e as Error).message}`,
    );
  }
  if (!res.ok) {
    throw new RemoteVocabError(`Server responded with ${res.status} ${res.statusText}.`);
  }
  const text = await res.text();
  try {
    return importVocab(text);
  } catch (e) {
    if (e instanceof VocabValidationError) {
      throw new RemoteVocabError(`Fetched, but the content is not valid vocab JSON: ${e.message}`);
    }
    throw e;
  }
}
