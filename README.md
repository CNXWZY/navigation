# 行稳致远导航站

基于 Cloudflare Workers + D1 的现代化导航网站。

## 特性

- 🌐 基于 Cloudflare Workers 全栈无服务器架构
- 🎨 现代化 UI 设计，支持暗黑/明亮主题
- 📱 响应式布局，支持移动端
- 🔐 密码保护管理后台
- 🎵 网易云音乐歌单集成
- ✨ 落花动态效果（可开关）
- 🖼️ 自定义背景图

## 部署

### 1. 克隆项目
```bash
git clone https://github.com/CNXWZY/navigation.git
cd navigation
```

### 2. 配置 Cloudflare

创建 D1 数据库：
```bash
npx wrangler d1 create nav-db
```

修改 `wrangler.jsonc` 中的 `database_id` 为你创建的数据库 ID。

### 3. 初始化数据库
```bash
npx wrangler d1 execute nav-db --file=./d1-setup.sql --remote
```

### 4. 设置环境变量

在 Cloudflare Workers 设置中添加以下 Secrets：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| ADMIN_PASSWORD | 管理后台密码 | panel965686 |
| PLAYLIST_IDS | 网易云歌单 JSON | `[{"server":"netease","id":"2250011882"}]` |

```bash
# 设置密码
wrangler secret put ADMIN_PASSWORD

# 设置歌单
wrangler secret put PLAYLIST_IDS
```

### 5. 部署
```bash
npx wrangler deploy
```

## 环境变量说明

| 变量名 | 必填 | 说明 |
|--------|------|------|
| ADMIN_PASSWORD | 是 | 管理后台密码 |
| PLAYLIST_IDS | 否 | 网易云音乐歌单 JSON 数组 |

### PLAYLIST_IDS 格式

```json
[{"server":"netease","id":"歌单ID"}]
```

多个歌单：
```json
[{"server":"netease","id":"2250011882"},{"server":"netease","id":"12607978369"}]
```

## 管理后台

访问 `/admin` 路径，使用设置的密码登录。

可管理：
- 网站分类
- 网站链接
- 背景图
- 主题设置

## 自定义

### 修改网站标题和图标

编辑 `public/index.html`：
```html
<title>你的网站标题</title>
<link rel="icon" href="你的图标URL">
```

### 修改网站名称和追踪 ID

在 `public/index.html` 中修改：
```javascript
data-website-id="XWZY-NAV"
```

## 技术栈

- Cloudflare Workers
- Cloudflare D1 (SQLite)
- Cloudflare Assets
- Tailwind CSS
- Sortable.js
- 网易云音乐 API

## 感谢

原项目：https://github.com/gdydg/my-nav-site

## License

MIT
