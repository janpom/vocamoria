import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROMPT_TEMPLATE,
  SOURCE_LANG_PLACEHOLDER,
  TARGET_LANG_PLACEHOLDER,
  renderPrompt,
} from './promptTemplate';

describe('DEFAULT_PROMPT_TEMPLATE', () => {
  it('contains both placeholders', () => {
    expect(DEFAULT_PROMPT_TEMPLATE).toContain(SOURCE_LANG_PLACEHOLDER);
    expect(DEFAULT_PROMPT_TEMPLATE).toContain(TARGET_LANG_PLACEHOLDER);
  });

  it('asks for strict JSON output (no markdown fences)', () => {
    expect(DEFAULT_PROMPT_TEMPLATE).toMatch(/no markdown\s+fences/);
  });
});

describe('renderPrompt', () => {
  it('substitutes both placeholders everywhere they occur', () => {
    const out = renderPrompt('German', 'Czech');
    expect(out).not.toContain(SOURCE_LANG_PLACEHOLDER);
    expect(out).not.toContain(TARGET_LANG_PLACEHOLDER);
    expect(out).toContain('German');
    expect(out).toContain('Czech');
  });

  it('falls back to a placeholder hint when a language is empty', () => {
    const out = renderPrompt('', '');
    expect(out).toContain('<source language>');
    expect(out).toContain('<target language>');
  });

  it('respects a custom template', () => {
    const tpl = `S=${SOURCE_LANG_PLACEHOLDER},T=${TARGET_LANG_PLACEHOLDER}`;
    expect(renderPrompt('A', 'B', tpl)).toBe('S=A,T=B');
  });
});
