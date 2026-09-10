---
title: SpatialPosters
emoji: 🖼️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 8080
pinned: false
---

<p align="center">
  <img src="public/pictorium.png" alt="SpatialPosters" width="380" />
</p>

<h3 align="center">Dynamic Movie & TV Poster Generator for Stremio & Media Centers</h3>

<p align="center">
  <a href="README.md"><b>🇮🇹 Leggi in Italiano</b></a> • <a href="README.en.md"><b>🇬🇧 Read in English</b></a>
</p>

<p align="center">
  Textless clean posters, high-definition vector logos, IMDb/TMDB/Rotten Tomatoes ratings, 4K streaming quality badges, live Netflix Top 10 ribbons, and smart season splitting. All rendered on the fly with Sharp C++ & SVG.
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEful97%2FPictorium"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
  <a href="#-docker--compose"><img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-green?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="License AGPLv3" />
</p>

---

## 📸 Preview

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/home.png" alt="Pictorium Home" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
</div>

<table align="center" width="100%">
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/editor.png" alt="Pictorium Editor" style="border-radius: 6px;" /></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/myposters.png" alt="Pictorium My Posters" style="border-radius: 6px;" /></td>
  </tr>
  <tr>
    <td align="center"><em>WYSIWYG Editor & Live Preview</em></td>
    <td align="center"><em>My Posters & Personal Library</em></td>
  </tr>
  <tr>
    <td colspan="2"><img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/catalogs.png" alt="Pictorium Catalogs" style="border-radius: 6px; margin-top: 8px;" /></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><em>Dynamic Catalogs & JustWatch Streaming Charts</em></td>
  </tr>
</table>

<div align="center" style="margin-top: 12px;">
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/1405.jpg" alt="Poster Demo" width="32%" style="border-radius: 6px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/155.jpg" alt="Poster Demo — The Dark Knight" width="32%" style="border-radius: 6px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/66732.jpg" alt="Poster Demo — Stranger Things" width="32%" style="border-radius: 6px;" />
</div>

---

## ⚡ Key Features

| Feature | Description |
|---|---|
| 🎯 **WYSIWYG Graphics Engine** | A single endpoint (`/api/poster/{type}/{id}`) powered by Sharp C++ and SVG serves both the real-time web preview and the final poster on Stremio with pixel-perfect sync. |
| 📦 **100% Standalone Addon** | Directly delivers rich metadata cards, multilingual synopses, transparent logos, 4K backdrops, YouTube trailers, and full seasons with thumbnails and translated episodes to Stremio. |
| 📺 **Smart Parts & Anime Splitting** | Automatically detects **Original Parts** (e.g. *Money Heist*, *Lupin*) and splits giant single-season anime entries on TMDB (e.g. *Re:ZERO*, *Jujutsu Kaisen*) into their true release seasons. |
| 🏷️ **Quality Badges & Ratings** | Real-time video resolution detection (4K/1080p/720p), aggregated ratings from over 16 sources (IMDb, TMDB, Rotten Tomatoes, Letterboxd, MAL), Academy/Cannes awards, and Netflix Top 10 ribbons. |
| 🌐 **Custom Catalogs** | Import watchlists and custom lists from **Letterboxd, Trakt, TMDb, TheTVDB, MDBList**, along with real-time trending charts via JustWatch GraphQL. |
| 🌍 **Dynamic Multilingual UI** | Fully localized interface (Italian, English, French, German, Spanish, Portuguese, Japanese, Korean) with instant real-time language switching without page refresh. |
| 🔒 **PIN Protection & Security** | Lock screen protection on every launch and page reload (F5) for the editor, configurable right during the initial setup wizard (Step 3) or in Settings. Stremio manifests and posters remain 100% open and unaffected. |
| ⚡ **Zero Cache Conflicts** | Deterministic versioning with automated `RENDER_VERSION` and `APP_VERSION`. Change any styling parameter and Stremio updates cached images immediately. |

---

## 🛠️ Detailed Features

### 🖼️ Posters, Logos & Graphics
* **Clean Poster Selection**: Select textless posters with one click from official TMDB candidates (`iso_639_1 === null`).
* **Smart Best-Fit Algorithm**: Analyzes brightness and empty space to automatically scale and position logos without obscuring faces.
* **Cinematic Background Blur (Sharp C++)**: Ultra-fast background blur generation (10–20ms) with minimal RAM usage.
* **24h Auto-Rotation**: Automatically rotates through multiple saved clean posters daily for the same title.
* **Official Network Logos**: Automatic detection and embedding for Netflix, Prime Video, Disney+, Apple TV+, HBO Max, Paramount+, Sky/NOW, Crunchyroll, and 30+ studios (Marvel, Pixar, Ghibli, Warner Bros, A24).

### 🏷️ Badges, Ratings & Accolades
* **✨ Streaming Quality (4K / 1080p / 720p / SD)**: Detected live from Stremio video streams with automatic fallback to JustWatch.
* **6 Genre & Rating Badge Styles**: *Shadow, Pill, Bar, Colored, Border, Glass* with adaptive palette matching the poster.
* **Vertical Netflix Top 10 Ribbon**: The iconic red side ribbon with live rank position (dedicated support for Anime).
* **Film Awards & Accolades**: Automatic recognition of Oscars, Cannes, BAFTA, Emmy, and the *"Absolute Cinema"* badge for IMDb Top 250 titles.
* **Always-in-Sync Charts**: Top 10/20 badges track live charts; if a title leaves the ranking, its badge updates automatically.

### 📺 Seasons, Episodes & Anime
* **✨ Automatic Parts Detection**: Automatically maps standard seasons to original Parts for series like *Money Heist / La Casa de Papel* (5 parts) and *Lupin* (4 parts).
* **🌀 Anime Season Unpacking**: Resolves TMDB's cataloging issue where entire anime series are compressed into a single giant season (e.g. *Re:ZERO* 85 episodes, *Jujutsu Kaisen* 59 episodes), restoring proper seasonal distribution (S1, S2, S3, S4 + Specials in S0).
* **TheTVDB & AniZip Support**: Manually select alternative ordering from TheTVDB (*Aired, DVD, Absolute, Alternate*) or AniZip (*AniList / AniDB*).
* **Live Episode Preview**: Check exactly how seasons, episode titles, and thumbnails will appear in Stremio before saving.

### 🔒 Panel Security & PIN Protection
* **Panel Lock on Launch & Reload (F5)**: Automatically prompts for your PIN whenever the web app is loaded or refreshed to safeguard your custom posters and settings.
* **Initial Setup Wizard Integration**: Step 3 of the guided onboarding wizard lets you configure a personal PIN in seconds (or skip this step).
* **Virtual Keypad & Keyboard Support**: Seamless numeric input on mobile devices and desktop keyboards, complete with visual shake animation on wrong PIN.
* **Flexible Management**: Change or remove your PIN anytime from *Settings → Data & Cache*.
* **100% Unaffected Stremio Endpoints**: The PIN strictly shields editor routes: Stremio endpoints (`/manifest.json`, `/api/poster/*`, `/catalog/*`, `/api/health`) remain always accessible and uninterrupted.

---

## 🚀 Quick Deploy

Choose the preferred deployment method for your setup:

| Platform | Cost | Type | Persistence | Recommended For |
|---|---|---|---|---|
| [▲ **Vercel**](#-vercel) | **Free** | Serverless | Upstash Redis (KV) | **Recommended**: 1-click, zero maintenance, global CDN ([📺 Video Guide](https://www.youtube.com/watch?v=FP6VJ2vGYiY)) |
| [🐳 **Docker Compose**](#-docker--compose) | **Free** | Container | Local Volume (`/data`) | NAS, Home Server, mini-PC (Unraid/TrueNAS) |
| [🤗 **Hugging Face**](#-hugging-face-spaces) | **Free** | Docker (16GB RAM) | Storage Bucket | Great free RAM for shared instances |
| [🦾 **Oracle Cloud**](#-other-deployment-methods) | **Free** | ARM VPS (24GB RAM) | Local Disk | Always-online with dedicated resources at zero cost |

---

### ☁️ Vercel (Free & Recommended)

[![YouTube Video Guide](https://img.shields.io/badge/YouTube-Video_Setup_Guide-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=FP6VJ2vGYiY)

> 📺 **Step-by-Step Video Guide**: Prefer following along visually? Watch the [**YouTube Video Tutorial**](https://www.youtube.com/watch?v=FP6VJ2vGYiY) to get everything set up in under 2 minutes.

Ideal if you don't own a home server. Setup takes under 2 minutes, 100% free with 1-click automatic updates:

1. **Get your free TMDB API Key**:
   * Create an account on [themoviedb.org](https://www.themoviedb.org/signup).
   * Go to **Settings → API** ([themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)) and generate an API key (*Developer*).
   * Copy the **API Key (v3 auth)** (a 32-character string, *not* the long read access token).
2. **Fork the Repository**:
   * Go to [**github.com/Eful97/Pictorium**](https://github.com/Eful97/Pictorium).
   * Click **Fork** in the top-right corner and then **Create fork** (you can keep it public or private).
3. **Import Project to Vercel**:
   * Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
   * Click **Add New…** → **Project** at the top.
   * Find your newly forked **Pictorium** repository and click **Import**.
   * Under **Environment Variables**, add:
     * `PICTORIUM_TMDB_KEY` = your 32-character TMDB API key.
     * `PICTORIUM_PUBLIC_INSTANCE` = `1`
   * Click **Deploy**.
4. **Link Upstash Redis (free database to save your custom posters)**:
   * Once the deploy finishes, open your project dashboard in Vercel.
   * Go to the **Storage** tab at the top → click **Connect Store** (or **Create Database**) → choose **Upstash (Redis)**.
   * Select a region close to you and click **Create & Connect** (Vercel automatically configures `KV_REST_API_URL` and `KV_REST_API_TOKEN`).
5. **Redeploy (Crucial Step!)**:
   * Go to the **Deployments** tab in your Vercel project.
   * Click the **three dots (⋯)** on the latest deployment and select **Redeploy**.
   * *(Note: Vercel only binds the new Upstash database variables on subsequent deployments)*.
6. **Initial Setup Wizard & Stremio Installation**:
   * Open your deployed URL (e.g. `https://your-pictorium.vercel.app`).
   * Complete the guided setup (Language, Region, and configure your **Security PIN**).
   * Click **Install on Stremio**! *(You can confirm everything is running smoothly by checking `/api/health`, which should return `"storage": "kv"` and `"status": "ok"`)*.

---

#### 🔄 How to Receive Updates (1-Click with Sync Fork)
Since you forked the repository in step 2, updating your instance whenever new versions are released takes just one click without reconfiguring anything:
1. Open your fork page on GitHub (`https://github.com/<your-username>/Pictorium`).
2. Click **Sync fork** (located below the repository title) → **Update branch**.
3. Vercel automatically detects the new commit and **builds and deploys the update in 60 seconds**, preserving your Upstash database, environment keys, PIN security, and saved posters!

---

### 🐳 Docker & Compose

Create a `docker-compose.yml` file:

```yaml
services:
  pictorium:
    image: eful97/pictorium:latest # or local build: .
    container_name: pictorium
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - PICTORIUM_PUBLIC_INSTANCE=1
      - PICTORIUM_TMDB_KEY=your_tmdb_key_here
    volumes:
      - pictorium-data:/data

volumes:
  pictorium-data:
```

Start the container:
```bash
docker compose up -d
```
The Stremio addon manifest will be available at: `http://<SERVER-IP>:8080/manifest.json`.

---

<details>
<summary><strong>👉 Other Deployment Methods (Hugging Face, Oracle Cloud, VPS Caddy, Termux)</strong></summary>

#### 🤗 Hugging Face Spaces
1. Create a Space on Hugging Face using the **Docker** SDK connected to the `Eful97/Pictorium` repository.
2. Under **Settings → Variables and secrets**, set:
   * `NODE_OPTIONS` = `--max-old-space-size=1024`
   * `PICTORIUM_PUBLIC_INSTANCE` = `1`
   * `PICTORIUM_TMDB_KEY` = *your TMDB key*
3. Under **Settings → Storage**, attach a Storage Bucket mounted to `/data`.
4. Stremio Manifest: `https://<your-space>.hf.space/manifest.json`.

#### 🦾 Oracle Cloud Always Free (ARM Ampere)
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
git clone https://github.com/Eful97/Pictorium && cd Pictorium
echo "PICTORIUM_PUBLIC_INSTANCE=1" > .env
echo "PICTORIUM_TMDB_KEY=your_key_here" >> .env
sudo docker compose up -d
```

#### 🖥️ VPS + Caddy (Automatic HTTPS)
```caddyfile
yourdomain.com {
    reverse_proxy pictorium:8080
}
```

#### 📱 Termux (Android)
```bash
pkg update && pkg install nodejs git -y
git clone https://github.com/Eful97/Pictorium && cd Pictorium
npm install --ignore-scripts && npm run build && npm start
```
</details>

---

## 🔑 Configuration & Environment Variables

### Essential Variables

> [!NOTE]
> All variables support the `PICTORIUM_*` prefix (recommended, e.g. `PICTORIUM_TMDB_KEY`) with full backwards compatibility for legacy `POSTERIUM_*` variables.

| Variable | Default | Description |
|---|:---:|---|
| `PICTORIUM_PUBLIC_INSTANCE` | `0` | Set to `1` on Vercel/HF to allow saving posters and using the editor without an admin token. |
| `PICTORIUM_TMDB_KEY` | *(optional)* | Instance TMDB API key to generate posters and catalogs without requiring users to input one. |
| `PICTORIUM_TVDB_API_KEY` | *(optional)* | TheTVDB API key for alternative season ordering and episode descriptions. |
| `PICTORIUM_MDBLIST_KEY` | *(optional)* | MDBList API key for custom lists and anime catalogs. |
| `PICTORIUM_REGION` | `IT` | Default country for JustWatch/FlixPatrol charts and title language (`IT`, `US`, `GB`, `FR`, `DE`, `ES`, `MX`, `IL`, `JP`, `KR`, `BR`, `IN`, `CA`, `AU`). Overridable per-request via `?region=` and per-user via config token or saved defaults. |
| `PICTORIUM_DATA_DIR` | `./data` | Local disk persistence folder for database and saved files. |
| `KV_REST_API_URL` / `TOKEN` | *(empty)* | Upstash Redis connection parameters for serverless deployment on Vercel. |

---

<details>
<summary><strong>⚙️ Advanced Variables, Default Catalog Styles & Rendering Pipeline</strong></summary>

### Default Visual Styles for Catalogs
| Variable | Values | Effect |
|---|---|---|
| `PICTORIUM_BADGE_STYLE` | `shadow`, `pill`, `bar`, `colored`, `bordo`, `vetro` | Style for genre/rating badges. |
| `PICTORIUM_RANKING_BADGE_STYLE` | `default`, `bar`, `colored`, `pill`, `netflix` | Style for ranking badges. |
| `PICTORIUM_RIBBON_SIDE` | `left` / `right` | Position of the vertical Netflix Top 10 ribbon. |
| `PICTORIUM_BLUR_ENABLED` | `1` / `0` | Enable or disable the blurred background. |
| `PICTORIUM_BADGE_QUALITY` | `1` / `0` | Show or hide the streaming quality badge (4K/1080p). |
| `PICTORIUM_NETWORK_LOGO` | `1` / `0` | Show or hide the network logo (Netflix, Prime, ecc.). |
| `PICTORIUM_GRADIENT_HEIGHT` | `5` – `100` | Percentage height of the bottom black gradient. |

### Concurrency & Memory Protection
| Variable | Default | Description |
|---|:---:|---|
| `PICTORIUM_MAX_CONCURRENT_RENDERS` | `4` | Maximum parallel Sharp rendering operations (OOM protection). |
| `PICTORIUM_RENDER_TIMEOUT_MS` | `30000` | Timeout massimo per completare un render (ms). |
| `PICTORIUM_CACHE_MAX_MB` | `150` | Memoria RAM massima riservata alla cache delle immagini. |
| `PICTORIUM_SELF_WARMUP` | `1` | Preriscaldamento automatico dei cataloghi all'avvio. |
| `PICTORIUM_LOG_LEVEL` | `info` | Log level (`debug`, `info`, `warn`, `error`). |
</details>

---

## 🧪 Local Development

```bash
# 1. Clone the repository
git clone https://github.com/Eful97/Pictorium && cd Pictorium

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Run unit tests (Vitest)
npm test

# 5. Full verification suite (Typecheck + Lint + Unit test + Build)
npm run verify
```

---

## 📄 License & Credits

* Released under the open-source **GNU Affero General Public License v3.0 (AGPL-3.0)**.
* Inspired by the [erdb](https://github.com/realbestia1/erdb) project by realbestia1.
* Metadata and assets provided by [TMDb](https://www.themoviedb.org/), [TheTVDB](https://thetvdb.com/), and [JustWatch](https://www.justwatch.com/).
* Network and studio logos courtesy of [Wikimedia Commons](https://commons.wikimedia.org/).
