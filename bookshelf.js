/* 书架页：列出本机所有手账本（localStorage syau-books 索引 + syau-book-<id> 内容） */
'use strict';

(() => {
  const BOOKS_KEY = 'syau-books';
  const BOOK_PREFIX = 'syau-book-';
  const $ = (s) => document.querySelector(s);

  const COVER_COLORS = ['#f7d9c4', '#dbe7d3', '#cfe0ee', '#e6d9ec', '#f5e1a4', '#f2c9cf', '#d9e2c0', '#f0d5cf'];

  function getBooks() {
    try {
      const raw = localStorage.getItem(BOOKS_KEY);
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }

  function saveBooks(arr) {
    try { localStorage.setItem(BOOKS_KEY, JSON.stringify(arr)); } catch (err) {}
  }

  function hashColor(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return COVER_COLORS[h % COVER_COLORS.length];
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function fmtDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.getFullYear() + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + String(d.getDate()).padStart(2, '0');
  }

  function stickerFor(id) {
    const list = ['🌸', '🩷', '⭐', '📌', '🦋', '🍓', '🌙', '🎀'];
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return list[h % list.length];
  }

  function renderCard(book) {
    const color = hashColor(book.id);
    const title = book.title || '我的手账';
    const date = fmtDate(book.createdAt || book.updatedAt || Date.now());
    const pages = book.pageCount || 1;
    return `
    <div class="book-card" data-id="${esc(book.id)}" style="--cover:${color}" title="打开「${esc(title)}」">
      <button class="book-del" data-id="${esc(book.id)}" title="删除这本">✕</button>
      <div class="book-cover">
        <div class="book-spine"></div>
        <div class="book-face">
          <div class="cover-tape t1"></div>
          <div class="cover-title">${esc(title)}</div>
          <div class="cover-date">${esc(date)}</div>
          <div class="cover-sticker">${stickerFor(book.id)}</div>
        </div>
        <div class="book-page-edge"></div>
      </div>
      <div class="book-meta">
        <span class="book-name">${esc(title)}</span>
        <span class="book-pages">${pages} 页</span>
      </div>
    </div>`;
  }

  function render() {
    const books = getBooks().slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    const grid = $('#shelfGrid');
    const empty = $('#shelfEmpty');
    grid.hidden = books.length === 0;
    empty.hidden = books.length > 0;
    grid.innerHTML = books.map(renderCard).join('');
  }

  function delBook(id) {
    const book = getBooks().find((b) => b.id === id);
    if (!book) return;
    if (!confirm('删除「' + (book.title || '这本手账') + '」？内容无法恢复。')) return;
    saveBooks(getBooks().filter((b) => b.id !== id));
    try { localStorage.removeItem(BOOK_PREFIX + id); } catch (err) {}
    render();
  }

  function bind() {
    $('#btnEmptyCreate').addEventListener('click', createNew);
    $('#btnFabNew').addEventListener('click', createNew);
    $('#shelfGrid').addEventListener('click', (e) => {
      const del = e.target.closest('.book-del');
      if (del) { e.stopPropagation(); delBook(del.dataset.id); return; }
      const card = e.target.closest('.book-card');
      if (card) location.href = '/editor?id=' + card.dataset.id;
    });
  }

  function createNew() {
    location.href = '/editor?new=1';
  }

  function init() {
    bind();
    render();
    const navAuth = $('#navAuth');
    navAuth.addEventListener('click', () => {
      if (Auth.user) { location.href = '/community.html'; }
      else { Auth.open('login'); }
    });
    Auth.init((user) => {
      navAuth.textContent = user ? (user.username || user.email) : '登录';
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();