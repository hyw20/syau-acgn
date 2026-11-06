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

## 功能

**编辑器（index.html）**
- 手账画布：形状 / 相框 / 贴纸 / 文字 / 上传图片手动裁剪
- 元素拖拽、缩放、旋转、图层排序、复制删除
- 多页翻页（上一页 / 下一页 / 加页 / 删页），每次打开固定首页，并提示上次翻到的页码
- 导出 PNG / 导出网页 / 项目 JSON 导入导出 / 本地自动保存
- 可爱加载页

**社区（community.html + server.js）**
- QQ 邮箱+验证码或用户名+密码注册，登录时可填用户名或 QQ 邮箱
- 登录 / 登出（session cookie，密码加盐哈希存储）
- 作品墙：展示所有用户发布的作品（图片 + 标题 + 作者 + 时间）
- 发布作品：社区内上传图片，或从编辑器「📤 发布」直接把当前页导出 PNG 上传
- 删除自己的作品

## 技术说明

- 后端：Node.js 内置模块（http / fs / path / crypto / tls），**零 npm 依赖**
- 数据：`data/users.json`（用户）、`data/works.json`（作品元数据）、`uploads/`（作品图片）
- 密码：`crypto.scryptSync` 加盐哈希，不存明文
- 会话：内存 session + HttpOnly cookie（服务重启后需重新登录）
- 邮箱验证码：5 分钟有效，1 分钟发送间隔；未配置 SMTP 时默认不可用

## QQ 邮箱发信配置

公网运行必须配置 SMTP，未配置时发送验证码返回 503，不会向访客显示验证码。只在本机测试时可以临时设置 `DEV_EMAIL_CODES=1`（同时确保 `NODE_ENV` 不是 `production`），测试验证码才会出现在响应和控制台。不要在公网开启。

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

## Ubuntu 轻量云部署

需要 `ubuntu` 用户的 SSH 登录权限、绑定到服务器的域名以及腾讯云防火墙放行 TCP 80/443。以 Ubuntu 22.04/24.04 为例，在服务器终端执行：

```bash
sudo apt update && sudo apt install -y git nodejs npm nginx certbot python3-certbot-nginx
node --version  # 建议 Node.js 18 或更新版本；发行版版本过旧时改用 NodeSource LTS
sudo mkdir -p /opt/syau-acgn
sudo chown ubuntu:ubuntu /opt/syau-acgn
git clone https://github.com/hyw20/syau-acgn.git /opt/syau-acgn
cd /opt/syau-acgn
mkdir -p data uploads
chmod 700 data uploads
```

在服务器用 `sudo nano /etc/syau-acgn.env` 创建配置（QQ 邮箱授权码只放在服务器上，不提交到 GitHub）：

```ini
NODE_ENV=production
PORT=8080
SMTP_USER=你的QQ邮箱@qq.com
SMTP_PASS=你的QQ邮箱SMTP授权码
```

```bash
sudo chmod 600 /etc/syau-acgn.env
sudo tee /etc/systemd/system/syau-acgn.service >/dev/null <<'EOF'
[Unit]
Description=Syau ACGN scrapbook community
After=network-online.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/syau-acgn
EnvironmentFile=/etc/syau-acgn.env
ExecStart=/usr/bin/node /opt/syau-acgn/server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable --now syau-acgn
curl -I http://127.0.0.1:8080/
```

先在域名控制台把域名 A 记录指向服务器公网 IP；然后将下方的 `你的域名` 替换成真实域名，配置 Nginx 及 HTTPS：

```bash
sudo tee /etc/nginx/sites-available/syau-acgn >/dev/null <<'EOF'
server {
    listen 80;
    server_name 你的域名;
    client_max_body_size 12m;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
sudo ln -s /etc/nginx/sites-available/syau-acgn /etc/nginx/sites-enabled/syau-acgn
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d 你的域名
```

检查：`systemctl status syau-acgn`、`journalctl -u syau-acgn -n 50 --no-pager`、`curl -I https://你的域名/`。更新代码：在 `/opt/syau-acgn` 中执行 `git pull`，然后 `sudo systemctl restart syau-acgn`。`data/` 与 `uploads/` 位于服务器本机且不入 Git，**迁移/重装前必须备份**；单台机器文件存储不等于异地备份。

## 文件结构

```
index.html / styles.css / app.js   编辑器
community.html / community.css / community.js   社区
server.js                          后端（静态服务 + API）
data/  uploads/                    运行时数据（已 gitignore）
```
