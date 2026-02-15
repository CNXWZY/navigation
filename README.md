# 🚀 行稳致远导航站 - 你的专属个人导航门户

基于 Cloudflare Workers + D1 构建的现代化导航网站，零服务器成本，即开即用！

[🌐 在线预览](https://xwzy.xx.kg) | [📖 原项目](https://github.com/gdydg/my-nav-site)

---

## ✨ 为什么选择这个项目？

🤔 还在为管理书签而烦恼吗？传统浏览器书签同步慢、跨设备难用、功能单一？

🚀 **行稳致远导航站** 让你彻底告别这些烦恼！

### 🎯 核心优势

| 特性 | 传统书签 | 本项目 |
|------|---------|--------|
| 🚀 访问速度 | 慢 | 毫秒级加载 |
| 📱 多设备同步 | 需登录账号 | 天然跨设备 |
| 🎨 个性化程度 | 低 | 高度自定义 |
| 🎵 音乐播放器 | ❌ | ✅ 内置支持 |
| 💰 成本 | 免费但受限 | **完全免费** |
| 🔧 维护 | 浏览器厂商决定 |  完全掌控 |

### 🎉 特色功能

- 🌐 **全球 CDN 加速** - 基于 Cloudflare 全球网络，访问速度拉满
- 🎵 **音乐播放器** - 网易云/QQ音乐/酷狗歌单一键集成，背景音乐听起来
- 🎨 **主题自由切换** - 暗黑/明亮模式，还有浪漫的落花特效 🌸
- 📱 **完美移动端适配** - 手机、平板、电脑都能丝滑使用
- 🔐 **安全登录** - 密码存储在 Cloudflare Secret，安全无忧
- 🖼️ **一键换肤** - 背景图想换就换
- 📊 **数据可视化** - 常用网站自动统计，智能推荐

---

## ⚡ 5分钟快速部署

### 方式一：GitHub Actions 自动部署（推荐 ⭐）

```bash
# 1. Fork 本项目
# 2. 在仓库 Settings → Secrets 中添加：
#    - CLOUDFLARE_API_TOKEN
#    - CLOUDFLARE_ACCOUNT_ID  
#    - CLOUDFLARE_D1_DATABASE_ID
# 3. 提交代码，自动部署！✨
```

### 方式二：本地命令行部署

```bash
# 克隆项目
git clone https://github.com/CNXWZY/navigation.git
cd navigation

# 安装依赖
npm install

# 登录 Cloudflare
npx wrangler login

# 创建 D1 数据库
npx wrangler d1 create nav-db

# 初始化数据库
npx wrangler d1 execute nav-db --file=./d1-setup.sql --remote

# 设置管理密码（⚠️ 密码安全存储在 Cloudflare）
npx wrangler secret put ADMIN_PASSWORD

# 部署上线！
npx wrangler deploy
```

---

## 🎛️ 管理后台

点击页面右上角设置图标，输入密码即可进入管理面板：

**可视化操作：**
- 📂 管理网站分类（侧边栏/顶部栏）
- 🔗 添加/编辑/删除网站
- 🎵 **可视化配置音乐歌单**（支持网易云/QQ音乐/酷狗）
- 🖼️ 自定义背景图
- 🌗 切换主题
- 📊 查看网站访问统计
- 📥 导入/导出数据

---

## 🎵 音乐播放器

支持多个音乐平台，一键配置：

```javascript
// 歌单配置示例
[
  {"server": "netease", "id": "2250011882"},  // 网易云
  {"server": "tencent", "id": "123456"},       // QQ音乐
  {"server": "kugou", "id": "654321"}          // 酷狗
]
```

> 💡 现在可以直接在管理面板可视化配置，无需手动修改代码！

---

## 🛠️ 自定义修改

### 更换背景图

```bash
# 方式一：管理面板直接设置
# 登录管理面板 → 全局设置 → 输入图片URL

# 方式二：替换本地文件
cp your-image.jpg public/background.jpg
```

### 修改网站标题

编辑 `public/index.html`:

```html
<title>你的导航站</title>
<link rel="icon" href="你的图标.ico">
```

---

## 📦 技术栈

<p>
<img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare" alt="Workers">
<img src="https://img.shields.io/badge/Cloudflare-D1-380036?style=for-the-badge&logo=cloudflare" alt="D1">
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css" alt="Tailwind">
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript" alt="JavaScript">
</p>

- **Cloudflare Workers** - 无服务器计算
- **Cloudflare D1** - SQLite 数据库
- **Cloudflare Assets** - 静态文件托管
- **Tailwind CSS** - 美观 UI
- **Sortable.js** - 拖拽排序

---

## 💪 对比原项目升级了什么？

| 功能 | 原项目 | 本项目 |
|------|--------|--------|
| 密码安全 | ❌ 明文存储 | ✅ Cloudflare Secret 安全存储 |
| 歌单配置 | ❌ 需改代码 | ✅ 可视化管理 |
| 音乐平台 | 仅网易云 | 网易云/QQ音乐/酷狗 |
| 部署体验 | 一般 | 🚀 一键部署 |

---

## 🙏 感谢

- 原作者：[gdydg/my-nav-site](https://github.com/gdydg/my-nav-site)
- 灵感来源：各种优秀的导航站点

---

## 📄 License

MIT © 2024

---

<div align="center">
  
⭐ Star 支持一下 | 🍴 Fork 二次开发 | 📢 欢迎 Issues

</div>
