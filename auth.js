/* 登录 / 注册公共模块 —— 编辑器与社区共用
 * 使用：
 *   const user = await Auth.init((u) => { ... 登录态变化 ... });
 *   Auth.open('login' | 'register')
 *   Auth.logout()
 *   Auth.user
 */
'use strict';

(function () {
  const $ = (sel) => document.querySelector(sel);

  let me = null;
  let authMode = 'login';
  let codeTimer = null;
  let onChange = null;

  async function api(path, opts = {}) {
    const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data };
  }

  /* 注入登录弹窗（只注入一次） */
  function injectModal() {
    if ($('#authModal')) return;
    const wrap = document.createElement('div');
    wrap.id = 'authModal';
    wrap.className = 'modal-backdrop';
    wrap.hidden = true;
    wrap.innerHTML =
      '<div class="modal auth-modal">' +
        '<div class="modal-head">' +
          '<span id="authTitle">登录</span>' +
          '<button class="close-btn" data-close="authModal">✕</button>' +
        '</div>' +
        '<div class="auth-body">' +
          '<div class="auth-tabs" id="authTabs">' +
            '<button class="auth-tab active" data-auth="login" type="button">登录</button>' +
            '<button class="auth-tab" data-auth="register" type="button">注册</button>' +
          '</div>' +
          '<div class="prop-row">' +
            '<label id="accountLabel">用户名 / QQ 邮箱</label>' +
            '<input type="text" id="authAccount" placeholder="用户名或 QQ 邮箱" maxlength="64">' +
          '</div>' +
          '<div class="prop-row">' +
            '<label>密码</label>' +
            '<input type="password" id="authPassword" placeholder="至少 4 位" maxlength="64">' +
          '</div>' +
          '<div class="register-options" id="registerOptions" hidden>' +
            '<p class="prop-hint" style="margin:0 0 8px">注册方式：</p>' +
            '<div class="reg-type">' +
              '<label class="reg-chip"><input type="radio" name="regType" value="username" checked> 用户名注册</label>' +
              '<label class="reg-chip"><input type="radio" name="regType" value="email"> QQ 邮箱注册</label>' +
            '</div>' +
            '<div class="prop-row" id="codeRow" hidden style="margin-top:10px">' +
              '<label>验证码</label>' +
              '<div class="code-inline">' +
                '<input type="text" id="authCode" placeholder="6 位验证码" maxlength="6" inputmode="numeric">' +
                '<button class="btn" id="btnSendCode" type="button">发送验证码</button>' +
              '</div>' +
              '<p class="prop-hint" id="codeHint" hidden></p>' +
            '</div>' +
          '</div>' +
          '<p class="auth-error" id="authError" hidden></p>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn" data-close="authModal">取消</button>' +
          '<button class="btn primary" id="authSubmit">登录</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(wrap);
  }

  function setError(msg) {
    const el = $('#authError');
    el.textContent = msg;
    el.hidden = false;
  }

  function updateRegisterTypeUI() {
    const checked = document.querySelector('input[name="regType"]:checked');
    const isEmail = checked && checked.value === 'email';
    $('#codeRow').hidden = !isEmail;
    $('#accountLabel').textContent = isEmail ? 'QQ 邮箱' : '用户名';
    $('#authAccount').placeholder = isEmail ? '如 123456789@qq.com' : '2-20 个字符';
  }

  function open(mode) {
    authMode = mode || 'login';
    $('#authSubmit').textContent = authMode === 'login' ? '登录' : '注册';
    $('#authError').hidden = true;
    $('#authAccount').value = '';
    $('#authPassword').value = '';
    $('#authCode').value = '';
    $('#codeHint').hidden = true;
    document.querySelectorAll('#authTabs .auth-tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.auth === authMode));
    $('#registerOptions').hidden = authMode !== 'register';
    updateRegisterTypeUI();
    $('#authModal').hidden = false;
    $('#authAccount').focus();
  }

  async function submit() {
    const account = $('#authAccount').value.trim();
    const password = $('#authPassword').value;
    $('#authError').hidden = true;
    if (!account || !password) { setError('请填写账号和密码'); return; }

    let path, payload;
    if (authMode === 'register') {
      const checked = document.querySelector('input[name="regType"]:checked');
      const isEmail = checked && checked.value === 'email';
      path = '/api/register';
      payload = isEmail
        ? { email: account, password, code: $('#authCode').value.trim() }
        : { username: account, password };
    } else {
      path = '/api/login';
      payload = { account, password };
    }

    const { status, data } = await api(path, { method: 'POST', body: JSON.stringify(payload) });
    if (status !== 200) { setError((data && data.error) || '操作失败'); return; }
    me = data.user;
    $('#authModal').hidden = true;
    fireChange();
  }

  async function sendCode() {
    const email = $('#authAccount').value.trim();
    $('#authError').hidden = true;
    if (!/^[1-9][0-9]{4,11}@qq\.com$/i.test(email)) { setError('请输入有效的 QQ 邮箱（格式：数字@qq.com）'); return; }
    const btn = $('#btnSendCode');
    btn.disabled = true;
    try {
      const { status, data } = await api('/api/auth/send-code', { method: 'POST', body: JSON.stringify({ email }) });
      if (status !== 200) { setError((data && data.error) || '发送失败'); btn.disabled = false; return; }
      const hint = $('#codeHint');
      hint.textContent = data.devCode
        ? '开发模式验证码：' + data.devCode
        : (data.message || '验证码已发送，请查收 QQ 邮箱');
      hint.hidden = false;
      countdown(btn);
    } catch {
      setError('发送失败，请稍后重试');
      btn.disabled = false;
    }
  }

  function countdown(btn) {
    let n = 60;
    btn.textContent = n + 's';
    clearInterval(codeTimer);
    codeTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(codeTimer); btn.textContent = '发送验证码'; btn.disabled = false; }
      else btn.textContent = n + 's';
    }, 1000);
  }

  async function logout() {
    await api('/api/logout', { method: 'POST' });
    me = null;
    fireChange();
  }

  function fireChange() {
    if (onChange) onChange(me);
  }

  function bind() {
    const wrap = $('#authModal');
    $('#authSubmit').addEventListener('click', submit);
    $('#btnSendCode').addEventListener('click', sendCode);
    $('#authPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    $('#authTabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.auth-tab');
      if (tab) open(tab.dataset.auth);
    });
    document.querySelectorAll('input[name="regType"]').forEach((r) =>
      r.addEventListener('change', updateRegisterTypeUI));
    wrap.querySelectorAll('[data-close]').forEach((b) =>
      b.addEventListener('click', () => { wrap.hidden = true; }));
    wrap.addEventListener('click', (e) => { if (e.target === wrap) wrap.hidden = true; });
  }

  async function init(cb) {
    onChange = cb || null;
    injectModal();
    bind();
    const res = await api('/api/me');
    me = (res.data && res.data.user) || null;
    fireChange();
    return me;
  }

  window.Auth = {
    init,
    open,
    logout,
    get user() { return me; },
  };
})();
