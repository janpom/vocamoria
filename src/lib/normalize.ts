export type NormalizeOptions = {
  articlePrefixes?: string[];
};

export type AnswerCheck = {
  correct: boolean;
  close: boolean;
};

export function normalize(input: string, opts: NormalizeOptions = {}): string {
  let s = input.trim().toLowerCase();
  s = s.replace(/[.,;:!?]+$/u, '').trim();
  const prefixes = (opts.articlePrefixes ?? [])
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  for (const p of prefixes) {
    const re = new RegExp(`^${escapeRegex(p)}\\s+`);
    if (re.test(s)) {
      s = s.replace(re, '');
      break;
    }
  }
  return s;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

export function checkAnswer(
  input: string,
  term: string,
  alternates: string[] = [],
  opts: NormalizeOptions = {},
): AnswerCheck {
  const guess = normalize(input, opts);
  if (!guess) return { correct: false, close: false };
  const candidates = [term, ...alternates].map((c) => normalize(c, opts));
  if (candidates.includes(guess)) return { correct: true, close: false };
  const target = candidates[0];
  if (target.length > 4 && levenshtein(guess, target) <= 1) {
    return { correct: true, close: true };
  }
  return { correct: false, close: false };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/\p{M}+/gu, '');
}

export function normalizeLetter(c: string): string {
  return stripAccents(c.toLowerCase());
}

export function lettersEqual(a: string, b: string): boolean {
  return normalizeLetter(a) === normalizeLetter(b);
}

export function isGuessableLetter(c: string): boolean {
  return /\p{L}/u.test(c);
}
