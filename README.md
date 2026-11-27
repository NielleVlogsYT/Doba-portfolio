# Doba Portfolio

A static portfolio site with a Git-backed admin panel. Built with vanilla HTML/CSS/JS, deployed on Vercel.

## Features

- **Static site** — Fast, secure, free hosting on Vercel/Netlify/GitHub Pages
- **Admin panel** — Edit all content at `/admin` (protected by Edge Middleware, works on Free tier)
- **Git-backed** — Changes commit to your repo → Vercel auto-redeploys
- **No database** — Content lives in `content.json` in your repository

## Quick Start

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/Doba-portfolio.git
git push -u origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → Add New Project → Import your repo
2. Framework Preset: **Other** (static)
3. Build Command: `echo 'Static site'`
4. Output Directory: `.` (root)
5. Click **Deploy**

### 3. Set Up Admin Authentication (Free Tier!)

Vercel **Edge Middleware** is free — we use it for password protection instead of Pro-tier password protection.

**Generate your password hash:**

```bash
# Run locally once
node generate-hash.js "your-secure-password"
```

This outputs two values — add them as **Environment Variables** in Vercel:

| Variable | Value |
|----------|-------|
| `ADMIN_PASSWORD_PEPPER` | (random string from generator) |
| `ADMIN_PASSWORD_HASH` | (SHA256 hash from generator) |

### 4. Add GitHub Token for Admin Saves

1. Create a GitHub Personal Access Token (classic): https://github.com/settings/tokens
   - Scopes: `repo` (full control of private repos)
2. In Vercel Dashboard → Settings → **Environment Variables**, add:
   - `GITHUB_TOKEN` = your token
   - `GITHUB_REPO` = `yourusername/Doba-portfolio`
   - `GITHUB_BRANCH` = `main` (optional)
   - `GITHUB_FILE_PATH` = `content.json` (optional)
3. Redeploy (Vercel → Deployments → Redeploy)

### 5. Access Admin

Visit: `https://your-site.vercel.app/login`

Enter your password → redirected to `/admin` → edit content → click **Save Changes** → site rebuilds automatically.

## Project Structure

```
├── index.html          # Home page
├── projects.html       # All projects
├── services.html       # Services page
├── about.html          # About page
├── contact.html        # Contact page
├── login.html          # Login page (password entry)
├── admin.html          # Admin panel (protected by middleware)
├── content.json        # All site content (single source of truth)
├── content-loader.js   # Loads content.json into pages
├── script.js           # UI interactions (avatar, filters, nav)
├── style.css           # Main styles
├── admin.css           # Admin panel styles
├── admin.js            # Admin panel logic
├── middleware.ts       # Vercel Edge Middleware (auth protection)
├── generate-hash.js    # Password hash generator (run once locally)
├── api/
│   ├── save-content.js # Vercel function: commits to GitHub
│   ├── login.js        # Vercel function: sets auth cookie
│   └── logout.js       # Vercel function: clears auth cookie
├── vercel.json         # Vercel config
└── .env.example        # Environment variables template
```

## Content Model

All editable content lives in `content.json`:

- **Site** — Name, role, handle, email, social links, hero, tools marquee
- **Projects** — Add/edit/delete project cards with visual configs
- **Services** — Process steps + service cards
- **About** — Story, skills plates (3), facts
- **Contact** — Header, email, résumé link, availability, FAQs

## Customization

### Styling

Edit `style.css` — uses CSS custom properties for colors, spacing, typography.

### Adding Fields

1. Add field to `content.json`
2. Add input to `admin.html` (with `name="path.to.field"`)
3. Update `content-loader.js` to populate the page
4. Update `admin.js` collect/collectAllData if needed

## Local Development

```bash
# Simple static server
npx serve .

# Or with Vercel CLI (for API function testing)
npx vercel dev
```

## License

MIT — Feel free to use as a template for your own portfolio.