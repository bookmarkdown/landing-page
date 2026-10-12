import { createIcons, createElement, Bookmark, Tag, Search, ArrowUpRight, ArrowUp, LockKeyhole, Sparkles, Undo2, Check, Languages, X } from 'lucide';
import { matchLocale, resolveLocale, translate } from './i18n.js';

createIcons({ icons: { Bookmark, Tag, Search, ArrowUpRight, ArrowUp, LockKeyhole, Sparkles, Undo2, Check, Languages }, attrs: { 'stroke-width': 1.5 } });

const bookmarks = [
  { id: 'mdn', title: 'MDN Web Docs', domain: 'developer.mozilla.org', tags: ['development', 'reference'] },
  { id: 'github', title: 'GitHub Docs', domain: 'docs.github.com', tags: ['development'] },
  { id: 'chrome', title: 'Chrome Extensions', domain: 'developer.chrome.com', tags: ['development', 'reference'] }
];
const search = document.getElementById('bookmark-search');
const feedback = document.getElementById('tag-feedback');
const agentResult = document.getElementById('agent-result');
const addButton = document.getElementById('agent-add');
const addLabel = document.getElementById('agent-add-label');
const undoButton = document.getElementById('agent-undo');
const languageSelect = document.getElementById('language-select');
const preferenceKey = 'bmd-language';
let locale = 'en';
let activeFilter = 'all';
let lastAdded = [];
let feedbackState = null;
let agentState = null;
const text = (key, parameters) => translate(locale, key, parameters);

function savedLanguage() {
  try {
    return window.localStorage.getItem(preferenceKey);
  } catch {
    return null;
  }
}

function renderStatus() {
  const parameters = feedbackState?.parameters ?? {};
  feedback.textContent = feedbackState ? text(feedbackState.key, {
    ...parameters,
    tag: parameters.tagKey ? text(`tags.${parameters.tagKey}`) : ''
  }) : '';
  agentResult.hidden = !agentState;
  agentResult.textContent = agentState ? text(agentState.key, agentState.parameters) : '';
  addLabel.textContent = text(addButton.disabled ? 'organizing' : 'agentAdd');
}

function applyLanguage() {
  const requested = new URL(window.location.href).searchParams.get('lang');
  const saved = savedLanguage();
  locale = resolveLocale({ requested, saved, languages: navigator.languages ?? [navigator.language] });
  languageSelect.value = requested === 'auto' ? 'auto' : matchLocale(requested) ?? matchLocale(saved) ?? 'auto';
  document.documentElement.lang = locale;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = text(element.dataset.i18n);
  });
  for (const attribute of ['aria-label', 'placeholder', 'content', 'href']) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(element => {
      element.setAttribute(attribute, text(element.getAttribute(`data-i18n-${attribute}`)));
    });
  }
  renderTags();
  renderStatus();
}

languageSelect.addEventListener('change', () => {
  const preference = languageSelect.value;
  try {
    if (preference === 'auto') window.localStorage.removeItem(preferenceKey);
    else window.localStorage.setItem(preferenceKey, preference);
  } catch {}
  const url = new URL(window.location.href);
  url.searchParams.set('lang', preference);
  history.replaceState(null, '', url);
  applyLanguage();
});
window.addEventListener('popstate', applyLanguage);
window.addEventListener('languagechange', () => {
  if (languageSelect.value === 'auto') applyLanguage();
});

function filterBookmarks() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const bookmark of bookmarks) {
    const matchesFilter = activeFilter === 'all' || bookmark.tags.includes(activeFilter);
    const matchesSearch = [bookmark.title, bookmark.domain, ...bookmark.tags.map(tag => text(`tags.${tag}`))].join(' ').toLocaleLowerCase().includes(query);
    const row = document.querySelector(`[data-bookmark="${bookmark.id}"]`);
    row.hidden = !(matchesFilter && matchesSearch);
    if (!row.hidden) visible++;
  }
  document.getElementById('library-title').textContent = activeFilter === 'all' ? text('allBookmarks') : text('filterTitle', { tag: text(`tags.${activeFilter}`) });
  document.getElementById('bookmark-count').textContent = text('bookmarkCount', { count: visible });
  document.getElementById('empty-state').hidden = visible > 0;
}

function renderTags() {
  for (const bookmark of bookmarks) {
    const container = document.querySelector(`[data-tags-for="${bookmark.id}"]`);
    container.replaceChildren();
    for (const tag of bookmark.tags) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tag';
      const tagLabel = text(`tags.${tag}`);
      button.dataset.tag = tag;
      button.textContent = `#${tagLabel}`;
      button.setAttribute('aria-label', text('removeTag', { title: bookmark.title, tag: tagLabel }));
      button.title = text('removeTagHint', { tag: tagLabel });
      button.append(createElement(X, { 'aria-hidden': 'true', 'stroke-width': 1.5 }));
      button.addEventListener('click', () => {
        bookmark.tags = bookmark.tags.filter(value => value !== tag);
        feedbackState = { key: 'tagRemoved', parameters: { title: bookmark.title, tagKey: tag } };
        renderTags();
        renderStatus();
        const nextControl = container.querySelector('button');
        if (nextControl && !nextControl.closest('.bookmark-row').hidden) nextControl.focus();
        else search.focus();
      });
      container.append(button);
    }
  }
  filterBookmarks();
}

document.querySelectorAll('[data-filter]').forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    feedbackState = null;
    renderStatus();
    filterBookmarks();
  });
});
search.addEventListener('input', filterBookmarks);

addButton.addEventListener('click', async () => {
  addButton.disabled = true;
  addButton.setAttribute('aria-busy', 'true');
  agentState = { key: 'adding' };
  renderStatus();
  await new Promise(resolve => window.setTimeout(resolve, 450));
  try {
    lastAdded = bookmarks.filter(bookmark => !bookmark.tags.includes('technicalDocs')).map(bookmark => bookmark.id);
    for (const bookmark of bookmarks) {
      if (lastAdded.includes(bookmark.id)) bookmark.tags.push('technicalDocs');
    }
    renderTags();
    addButton.hidden = true;
    undoButton.hidden = false;
    agentState = { key: lastAdded.length ? 'added' : 'alreadyAdded', parameters: { count: lastAdded.length } };
    feedbackState = { key: 'completed' };
    undoButton.focus();
  } catch {
    agentState = { key: 'failed' };
  } finally {
    addButton.disabled = false;
    addButton.removeAttribute('aria-busy');
    renderStatus();
  }
});

undoButton.addEventListener('click', () => {
  for (const bookmark of bookmarks) {
    if (lastAdded.includes(bookmark.id)) bookmark.tags = bookmark.tags.filter(tag => tag !== 'technicalDocs');
  }
  lastAdded = [];
  renderTags();
  addButton.hidden = false;
  undoButton.hidden = true;
  agentState = { key: 'undone' };
  feedbackState = null;
  renderStatus();
  addButton.focus();
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const target = document.getElementById(link.hash.slice(1));
    if (!target) return;
    event.preventDefault();
    const navHeight = document.querySelector('.topnav').getBoundingClientRect().height;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 22;
    window.scrollTo({ top: Math.max(0, top), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    const url = new URL(window.location.href);
    url.hash = link.hash;
    history.replaceState(null, '', url);
    const previouslyFocusable = target.hasAttribute('tabindex');
    if (!previouslyFocusable) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    if (!previouslyFocusable) target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  });
});
applyLanguage();
languageSelect.closest('.language-picker').hidden = false;