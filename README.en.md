# 🚀 Navigation Station - Your Personal Portal

A modern navigation website built on Cloudflare Workers + D1, with zero server costs and instant setup!

[🌐 Live Demo](https://xwzy.xx.kg) | [📖 Original Project](https://github.com/gdydg/my-nav-site) | [🇨🇳 中文](README.md)

---

## ✨ Why Choose This Project?

🤔 Still struggling with bookmark management? Slow sync, cross-device issues, limited features?

🚀 **Navigation Station** solves all these problems!

### 🎯 Key Advantages

| Feature | Traditional Bookmarks | This Project |
|---------|---------------------|--------------|
| 🚀 Speed | Slow | Millisecond loading |
| 📱 Cross-device | Needs account | Natural sync |
| 🎨 Customization | Limited | Fully customizable |
| 🎵 Music Player | ❌ | ✅ Built-in |
| 💰 Cost | Free but limited | **Completely Free** |
| 🔧 Maintenance | Browser dependent | Full control |

### 🎉 Cool Features

- 🌐 **Global CDN** - Cloudflare-powered blazing fast access
- 🎵 **Music Player** - NetEase/QQ Music/KuGou integration
- 🎨 **Theme Switching** - Dark/Light mode + falling petals 🌸
- 📱 **Mobile First** - Works perfectly on phone/tablet/desktop
- 🔐 **Secure Login** - Passwords stored in Cloudflare Secret
- 🖼️ **Background Customization** - Change anytime
- 📊 **Analytics** - Auto track frequently visited sites

---

## ⚡ Deploy in 5 Minutes

### Option 1: GitHub Actions Auto-Deploy (Recommended ⭐)

```bash
# 1. Fork this project
# 2. Add to repo Settings → Secrets:
#    - CLOUDFLARE_API_TOKEN
#    - CLOUDFLARE_ACCOUNT_ID  
#    - CLOUDFLARE_D1_DATABASE_ID
# 3. Push code, auto deploy!✨
```

### Option 2: Local Command Line Deploy

```bash
# Clone project
git clone https://github.com/CNXWZY/navigation.git
cd navigation

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Create D1 database
npx wrangler d1 create nav-db

# Initialize database
npx wrangler d1 execute nav-db --file=./d1-setup.sql --remote

# Set admin password (stored securely in Cloudflare)
npx wrangler secret put ADMIN_PASSWORD

# Deploy!
npx wrangler deploy
```

---

## 🎛️ Admin Panel

Click the settings icon in top-right, enter password:

**Visual Management:**
- 📂 Manage categories (sidebar/topbar)
- 🔗 Add/Edit/Delete sites
- 🎵 **Visual music playlist config** (NetEase/QQ/KuGou)
- 🖼️ Custom background
- 🌗 Theme switching
- 📊 Visit statistics
- 📥 Import/Export data

---

## 🎵 Music Player

Multi-platform support:

```javascript
// Playlist config example
[
  {"server": "netease", "id": "2250011882"},  // NetEase
  {"server": "tencent", "id": "123456"},       // QQ Music
  {"server": "kugou", "id": "654321"}          // KuGou
]
```

> 💡 Now with visual config in admin panel - no code editing needed!

---

## 🛠️ Customization

### Change Background

```bash
# Method 1: Set directly in admin panel
# Admin Panel → Global Settings → Enter image URL

# Method 2: Replace local file
cp your-image.jpg public/background.jpg
```

### Change Site Title

Edit `public/index.html`:

```html
<title>Your Navigation</title>
<link rel="icon" href="your-icon.ico">
```

---

## 📦 Tech Stack

<p>
<img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare" alt="Workers">
<img src="https://img.shields.io/badge/Cloudflare-D1-380036?style=for-the-badge&logo=cloudflare" alt="D1">
<img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css" alt="Tailwind">
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript" alt="JavaScript">
</p>

- **Cloudflare Workers** - Serverless computing
- **Cloudflare D1** - SQLite database
- **Cloudflare Assets** - Static file hosting
- **Tailwind CSS** - Beautiful UI
- **Sortable.js** - Drag & drop

---

## 💪 Upgrades from Original

| Feature | Original | This Project |
|---------|---------|--------------|
| Password Security | ❌ Plain text | ✅ Cloudflare Secret |
| Playlist Config | ❌ Code editing | ✅ Visual management |
| Music Platforms | NetEase only | NetEase/QQ/KuGou |
| Deploy Experience | Basic | 🚀 One-click |

---

## 🙏 Credits

- Original author: [gdydg/my-nav-site](https://github.com/gdydg/my-nav-site)
- Inspiration: Various navigation sites

---

## 📄 License

MIT © 2024

---

<div align="center">
  
⭐ Star | 🍴 Fork | 📢 Issues Welcome

</div>
