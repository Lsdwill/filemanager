# 个人网盘 - 基于阿里云OSS的文件管理系统

一个功能完整的个人文件管理系统，支持文件上传、下载、分享、预览等功能，后端使用阿里云OSS存储。

## 功能特性

- 文件上传/下载
- 文件夹管理
- 文件分享（单文件分享、批量分享）
- 文件预览（图片、视频、PDF、文档等）
- 全局搜索
- 拖拽上传
- 批量操作（移动、删除、分享）
- 图片懒加载和悬停预览
- 响应式设计

## 技术栈

- **前端**: Next.js 16, React, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes
- **存储**: 阿里云OSS
- **数据库**: JSON 文件存储 (files.json, folders.json, shares.json, batch_shares.json, upload_files.json, upload_shares.json)
- **进程管理**: systemd (`filemanager.service`)
- **Web服务器**: Nginx

## 项目部署目录

```
/data/code/filemanager
```

## 启动项目

### 开发模式

```bash
cd /data/code/filemanager
npm run dev
```

访问 http://localhost:3002

### 生产模式

```bash
cd /data/code/filemanager
npm run build
npm start
```

生产环境实际由 systemd 托管，服务名为 `filemanager.service`。构建完成后必须重启服务，否则 Next.js 进程会继续使用旧构建的静态资源清单，可能导致 `_next/static` 下的 CSS/JS 404。

### 使用 systemd 管理

```bash
# 启动服务
systemctl start filemanager.service

# 重启服务
systemctl restart filemanager.service

# 停止服务
systemctl stop filemanager.service

# 查看日志
journalctl -u filemanager.service -f

# 查看状态
systemctl status filemanager.service
```

## 环境变量

在项目根目录创建 `.env` 文件：

```env
# 阿里云OSS配置
OSS_REGION=your-region
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name

# JWT密钥
JWT_SECRET=your-jwt-secret
```

## 数据存储

项目使用 JSON 文件存储数据，位于 `/data/code/filemanager/data/` 目录：

- `files.json` - 文件信息
- `folders.json` - 文件夹信息
- `shares.json` - 分享链接
- `batch_shares.json` - 批量分享链接
- `upload_files.json` - 上传分享文件
- `upload_shares.json` - 上传分享链接

### 数据备份

```bash
# 备份数据
cp -r /data/code/filemanager/data /data/code/filemanager/data.backup.$(date +%Y%m%d)

# 恢复数据
cp -r /data/code/filemanager/data.backup.YYYYMMDD/* /data/code/filemanager/data/
systemctl restart filemanager.service
```

## Nginx 配置

```nginx
server {
    server_name file.mathai.tech;

    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 500m;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/file.mathai.tech/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/file.mathai.tech/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name file.mathai.tech;
    return 301 https://$host$request_uri;
}
```

## 数据初始化

首次运行时，`data/` 下的 JSON 数据文件会自动创建。如需重置数据，请先备份，再按需清空对应 JSON 文件，最后重启服务：

```bash
cp -r /data/code/filemanager/data /data/code/filemanager/data.backup.$(date +%Y%m%d%H%M%S)
printf '[]\n' > /data/code/filemanager/data/files.json
printf '[]\n' > /data/code/filemanager/data/folders.json
printf '[]\n' > /data/code/filemanager/data/shares.json
systemctl restart filemanager.service
```

## 构建和部署

### 在服务器上手动部署

```bash
cd /data/code/filemanager
npm run build
systemctl restart filemanager.service
systemctl status filemanager.service
```

### 从本地远程部署

本仓库提供了远程部署脚本，会把当前本地代码同步到服务器，再在服务器上执行依赖安装、构建、重启服务和静态资源检查。

```bash
npm run deploy
```

脚本默认配置：

- SSH: `root@24.233.2.106 -p 13608`
- 远程目录: `/data/code/filemanager`
- systemd 服务: `filemanager.service`
- 同步阶段不会覆盖远程 `.env`、`data/`、`node_modules/`、`.next/`
- 默认不会删除远程多余文件；如需清理旧源码文件，可执行 `RSYNC_DELETE=1 npm run deploy`

可通过环境变量覆盖默认值：

```bash
SSH_HOST=example.com SSH_PORT=22 SSH_USER=root npm run deploy
```

## 监控和日志

```bash
# 查看实时日志
journalctl -u filemanager.service -f

# 查看最近100行日志
journalctl -u filemanager.service -n 100 --no-pager

# 查看服务状态
systemctl status filemanager.service
```

## 故障排查

### 端口被占用

```bash
# 查找占用3002端口的进程
lsof -ti:3002

# 杀死进程
kill -9 <PID>

# 重启服务
systemctl restart filemanager.service
```

### 清除缓存

```bash
# 清除Next.js缓存
rm -rf .next/cache

# 重新构建
npm run build

# 重启服务
systemctl restart filemanager.service
```

## 部署服务器

```bash
ssh -p 13608 root@24.233.2.106
```

## 许可证

MIT
