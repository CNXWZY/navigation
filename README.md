# 🚀 行稳致远导航站

基于 Cloudflare Workers + D1 的现代化导航网站。

[🌐 在线预览](https://xwzy.xx.kg) | [📖 原项目](https://github.com/gdydg/my-nav-site)

---

## ✨ 特性

- 🌐 基于 Cloudflare Workers 全栈无服务器架构
- 🎨 现代化 UI 设计，支持暗黑/明亮主题切换
- 📱 响应式布局，完美适配移动端
- 🔐 密码保护管理后台
- 🎵 网易云音乐歌单集成
- 🌸 落花动态效果（可开关）
- 🖼️ 自定义背景图

---

## ⚡ 一键部署

### 方式一：GitHub Actions 自动部署（推荐）

1. Fork 本项目
2. 在 GitHub 仓库设置中添加 Secrets：
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API Token
   - `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID
   - `CLOUDFLARE_D1_DATABASE_ID`: D1 数据库 ID
3. 修改 `wrangler.jsonc` 中的配置
4. 每次推送代码自动部署

### 方式二：Wrangler CLI 手动部署

```bash
# 1. 克隆项目
git clone https://github.com/CNXWZY/navigation.git
cd navigation

# 2. 安装依赖
npm install

# 3. 登录 Cloudflare
npx wrangler login

# 4. 创建 D1 数据库（如没有）
npx wrangler d1 create nav-db
# 然后修改 wrangler.jsonc 中的 database_id

# 5. 初始化数据库
npx wrangler d1 execute nav-db --file=./d1-setup.sql --remote

# 6. 设置环境变量
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put PLAYLIST_IDS

# 7. 部署！
npx wrangler deploy
```

---

## 🔧 环境变量

| 变量名 | 必填 | 说明 | 示例 |
|--------|------|------|------|
| `ADMIN_PASSWORD` | ✅ | 管理后台密码 | `your-password` |
| `PLAYLIST_IDS` | ❌ | 网易云歌单 JSON | `[{"server":"netease","id":"2250011882"}]` |

### 🎵 PLAYLIST_IDS 格式

```json
[{"server":"netease","id":"歌单ID"}]
```

多个歌单：
```json
[{"server":"netease","id":"2250011882"},{"server":"netease","id":"12607978369"}]
```

---

## 🎛️ 管理后台

访问 `/admin` 路径，使用设置的密码登录。

**可管理：**
- 📂 网站分类（侧边栏/顶部栏）
- 🔗 网站链接
- 🖼️ 背景图
- 🌗 主题设置

---

## 🎨 自定义

### 🖼️ 修改背景图

**方式一：替换本地文件**

```bash
# 将图片放入 public/ 目录
cp your-background.jpg public/background.jpeg

# 修改 d1-setup.sql
# 将 backgroundUrl 改为: /background.jpeg

# 重新初始化数据库
npx wrangler d1 execute nav-db --command="DELETE FROM settings WHERE key='backgroundUrl'" --remote
npx wrangler d1 execute nav-db --file=./d1-setup.sql --remote
```

**方式二：使用外部 URL**

登录管理后台后，在设置中直接输入图片链接即可。

### 📝 修改网站标题

编辑 `public/index.html`：

```html
<title>你的网站标题</title>
<link rel="icon" href="你的图标URL">
```

### 🔖 修改追踪 ID

在 `public/index.html` 中修改：

```javascript
data-website-id="你的追踪ID"
```

---

## 📦 技术栈

<p>

<img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat&logo=cloudflare" alt="Workers">
<img src="https://img.shields.io/badge/Cloudflare-D1-380036?style=flat&logo=cloudflare" alt="D1">
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwind-css" alt="Tailwind">
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript" alt="JavaScript">

</p>

- Cloudflare Workers ☁️
- Cloudflare D1 (SQLite) 💾
- Cloudflare Assets 📁
- Tailwind CSS 🎨
- Sortable.js 🗂️

---

## 🙏 感谢

- 原作者：[gdydg/my-nav-site](https://github.com/gdydg/my-nav-site)
- 灵感来源：各种导航站点

---

## 📄 License

MIT © 2024
