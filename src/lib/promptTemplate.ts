export const SOURCE_LANG_PLACEHOLDER = '{SOURCE_LANG}';
export const TARGET_LANG_PLACEHOLDER = '{TARGET_LANG}';

export const DEFAULT_PROMPT_TEMPLATE = `You are converting source material into a vocabulary list for a flash-card app.

Source language (the words to learn): ${SOURCE_LANG_PLACEHOLDER}
Translation language (the user's known language): ${TARGET_LANG_PLACEHOLDER}

The source material is appended below, after the marker \`---INPUT---\`. It may
be a word list, a textbook page, lesson notes, OCR output, or arbitrary text.
Extract every distinct vocabulary item suitable for drilling.

For each item produce one JSON object with:
- "id": short stable slug, lowercase ASCII letters/digits/hyphens only, no
  spaces. Derive from the term itself (e.g. "der Hund" -> "hund",
  "to go to school" -> "to-go-to-school"). Must be unique within the list.
- "term": the word or short phrase in ${SOURCE_LANG_PLACEHOLDER}, exactly as it should be
  displayed and typed by the learner. Include articles for nouns, accents,
  capitalization conventions of the language.
- "translation": the ${TARGET_LANG_PLACEHOLDER} equivalent. Keep it short and unambiguous.

Also produce a top-level "settings" object:
- "articlePrefixes": array of leading article tokens common in ${SOURCE_LANG_PLACEHOLDER}
  that a learner might omit when typing (e.g. ["der","die","das"] for German,
  ["el","la","los","las"] for Spanish, ["le","la","les"] for French). Use []
  if the language has no such articles or it does not apply.

Output exactly one JSON object and nothing else — no prose, no markdown
fences, no commentary. Schema:

{
  "settings": { "articlePrefixes": [...] },
  "words": [
    { "id": "...", "term": "...", "translation": "..." }
  ]
}

Rules:
- ids must be unique; if two items would collide, suffix with -2, -3, ...
- skip exact duplicates
- do not include grammar metadata (gender labels, part-of-speech tags) as
  separate fields; if useful, fold into "term" the way a dictionary would
- if input is empty or unusable, return {"settings":{"articlePrefixes":[]},"words":[]}

---INPUT---
<paste your source material here>
`;

export function renderPrompt(
  sourceLang: string,
  targetLang: string,
  template: string = DEFAULT_PROMPT_TEMPLATE,
): string {
  const src = sourceLang.trim() || '<source language>';
  const tgt = targetLang.trim() || '<target language>';
  return template
    .split(SOURCE_LANG_PLACEHOLDER)
    .join(src)
    .split(TARGET_LANG_PLACEHOLDER)
    .join(tgt);
}
