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
- **进程管理**: PM2
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

### 使用 PM2 管理

```bash
# 启动服务
pm2 start npm --name filemanager -- start

# 重启服务
pm2 restart filemanager

# 停止服务
pm2 stop filemanager

# 查看日志
pm2 logs filemanager

# 查看状态
pm2 status
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
pm2 restart filemanager
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

## 数据库初始化

首次运行时，数据库会自动创建。如需重置数据库：

```bash
rm /data/code/filemanager/data/filemanager.db
pm2 restart filemanager
```

## 构建和部署

```bash
# 构建项目
npm run build

# 重启PM2服务
pm2 restart filemanager
```

## 监控和日志

```bash
# 查看实时日志
pm2 logs filemanager --lines 100

# 查看错误日志
pm2 logs filemanager --err

# 查看资源使用情况
pm2 monit
```

## 故障排查

### 端口被占用

```bash
# 查找占用3002端口的进程
lsof -ti:3002

# 杀死进程
kill -9 <PID>

# 重启服务
pm2 restart filemanager
```

### 清除缓存

```bash
# 清除Next.js缓存
rm -rf .next/cache

# 重新构建
npm run build

# 重启服务
pm2 restart filemanager
```

## 许可证

MIT