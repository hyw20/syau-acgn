/* =========================================================================
 * 手账社区后端 —— 零依赖 Node.js（Node 内置模块）
 * 功能：静态服务 + 用户注册/登录/session + 作品上传/画廊
 * 运行：node server.js   （默认 http://localhost:8080）
 * 数据：data/users.json · data/works.json · uploads/*.png（运行时生成）
 * ========================================================================= */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const tls = require('tls');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const WORKS_FILE = path.join(DATA_DIR, 'works.json');
const BODY_LIMIT = 12 * 1024 * 1024; // 12MB
const MAX_IMAGE = 10 * 1024 * 1024;  // 单张作品图 10MB

/* SMTP 配置：优先环境变量，其次 data/config.json。
 * 不配置也能跑——验证码会打印到服务端控制台（开发模式）。 */
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
let fileConfig = {};
try { fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch {}
const SMTP = {
  host: process.env.SMTP_HOST || fileConfig.smtpHost || 'smtp.qq.com',
  port: parseInt(process.env.SMTP_PORT || fileConfig.smtpPort || 465, 10),
  user: process.env.SMTP_USER || fileConfig.smtpUser || '',
  pass: process.env.SMTP_PASS || fileConfig.smtpPass || '',
  from: process.env.SMTP_FROM || fileConfig.smtpFrom || '',
};

for (const d of [DATA_DIR, UPLOAD_DIR]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/* ---------------- 工具 ---------------- */
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}
function uid() { return crypto.randomBytes(8).toString('hex'); }
function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}
function publicUser(u) { return { id: u.id, email: u.email || null, username: u.username || null }; }
function displayName(u) { return u.username || String(u.email || '').split('@')[0]; }
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i >= 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
function setCookie(name, value, maxAge) {
  const parts = [`${name}=${value}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (maxAge) parts.push(`Max-Age=${maxAge}`);
  return parts.join('; ');
}
function sendJson(res, code, obj, extraHeaders) {
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extraHeaders));
  res.end(JSON.stringify(obj));
}

/* ---------------- 数据 ---------------- */
let users = readJson(USERS_FILE, []);
let works = readJson(WORKS_FILE, []);
const sessions = new Map(); // token -> { userId }
const codes = new Map();   // email -> { code, expires }

// 旧版 username 字段迁移为 email（宽容处理，仅本地测试数据）
users = users.map((u) => ({ email: u.email || u.username, id: u.id, salt: u.salt, hash: u.hash, createdAt: u.createdAt }));

function getSession(req) {
  const token = parseCookies(req.headers.cookie).sid;
  if (!token) return null;
  return sessions.get(token) || null;
}

/* ---------------- QQ 邮箱 ---------------- */
function isQQEmail(email) {
  return /^[1-9][0-9]{4,11}@qq\.com$/i.test(String(email || '').trim());
}

/* ---------------- 验证码 ---------------- */
function newCode(email) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(email.toLowerCase(), { code, expires: Date.now() + 5 * 60 * 1000 });
  return code;
}

function verifyCode(email, code) {
  const rec = codes.get(String(email || '').toLowerCase());
  if (!rec) return false;
  if (Date.now() > rec.expires) { codes.delete(email); return false; }
  return rec.code === String(code || '').trim();
}

/* ---------------- SMTP 发送（手写，零依赖） ---------------- */
function buildMail(fromName, from, to, subject, text) {
  const encSubject = '=?UTF-8?B?' + Buffer.from(subject).toString('base64') + '?=';
  const body = Buffer.from(text).toString('base64');
  return [
    `From: ${fromName} <${from}>`,
    `To: <${to}>`,
    `Subject: ${encSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}

function smtpSend(opts) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: opts.host, port: opts.port, servername: opts.host, rejectUnauthorized: false }, () => {
      let buf = '';
      const steps = [
        () => 'EHLO localhost\r\n',
        () => 'AUTH LOGIN\r\n',
        () => Buffer.from(opts.user).toString('base64') + '\r\n',
        () => Buffer.from(opts.pass).toString('base64') + '\r\n',
        () => `MAIL FROM:<${opts.from}>\r\n`,
        () => `RCPT TO:<${opts.to}>\r\n`,
        () => 'DATA\r\n',
        () => buildMail(opts.fromName || '手账社区', opts.from, opts.to, opts.subject, opts.text) + '\r\n.\r\n',
        () => 'QUIT\r\n',
      ];
      let i = 0;
      socket.on('data', (d) => {
        buf += d.toString('utf8');
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).replace(/\r$/, '');
          buf = buf.slice(nl + 1);
          const code = line.slice(0, 3);
          if (line[3] === '-') continue; // 多行响应中间行
          if (code[0] === '4' || code[0] === '5') {
            socket.destroy();
            reject(new Error('SMTP: ' + line));
            return;
          }
          if (i < steps.length) {
            socket.write(steps[i++]());
          } else {
            socket.end();
            resolve();
            return;
          }
        }
      });
    });
    socket.on('error', reject);
  });
}

async function sendVerifyEmail(email, code) {
  if (!SMTP.user || !SMTP.pass) {
    console.log(`[开发模式] ${email} 的注册验证码：${code}（配置 QQ 邮箱 SMTP 后才会真正发邮件）`);
    return { sent: false };
  }
  try {
    await smtpSend({
      host: SMTP.host, port: SMTP.port, user: SMTP.user, pass: SMTP.pass,
      from: SMTP.from || SMTP.user, to: email,
      subject: '手账社区 注册验证码',
      text: `你的注册验证码是：${code}\n\n5 分钟内有效。如果不是你本人操作，请忽略这封邮件。`,
    });
    return { sent: true };
  } catch (err) {
    console.error('邮件发送失败：', err.message);
    return { sent: false, error: err.message };
  }
}

/* ---------------- body 读取 ---------------- */
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > BODY_LIMIT) { reject(new Error('请求体过大')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* ---------------- API ---------------- */
async function handleApi(req, res, pathname) {
  const method = req.method;

  if (pathname === '/api/me' && method === 'GET') {
    const s = getSession(req);
    const u = s && users.find((x) => x.id === s.userId);
    return sendJson(res, 200, { user: u ? publicUser(u) : null });
  }

  if (pathname === '/api/auth/send-code' && method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const email = String(body.email || '').trim();
    if (!isQQEmail(email)) return sendJson(res, 400, { error: '请输入有效的 QQ 邮箱（格式：数字@qq.com）' });
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) return sendJson(res, 409, { error: '该邮箱已注册，请直接登录' });
    const last = codes.get(email.toLowerCase());
    if (last && Date.now() < last.expires - 4 * 60 * 1000) return sendJson(res, 429, { error: '验证码已发送，请 1 分钟后再试' });
    const code = newCode(email);
    const result = await sendVerifyEmail(email, code);
    if (result.sent) return sendJson(res, 200, { ok: true, message: '验证码已发送到你的 QQ 邮箱' });
    return sendJson(res, 200, { ok: true, message: '开发模式：验证码已打印到服务端控制台', devCode: code });
  }

  if (pathname === '/api/register' && method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const email = String(body.email || '').trim();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const code = String(body.code || '').trim();
    if (password.length < 4) return sendJson(res, 400, { error: '密码至少 4 位' });
    const salt = crypto.randomBytes(16).toString('hex');
    let user;

    // 方式一：QQ 邮箱 + 验证码
    if (email) {
      if (!isQQEmail(email)) return sendJson(res, 400, { error: '请输入有效的 QQ 邮箱（格式：数字@qq.com）' });
      if (!code) return sendJson(res, 400, { error: '请输入验证码' });
      if (!verifyCode(email, code)) return sendJson(res, 400, { error: '验证码错误或已过期' });
      if (users.some((u) => u.email && u.email.toLowerCase() === email.toLowerCase()))
        return sendJson(res, 409, { error: '该邮箱已注册' });
      user = { id: uid(), email, salt, hash: hashPassword(password, salt), createdAt: Date.now() };
      codes.delete(email.toLowerCase());
    }
    // 方式二：用户名 + 密码
    else if (username) {
      if (username.length < 2 || username.length > 20) return sendJson(res, 400, { error: '用户名需 2-20 个字符' });
      if (!/^[\w\u4e00-\u9fa5-]+$/.test(username)) return sendJson(res, 400, { error: '用户名只能含中英文、数字、下划线或连字符' });
      if (users.some((u) => u.username && u.username.toLowerCase() === username.toLowerCase()))
        return sendJson(res, 409, { error: '用户名已被占用' });
      user = { id: uid(), username, salt, hash: hashPassword(password, salt), createdAt: Date.now() };
    }
    else {
      return sendJson(res, 400, { error: '请填写用户名或 QQ 邮箱' });
    }

    users.push(user);
    writeJson(USERS_FILE, users);
    const token = uid() + uid();
    sessions.set(token, { userId: user.id });
    return sendJson(res, 200, { user: publicUser(user) }, { 'Set-Cookie': setCookie('sid', token, 60 * 60 * 24 * 30) });
  }

  if (pathname === '/api/login' && method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const account = String(body.account || '').trim();
    const password = String(body.password || '');
    const al = account.toLowerCase();
    const user = users.find((u) =>
      (u.email && u.email.toLowerCase() === al) ||
      (u.username && u.username.toLowerCase() === al));
    if (!user || hashPassword(password, user.salt) !== user.hash)
      return sendJson(res, 401, { error: '账号或密码错误' });
    const token = uid() + uid();
    sessions.set(token, { userId: user.id });
    return sendJson(res, 200, { user: publicUser(user) }, { 'Set-Cookie': setCookie('sid', token, 60 * 60 * 24 * 30) });
  }

  if (pathname === '/api/logout' && method === 'POST') {
    const token = parseCookies(req.headers.cookie).sid;
    if (token) sessions.delete(token);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': setCookie('sid', '', 0) });
  }

  if (pathname === '/api/works' && method === 'GET') {
    const list = [...works].sort((a, b) => b.createdAt - a.createdAt).map((w) => ({
      id: w.id, title: w.title, authorName: w.authorName, createdAt: w.createdAt, file: w.file,
    }));
    return sendJson(res, 200, { works: list });
  }

  if (pathname === '/api/works' && method === 'POST') {
    const s = getSession(req);
    if (!s) return sendJson(res, 401, { error: '请先登录' });
    const user = users.find((u) => u.id === s.userId);
    if (!user) return sendJson(res, 401, { error: '用户不存在' });
    const body = JSON.parse(await readBody(req));
    const title = String(body.title || '').trim() || '未命名作品';
    const image = String(body.image || '');
    const m = image.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return sendJson(res, 400, { error: '图片格式无效' });
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_IMAGE) return sendJson(res, 400, { error: '图片不能超过 10MB' });
    const id = uid();
    const file = 'uploads/' + id + '.' + ext;
    fs.writeFileSync(path.join(ROOT, file), buf);
    const work = { id, title, authorId: user.id, authorName: displayName(user), createdAt: Date.now(), file };
    works.push(work);
    writeJson(WORKS_FILE, works);
    return sendJson(res, 200, { work });
  }

  if (pathname.startsWith('/api/works/') && method === 'DELETE') {
    const s = getSession(req);
    if (!s) return sendJson(res, 401, { error: '请先登录' });
    const id = pathname.slice('/api/works/'.length);
    const idx = works.findIndex((w) => w.id === id);
    if (idx < 0) return sendJson(res, 404, { error: '作品不存在' });
    const work = works[idx];
    if (work.authorId !== s.userId) return sendJson(res, 403, { error: '只能删除自己的作品' });
    works.splice(idx, 1);
    writeJson(WORKS_FILE, works);
    try { fs.unlinkSync(path.join(ROOT, work.file)); } catch {}
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: 'not found' });
}

/* ---------------- 静态服务 ---------------- */
function serveStatic(req, res, pathname) {
  let p = decodeURIComponent(pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 Not Found'); return; }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

/* ---------------- 启动 ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
    return serveStatic(req, res, pathname);
  } catch (err) {
    sendJson(res, 500, { error: err && err.message ? err.message : '服务器错误' });
  }
});

server.listen(PORT, () => {
  console.log('手账社区已启动: http://localhost:' + PORT);
  console.log('  编辑器  http://localhost:' + PORT + '/');
  console.log('  社区    http://localhost:' + PORT + '/community.html');
});
