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

<h1 align="center">SpatialPosters</h1>
<h3 align="center">Next-Generation Dynamic Poster Studio & Stremio Addon Engine</h3>

<p align="center">
  Transform your media library with pristine textless posters, high-definition vector logos, multi-provider rating badges, 4K streaming quality indicators, award ribbons, and intelligent season ordering. All rendered on the fly in real-time with Sharp C++ and high-performance SVG composition.
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FTheAceOfficials%2FSpatialPosters"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
  <a href="#-docker--compose"><img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-green?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="License AGPLv3" />
</p>

---

## 📸 Interface Showcase

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/home.png" alt="SpatialPosters Studio Dashboard" width="100%" style="border-radius: 10px; margin-bottom: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
</div>

<table align="center" width="100%">
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/editor.png" alt="WYSIWYG Poster Studio" style="border-radius: 8px;" /></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/myposters.png" alt="My Posters Library" style="border-radius: 8px;" /></td>
  </tr>
  <tr>
    <td align="center"><em>✨ Live WYSIWYG Poster Studio</em></td>
    <td align="center"><em>📚 Personal Saved Posters Library</em></td>
  </tr>
  <tr>
    <td colspan="2"><img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/catalogs.png" alt="Dynamic Catalogs" style="border-radius: 8px; margin-top: 10px;" /></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><em>🔥 Dynamic Catalogs & JustWatch Charts Manager</em></td>
  </tr>
</table>

<div align="center" style="margin-top: 16px;">
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/1405.jpg" alt="Poster Demo — Movie" width="32%" style="border-radius: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/155.jpg" alt="Poster Demo — The Dark Knight" width="32%" style="border-radius: 8px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/66732.jpg" alt="Poster Demo — Stranger Things" width="32%" style="border-radius: 8px;" />
</div>

---

## ⚡ Core Features

### 🎨 Live WYSIWYG Poster Engine
* **Instant Real-Time Canvas**: `/api/poster/{type}/{id}` renders custom poster compositions on demand using **Sharp C++** and vector SVG layers.
* **Textless Poster Selector**: Automatically filters official textless posters from TMDB (`iso_639_1 === null`) for pristine graphics.
* **Vector Title Logos**: Access thousands of HD title logos with customizable colors, opacity, and scale.
* **Cinematic Background Blur**: Generates smooth ambient poster blurs in 10-20ms with minimal CPU memory overhead.

### 🧠 Computer-Vision Auto-Fit Placement
* **Smart Contrast & Brightness Analysis**: Analyzes poster pixel luminance and detects focal zones (such as faces and characters).
* **Automatic Logo Positioning**: Dynamically scales and places title logos in empty background areas to avoid obscuring actors' faces.

### 🏷️ Multi-Source Ratings & Badges
* **Aggregated Ratings**: Displays live ratings from **IMDb**, **TMDB**, **Rotten Tomatoes**, **Letterboxd**, **MyAnimeList**, and **Simkl**.
* **Quality & Network Badges**: Live streaming resolution indicators (**4K UHD / 1080p / 720p**) and official network logos (Netflix, Prime Video, Disney+, Apple TV+, HBO Max, Crunchyroll, A24, Marvel, Pixar).
* **Prestige & Award Ribbons**: Recognizes Oscar winners, Cannes Palme d'Or, BAFTA, Emmy awards, and vertical **Netflix Top 10** ribbons.

### 📺 Smart Season & Anime Ordering
* **Original Parts Detection**: Automatically detects multi-part series (e.g. *Money Heist*, *Lupin*) and presents them as intended.
* **Anime Episode Unpacker**: Fixes TMDB mega-season collapses (e.g. *Re:ZERO*, *Jujutsu Kaisen*) by unpacking episodes into proper seasonal arcs.
* **TheTVDB & AniZip Integration**: Choose alternative episode orderings (Aired, DVD, Absolute, Alternate) or AniZip mappings.

### 🌐 Custom Catalogs & Ecosystem Proxy
* **Watchlist & Collection Sync**: Import personal lists from **Letterboxd**, **Trakt**, **TMDb**, **TheTVDB**, and **MDBList**.
* **Stremio Addon Proxy**: Inject SpatialPosters custom posters into any external Stremio add-on (such as AIOMetadata or CyberFlix).

---

## 🚀 Quick Deployment Guide

### ⚡ Option A: Vercel Deployment (Recommended - 1-Click)

1. **Get a Free TMDB API Key**:
   * Sign up on [themoviedb.org](https://www.themoviedb.org/signup).
   * Go to **Settings → API** ([themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)) and copy your **API Key (v3 auth)**.
2. **Fork this Repository**:
   * Click **Fork** on [**github.com/TheAceOfficials/SpatialPosters**](https://github.com/TheAceOfficials/SpatialPosters).
3. **Import to Vercel**:
   * Go to [vercel.com](https://vercel.com) and click **Add New… → Project**.
   * Import your **SpatialPosters** fork.
   * Add Environment Variables:
     * `SPATIALPOSTERS_TMDB_KEY` = *your TMDB v3 API key*
     * `SPATIALPOSTERS_PUBLIC_INSTANCE` = `1`
   * Click **Deploy**.
4. **Connect Upstash Redis Storage**:
   * In your Vercel project dashboard, go to **Storage → Connect Store → Upstash (Redis)**.
   * Click **Create & Connect** (Vercel sets `KV_REST_API_URL` and `KV_REST_API_TOKEN` automatically).
5. **Redeploy**:
   * Go to **Deployments** → Click **⋯** on the latest build → **Redeploy** to bind the database.

---

### 🐳 Option B: Docker Compose

Create a `docker-compose.yml` file:

```yaml
services:
  spatialposters:
    image: spatialposters:latest
    container_name: spatialposters
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - SPATIALPOSTERS_PUBLIC_INSTANCE=1
      - SPATIALPOSTERS_TMDB_KEY=your_tmdb_key_here
    volumes:
      - spatialposters-data:/data

volumes:
  spatialposters-data:
```

Run:
```bash
docker compose up -d
```
Access the addon manifest at `http://<YOUR-SERVER-IP>:8080/manifest.json`.

---

## 🔑 Environment Variables Reference

> [!NOTE]
> All configuration variables use the primary `SPATIALPOSTERS_*` prefix. Full backward compatibility is maintained for legacy `PICTORIUM_*` and `POSTERIUM_*` keys.

| Variable | Default | Description |
|---|:---:|---|
| `SPATIALPOSTERS_PUBLIC_INSTANCE` | `0` | Set to `1` on Vercel/HF to enable poster saving and public editor access. |
| `SPATIALPOSTERS_TMDB_KEY` | *(optional)* | Global TMDB API key to power catalog rendering without per-user keys. |
| `SPATIALPOSTERS_TVDB_API_KEY` | *(optional)* | TheTVDB API key for alternate season orderings and episode descriptions. |
| `SPATIALPOSTERS_MDBLIST_KEY` | *(optional)* | MDBList API key for custom lists and anime catalog ranks. |
| `SPATIALPOSTERS_REGION` | `US` | Default region for JustWatch/FlixPatrol charts and localized titles (`US`, `GB`, `IN`, `CA`, `AU`, `DE`, `FR`, `ES`, `IT`, etc.). |
| `SPATIALPOSTERS_DATA_DIR` | `./data` | Local storage folder for database and saved mappings. |
| `KV_REST_API_URL` / `TOKEN` | *(empty)* | Upstash Redis connection parameters for serverless deployment on Vercel. |
| `SPATIALPOSTERS_BADGE_STYLE` | `shadow` | Default genre/rating badge style (`shadow`, `pill`, `bar`, `colored`, `bordo`, `vetro`). |
| `SPATIALPOSTERS_RANKING_BADGE_STYLE` | `default` | Default ranking badge style (`default`, `bar`, `colored`, `pill`, `netflix`). |
| `SPATIALPOSTERS_MAX_CONCURRENT_RENDERS` | `4` | Concurrency limit for Sharp rendering engine. |

---

## 🧪 Local Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/TheAceOfficials/SpatialPosters.git
cd SpatialPosters
npm install
```

Start the development server:
```bash
npm run dev
```

Run unit tests and type checks:
```bash
npm run typecheck
npm run test
```

---

<p align="center">
  Made with ❤️ by <b>TheAceOfficials</b> team & community contributors.
</p>
