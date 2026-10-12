import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { matchLocale, resolveLocale, supportedLocales, messages, translate } from '../src/i18n.js';

test('English is the fallback for absent or unsupported languages', () => {
  assert.equal(resolveLocale(), 'en');
  assert.equal(resolveLocale({ languages: ['fr-FR', 'ja-JP'] }), 'en');
  assert.equal(matchLocale(null), null);
});

test('browser language variants match scripts and regions', () => {
  for (const language of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-CN', 'ZH_tw']) {
    assert.equal(matchLocale(language), 'zh-Hant');
  }
  for (const language of ['zh', 'zh-CN', 'zh-SG', 'zh-Hans', 'zh-Hans-TW']) {
    assert.equal(matchLocale(language), 'zh-Hans');
  }
  assert.equal(matchLocale('en-GB'), 'en');
  assert.equal(matchLocale('zh-not-a-language'), 'zh-Hans');
});

test('URL choice takes priority over saved preference and browser languages', () => {
  assert.equal(resolveLocale({ requested: 'en', saved: 'zh-Hant', languages: ['zh-CN'] }), 'en');
  assert.equal(resolveLocale({ saved: 'zh-Hant', languages: ['en-US'] }), 'zh-Hant');
  assert.equal(resolveLocale({ requested: 'invalid', saved: 'invalid', languages: ['fr-FR', 'zh-TW', 'en-US'] }), 'zh-Hant');
  assert.equal(resolveLocale({ requested: 'auto', saved: 'zh-Hant', languages: ['en-US', 'zh-TW'] }), 'en');
});

test('all locales have complete translations and matching placeholders', () => {
  const keys = Object.keys(messages.en).sort();
  for (const locale of supportedLocales) {
    assert.deepEqual(Object.keys(messages[locale]).sort(), keys);
    for (const key of keys) {
      assert.ok(messages[locale][key].trim());
      assert.deepEqual(messages[locale][key].match(/\{\w+\}/g)?.sort() ?? [], messages.en[key].match(/\{\w+\}/g)?.sort() ?? []);
    }
  }
  assert.equal(translate('en', 'bookmarkCount', { count: 3 }), '3 samples');
  assert.equal(translate('zh-Hant', 'removeTag', { title: 'MDN', tag: '開發' }), '移除 MDN 的「開發」標籤');
  assert.equal(translate('unsupported', 'allBookmarks'), 'All bookmarks');
});

test('all languages and static copy avoid secrecy and unreleased-content teasers', () => {
  const teaser = /保密|未.*公開|未.*公开|under wraps|not fully revealed|not public|not revealed|public scope/i;
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, teaser);
  for (const locale of supportedLocales) {
    for (const message of Object.values(messages[locale])) assert.doesNotMatch(message, teaser);
  }
  for (const [, key] of html.matchAll(/data-i18n(?:-content|-aria-label|-placeholder|-href)?="([^"]+)"/g)) {
    assert.ok(messages.en[key], `Missing translation for ${key}`);
  }
  assert.doesNotMatch(html, /(?:id|href)="(?:#)?disclosure"/);
});