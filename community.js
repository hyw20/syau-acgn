/* 手账社区 前端逻辑 */
'use strict';

const $ = (sel) => document.querySelector(sel);

let me = null; // 当前登录用户（由 Auth 模块维护）
const CATEGORIES = ['日常', '旅行', '学习', '美食', '拼贴', '教程', '打卡'];
let currentCat = '全部'; // 画廊当前筛选分类
let pubCat = '日常';     // 发布弹窗选中的分类

/* ---------------- API 封装 ---------------- */
async function api(path, opts = {}) {
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

/* ---------------- 登录态渲染 ---------------- */
function renderAuth() {
  $('#userZone').hidden = !me;
  if (me) $('#userName').textContent = me.username || me.email;
}

/* ---------------- 分类 ---------------- */
function renderCatBar() {
  const bar = $('#catBar');
  bar.innerHTML = ['全部'].concat(CATEGORIES).map((c) =>
    `<button class="cat-chip ${c === currentCat ? 'active' : ''}" data-cat="${escapeHtml(c)}" type="button">${c}</button>`
  ).join('');
}

function renderPublishCats() {
  const wrap = $('#publishCats');
  wrap.innerHTML = CATEGORIES.map((c) =>
    `<button class="cat-chip ${c === pubCat ? 'active' : ''}" data-cat="${escapeHtml(c)}" type="button">${c}</button>`
  ).join('');
}

/* ---------------- 画廊 ---------------- */
async function loadGallery() {
  const { status, data } = await api('/api/works');
  const g = $('#gallery');
  if (status !== 200 || !data || !Array.isArray(data.works)) {
    g.innerHTML = `<p class="gallery-empty">加载失败，请刷新重试。</p>`;
    return;
  }
  let list = data.works;
  if (currentCat !== '全部') list = list.filter((w) => (w.category || '日常') === currentCat);
  $('#galleryCount').textContent = currentCat === '全部'
    ? `共 ${data.works.length} 件作品`
    : `${currentCat} · ${list.length} 件`;
  if (list.length === 0) {
    g.innerHTML = `<p class="gallery-empty">${currentCat === '全部' ? '还没有作品，登录后发布第一张吧 ✨' : '这个分类还没有作品，来发第一张吧 ✨'}</p>`;
    return;
  }
  const myName = me ? (me.username || (me.email ? me.email.split('@')[0] : null)) : null;
  g.innerHTML = list.map((w) => {
    const mine = myName && w.authorName === myName;
    return `<div class="work-card" data-id="${w.id}">
      <img class="work-thumb" src="/${w.file}" alt="${escapeHtml(w.title)}" loading="lazy">
      <div class="work-info">
        <div>
          <div class="work-title">${w.category ? `<span class="work-cat">${escapeHtml(w.category)}</span>` : ''}${escapeHtml(w.title)}</div>
          <div class="work-meta"><span>by ${escapeHtml(w.authorName)}</span><span>${timeAgo(w.createdAt)}</span></div>
        </div>
        ${mine ? `<button class="work-del" data-del="${w.id}">删除</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + ' 分钟前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' 小时前';
  const d = Math.floor(h / 24);
  if (d < 30) return d + ' 天前';
  const date = new Date(ts);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/* ---------------- 发布 ---------------- */
function openPublish() {
  $('#publishTitle').value = '';
  $('#publishPreview').hidden = true;
  $('#publishPlaceholder').hidden = false;
  $('#publishError').hidden = true;
  pubCat = '日常';
  renderPublishCats();
  $('#publishModal').hidden = false;
}

async function submitPublish() {
  const title = $('#publishTitle').value.trim();
  const errEl = $('#publishError');
  errEl.hidden = true;
  const src = $('#publishPreview').src;
  if (!src || !src.startsWith('data:image/')) { errEl.textContent = '请先选择一张图片'; errEl.hidden = false; return; }

  const { status, data } = await api('/api/works', {
    method: 'POST',
    body: JSON.stringify({ title: title || '未命名作品', image: src, category: pubCat }),
  });
  if (status !== 200) {
    if (status === 401) { errEl.textContent = '请先登录'; errEl.hidden = false; return; }
    errEl.textContent = (data && data.error) || '发布失败';
    errEl.hidden = false;
    return;
  }
  $('#publishModal').hidden = true;
  loadGallery();
}

function handlePublishFile(file) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    $('#publishPreview').src = r.result;
    $('#publishPreview').hidden = false;
    $('#publishPlaceholder').hidden = true;
  };
  r.readAsDataURL(file);
}

/* ---------------- 删除 ---------------- */
async function deleteWork(id) {
  if (!confirm('确定删除这件作品吗？')) return;
  const { status, data } = await api('/api/works/' + id, { method: 'DELETE' });
  if (status !== 200) { alert((data && data.error) || '删除失败'); return; }
  loadGallery();
}

/* ---------------- 初始化 ---------------- */
async function init() {
  // 登录态变化时刷新用户区与画廊
  Auth.init((user) => {
    me = user;
    $('#navAuth').textContent = user ? (user.username || user.email) : '登录';
    renderAuth();
    loadGallery();
  });

  // 顶栏：导航登录按钮 + 发布 / 登出
  $('#navAuth').addEventListener('click', () => {
    if (Auth.user) { location.href = '/community.html'; }
    else { Auth.open('login'); }
  });
  $('#btnLogout').addEventListener('click', () => Auth.logout());
  $('#btnPublish').addEventListener('click', openPublish);

  // 发布
  $('#publishDrop').addEventListener('click', () => $('#publishFile').click());
  $('#publishFile').addEventListener('change', (e) => { handlePublishFile(e.target.files[0]); e.target.value = ''; });
  $('#publishSubmit').addEventListener('click', submitPublish);

  // 弹窗关闭（发布弹窗；登录弹窗由 auth.js 管理）
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => { $('#' + btn.dataset.close).hidden = true; });
  });
  document.querySelectorAll('.modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.hidden = true; });
  });

  // 画廊删除（事件委托）
  $('#gallery').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) deleteWork(del.dataset.del);
  });

  // 分类条：切换分类后重新加载画廊
  renderCatBar();
  $('#catBar').addEventListener('click', (e) => {
    const chip = e.target.closest('.cat-chip');
    if (!chip) return;
    currentCat = chip.dataset.cat;
    renderCatBar();
    loadGallery();
  });

  // 发布弹窗分类选择
  renderPublishCats();
  $('#publishCats').addEventListener('click', (e) => {
    const chip = e.target.closest('.cat-chip');
    if (!chip) return;
    pubCat = chip.dataset.cat;
    renderPublishCats();
  });
}

document.addEventListener('DOMContentLoaded', init);
