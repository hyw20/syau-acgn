# 手账本 · 自介页编辑器 + 手账社区

一个「像手账本一样」的自介页编辑器，带多页翻页、素材贴纸、手动裁剪，并配套一个有登录系统的作品社区。

## 运行方式（重要）

社区需要后端，**不能直接双击 `index.html`**。请用 Node.js 启动：

```bash
node server.js
```

然后浏览器打开：

- 编辑器：http://localhost:8080/
- 社区：http://localhost:8080/community.html

> 端口可通过环境变量修改：`PORT=3000 node server.js`
> Windows 也可以直接双击 `start.bat`（如果没有，可在同目录建一个内容为 `node server.js` 的 .bat）。

## 功能

**编辑器（index.html）**
- 手账画布：形状 / 相框 / 贴纸 / 文字 / 上传图片手动裁剪
- 元素拖拽、缩放、旋转、图层排序、复制删除
- 多页翻页（上一页 / 下一页 / 加页 / 删页），每次打开固定首页，并提示上次翻到的页码
- 导出 PNG / 导出网页 / 项目 JSON 导入导出 / 本地自动保存
- 可爱加载页

**社区（community.html + server.js）**
- **QQ 邮箱注册**：账号必须是 QQ 邮箱（格式 `数字@qq.com`），注册需输入邮箱验证码
- 登录 / 登出（session cookie，密码加盐哈希存储）
- 作品墙：展示所有用户发布的作品（图片 + 标题 + 作者 + 时间）
- 发布作品：社区内上传图片，或从编辑器「📤 发布」直接把当前页导出 PNG 上传
- 删除自己的作品

## 技术说明

- 后端：Node.js 内置模块（http / fs / path / crypto / tls），**零 npm 依赖**
- 数据：`data/users.json`（用户）、`data/works.json`（作品元数据）、`uploads/`（作品图片）
- 密码：`crypto.scryptSync` 加盐哈希，不存明文
- 会话：内存 session + HttpOnly cookie（服务重启后需重新登录）
- 邮箱验证码：5 分钟有效，1 分钟发送间隔

## QQ 邮箱发信配置（可选但推荐）

不配置也能跑：验证码会打印到服务端控制台（开发模式），方便本地测试。

要**真的把验证码发到 QQ 邮箱**，需要开启 QQ 邮箱 SMTP 并拿到授权码：

1. 登录 QQ 邮箱 → 设置 → 账户 → 开启「POP3/IMAP/SMTP 服务」
2. 获取 16 位「授权码」（不是 QQ 密码）
3. 启动时传入环境变量：

```bash
# Windows PowerShell
$env:SMTP_USER="你的QQ邮箱@qq.com"
$env:SMTP_PASS="你的16位授权码"
node server.js
```

> 也可以把配置写进 `data/config.json`：
> `{ "smtpUser": "xxx@qq.com", "smtpPass": "16位授权码", "smtpFrom": "xxx@qq.com" }`

## 文件结构

```
index.html / styles.css / app.js   编辑器
community.html / community.css / community.js   社区
server.js                          后端（静态服务 + API）
data/  uploads/                    运行时数据（已 gitignore）
```
