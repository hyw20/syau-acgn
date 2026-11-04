/* 手账社区 前端逻辑 */
'use strict';

const $ = (sel) => document.querySelector(sel);

let me = null;           // 当前登录用户
let authMode = 'login';  // login | register

/* ---------------- API 封装 ---------------- */
async function api(path, opts = {}) {
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

/* ---------------- 登录态渲染 ---------------- */
function renderAuth() {
  $('#guestZone').hidden = !!me;
  $('#userZone').hidden = !me;
  if (me) $('#userName').textContent = me.username || me.email;
}

/* ---------------- 画廊 ---------------- */
async function loadGallery() {
  const { status, data } = await api('/api/works');
  const g = $('#gallery');
  if (status !== 200 || !data || !Array.isArray(data.works)) {
    g.innerHTML = `<p class="gallery-empty">加载失败，请刷新重试。</p>`;
    return;
  }
  $('#galleryCount').textContent = `共 ${data.works.length} 件作品`;
  if (data.works.length === 0) {
    g.innerHTML = `<p class="gallery-empty">还没有作品，登录后发布第一张吧 ✨</p>`;
    return;
  }
  g.innerHTML = data.works.map((w) => {
    const mine = me && w.authorName === me.username;
    return `<div class="work-card" data-id="${w.id}">
      <img class="work-thumb" src="/${w.file}" alt="${escapeHtml(w.title)}" loading="lazy">
      <div class="work-info">
        <div>
          <div class="work-title">${escapeHtml(w.title)}</div>
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

/* ---------------- 登录 / 注册 ---------------- */
function openAuth(mode) {
  authMode = mode;
  $('#authTitle').textContent = mode === 'login' ? '登录 / 注册' : '登录 / 注册';
  $('#authSubmit').textContent = mode === 'login' ? '登录' : '注册';
  $('#authError').hidden = true;
  $('#authAccount').value = '';
  $('#authPassword').value = '';
  $('#authCode').value = '';
  $('#codeHint').hidden = true;
  document.querySelectorAll('#authTabs .auth-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.auth === mode);
  });
  // 账号标签文案
  $('#accountLabel').textContent = mode === 'login' ? '用户名 / QQ 邮箱' : '用户名 / QQ 邮箱';
  $('#authAccount').placeholder = mode === 'login' ? '用户名或 QQ 邮箱' : '注册用户名或 QQ 邮箱';
  $('#registerOptions').hidden = mode !== 'register';
  updateRegisterTypeUI();
  $('#authModal').hidden = false;
  $('#authAccount').focus();
}

function updateRegisterTypeUI() {
  const isEmail = document.querySelector('input[name="regType"]:checked').value === 'email';
  $('#codeRow').hidden = !isEmail;
  $('#accountLabel').textContent = isEmail ? 'QQ 邮箱' : '用户名';
  $('#authAccount').placeholder = isEmail ? '如 123456789@qq.com' : '2-20 个字符';
}

async function submitAuth() {
  const account = $('#authAccount').value.trim();
  const password = $('#authPassword').value;
  const errEl = $('#authError');
  errEl.hidden = true;
  if (!account || !password) { showAuthError('请填写账号和密码'); return; }

  if (authMode === 'register') {
    const isEmail = document.querySelector('input[name="regType"]:checked').value === 'email';
    const code = $('#authCode').value.trim();
    const payload = isEmail ? { email: account, password, code } : { username: account, password };
    const { status, data } = await api('/api/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (status !== 200) { showAuthError((data && data.error) || '注册失败'); return; }
    me = data.user;
    renderAuth();
    $('#authModal').hidden = true;
    loadGallery();
    return;
  }

  const { status, data } = await api('/api/login', {
    method: 'POST',
    body: JSON.stringify({ account, password }),
  });
  if (status !== 200) { showAuthError((data && data.error) || '登录失败'); return; }
  me = data.user;
  renderAuth();
  $('#authModal').hidden = true;
  loadGallery();
}

/* 发送验证码 + 60 秒倒计时 */
let codeTimer = null;
async function sendCode() {
  const email = $('#authAccount').value.trim();
  const errEl = $('#authError');
  errEl.hidden = true;
  if (!/^[1-9][0-9]{4,11}@qq\.com$/i.test(email)) { showAuthError('请输入有效的 QQ 邮箱（格式：数字@qq.com）'); return; }

  const btn = $('#btnSendCode');
  btn.disabled = true;
  try {
    const { status, data } = await api('/api/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (status !== 200) { showAuthError((data && data.error) || '发送失败'); btn.disabled = false; return; }
    const hint = $('#codeHint');
    if (data.devCode) {
      hint.textContent = `开发模式验证码：${data.devCode}`;
    } else {
      hint.textContent = data.message || '验证码已发送，请查收 QQ 邮箱';
    }
    hint.hidden = false;
    startCountdown(btn);
  } catch {
    showAuthError('发送失败，请稍后重试');
    btn.disabled = false;
  }
}

function startCountdown(btn) {
  let n = 60;
  btn.textContent = n + 's';
  clearInterval(codeTimer);
  codeTimer = setInterval(() => {
    n -= 1;
    if (n <= 0) { clearInterval(codeTimer); btn.textContent = '发送验证码'; btn.disabled = false; }
    else btn.textContent = n + 's';
  }, 1000);
}

function showAuthError(msg) {
  const errEl = $('#authError');
  errEl.textContent = msg;
  errEl.hidden = false;
}

async function logout() {
  await api('/api/logout', { method: 'POST' });
  me = null;
  renderAuth();
  loadGallery();
}

/* ---------------- 发布 ---------------- */
function openPublish() {
  $('#publishTitle').value = '';
  $('#publishPreview').hidden = true;
  $('#publishPlaceholder').hidden = false;
  $('#publishError').hidden = true;
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
    body: JSON.stringify({ title: title || '未命名作品', image: src }),
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
  // 登录态
  const res = await api('/api/me');
  me = (res.data && res.data.user) || null;
  renderAuth();

  // 顶栏按钮
  $('#btnLogin').addEventListener('click', () => openAuth('login'));
  $('#btnRegister').addEventListener('click', () => openAuth('register'));
  $('#btnLogout').addEventListener('click', logout);
  $('#btnPublish').addEventListener('click', openPublish);
  $('#authSubmit').addEventListener('click', submitAuth);
  $('#btnSendCode').addEventListener('click', sendCode);
  $('#authPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAuth(); });

  // 登录/注册 tab 切换 + 注册方式切换
  $('#authTabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.auth-tab');
    if (tab) openAuth(tab.dataset.auth);
  });
  document.querySelectorAll('input[name="regType"]').forEach((radio) => {
    radio.addEventListener('change', updateRegisterTypeUI);
  });

  // 发布
  $('#publishDrop').addEventListener('click', () => $('#publishFile').click());
  $('#publishFile').addEventListener('change', (e) => { handlePublishFile(e.target.files[0]); e.target.value = ''; });
  $('#publishSubmit').addEventListener('click', submitPublish);

  // 弹窗关闭
  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => { $('#' + btn.dataset.close).hidden = true; });
  });
  // 点遮罩关闭
  document.querySelectorAll('.modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', (e) => { if (e.target === bd) bd.hidden = true; });
  });

  // 画廊删除（事件委托）
  $('#gallery').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del]');
    if (del) deleteWork(del.dataset.del);
  });

  // 编辑器跳转带图（若 URL 带 image，预填发布）
  loadGallery();
}

document.addEventListener('DOMContentLoaded', init);
