---
title: Pictorium
emoji: 🖼️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 8080
pinned: false
---

<p align="center">
  <img src="public/pictorium.png" alt="Pictorium" width="380" />
</p>

<h3 align="center">Generatore Dinamico di Poster Cinematografici per Stremio & Media Center</h3>

<p align="center">
  <a href="README.md"><b>🇮🇹 Leggi in Italiano</b></a> • <a href="README.en.md"><b>🇬🇧 Read in English</b></a>
</p>

<p align="center">
  Locandine clean senza testo, loghi vettoriali ad alta definizione, rating IMDb/TMDB/Rotten Tomatoes, badge qualità streaming 4K, classifiche Netflix Top 10 e ordinamento stagioni intelligente. Tutto renderizzato al volo con Sharp C++ & SVG.
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FEful97%2FPictorium"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
  <a href="#-docker--compose"><img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D20-green?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="License AGPLv3" />
</p>

---

## 📸 Anteprima

<div align="center">
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/home.png" alt="Pictorium Home" width="100%" style="border-radius: 8px; margin-bottom: 8px;" />
</div>

<table align="center" width="100%">
  <tr>
    <td width="50%"><img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/editor.png" alt="Pictorium Editor" style="border-radius: 6px;" /></td>
    <td width="50%"><img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/myposters.png" alt="Pictorium My Posters" style="border-radius: 6px;" /></td>
  </tr>
  <tr>
    <td align="center"><em>Editor WYSIWYG & Anteprima Live</em></td>
    <td align="center"><em>I Miei Poster & Libreria Personale</em></td>
  </tr>
  <tr>
    <td colspan="2"><img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/catalogs.png" alt="Pictorium Catalogs" style="border-radius: 6px; margin-top: 8px;" /></td>
  </tr>
  <tr>
    <td align="center" colspan="2"><em>Cataloghi Dinamici & Classifiche Streaming JustWatch</em></td>
  </tr>
</table>

<div align="center" style="margin-top: 12px;">
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/1405.jpg" alt="Poster Demo" width="32%" style="border-radius: 6px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/155.jpg" alt="Poster Demo — The Dark Knight" width="32%" style="border-radius: 6px;" />
  <img src="https://raw.githubusercontent.com/Eful97/Pictorium/master/public/Screen/66732.jpg" alt="Poster Demo — Stranger Things" width="32%" style="border-radius: 6px;" />
</div>

---

## ⚡ Caratteristiche Principali

| Funzionalità | Descrizione |
|---|---|
| 🎯 **Motore Grafico WYSIWYG** | Un unico endpoint (`/api/poster/{type}/{id}`) basato su Sharp C++ ed SVG serve l'anteprima web in tempo reale e il poster finale su Stremio con pixel-perfect sync. |
| 📦 **Addon 100% Autonomo** | Fornisce direttamente a Stremio schede dettagliate, trame localizzate, loghi trasparenti, sfondi 4K, trailer YouTube e tutte le stagioni con thumbnail ed episodi tradotti. |
| 📺 **Ordinamento Intelligente Parti & Anime** | Rileva automaticamente i gruppi **Original Parts** (es. *La Casa di Carta*, *Lupin*) e spacchetta le mega-stagioni uniche degli anime su TMDB (es. *Re:ZERO*, *Jujutsu Kaisen*) nelle vere stagioni con cui sono distribuiti. |
| 🏷️ **Badge Qualità & Voti** | Visualizza in tempo reale risoluzione video (4K/1080p/720p), voti aggregati da oltre 16 fonti (IMDb, TMDB, Rotten Tomatoes, Letterboxd, MAL), premi Oscar/Cannes e nastri Netflix Top 10. |
| 🌐 **Cataloghi Personalizzati** | Importa watchlist e collezioni da **Letterboxd, Trakt, TMDb, TheTVDB, MDBList** e classifiche trend in tempo reale tramite JustWatch GraphQL. |
| 🌍 **Interfaccia Multilingua Dinamica** | Interfaccia localizzata (Italiano, English, Français, Deutsch, Español, Português, 日本語, 한국어) con cambio lingua istantaneo in tempo reale senza ricaricare la pagina. |
| 🔒 **Protezione con PIN & Sicurezza** | Protezione ad ogni avvio e ricaricamento (F5) per l'editor, configurabile subito nel wizard iniziale (Step 3) o nelle Impostazioni. Locandine, manifest e cataloghi per Stremio restano 100% aperti e sempre funzionanti. |
| ⚡ **Zero Conflitti di Cache** | Versioning deterministico con `RENDER_VERSION` e `APP_VERSION` automatiche. Se cambi uno stile, Stremio aggiorna istantaneamente le immagini. |

---

## 🛠️ Funzionalità in Dettaglio

### 🖼️ Locandine, Loghi & Grafica
* **Selezione Poster Clean**: Scegli in un click la locandina senza testo tra i candidati ufficiali TMDB (`iso_639_1 === null`).
* **Algoritmo Best-Fit Intelligente**: Analizza luminosità e zone vuote per scalare e posizionare il logo evitando di coprire i volti.
* **Sfocatura Sfondo (Sharp C++)**: Generazione di sfondi blur cinematografici ultra-rapidi (10–20ms) a basso consumo di RAM.
* **Rotazione Automatica 24h**: Alterna automaticamente ogni giorno più poster salvati per lo stesso titolo.
* **Loghi Network Ufficiali**: Riconoscimento ed embedding automatico per Netflix, Prime Video, Disney+, Apple TV+, HBO Max, Paramount+, Sky/NOW, Crunchyroll, Rai, Mediaset e oltre 30 studi (Marvel, Pixar, Ghibli, Warner Bros, A24).

### 🏷️ Badge, Rating & Riconoscimenti
* **✨ Qualità Streaming (4K / 1080p / 720p / SD)**: Rilevata in tempo reale dai flussi di Stremio con fallback automatico su JustWatch.
* **6 Stili Badge Genere & Voto**: *Shadow, Pill, Bar, Colored, Bordo, Vetro* con palette adattiva alla locandina.
* **Nastro Verticale Netflix Top 10**: Il caratteristico nastro rosso laterale con posizione live (supporto dedicato anche per Anime).
* **Premi Cinematografici**: Riconoscimento automatico Oscar, Cannes, BAFTA, Emmy e badge *"Absolute Cinema"* per i titoli della IMDb Top 250.
* **Classifiche Sempre Sincronizzate**: Il badge Top 10/20 segue la classifica live; se un titolo esce dalla chart, il badge si aggiorna da solo.

### 📺 Stagioni, Episodi & Anime
* **✨ Rilevamento Automatico Parti**: Passa in automatico da stagioni standard a Parti originali per serie come *La Casa di Carta* (5 parti) e *Lupin* (4 parti).
* **🌀 Spacchettamento Anime**: Risolve la catalogazione TMDB che comprime intere serie anime in una sola stagione (es. *Re:ZERO* 85 episodi, *Jujutsu Kaisen* 59 episodi), ripristinando la corretta suddivisione stagionale (S1, S2, S3, S4 + Speciali in S0).
* **Supporto TVDB & AniZip**: Possibilità di selezionare manualmente gli ordinamenti alternativi TheTVDB (*Aired, DVD, Absolute, Alternate*) o AniZip (*AniList / AniDB*).
* **Anteprima Episodi Live**: Visualizza prima di salvare esattamente come appariranno le stagioni, i titoli e le miniature in Stremio.

### 🔒 Sicurezza & Protezione Pannello (PIN)
* **Blocco Pannello ad Ogni Avvio & Ricarica (F5)**: Richiesta automatica del codice PIN all'avvio dell'app e ad ogni ricaricamento di pagina per proteggere i tuoi poster salvati e le modifiche.
* **Configurazione Guidata Iniziale**: Al primo avvio, lo Step 3 del wizard iniziale ti consente di impostare subito il PIN di protezione in pochi secondi (o saltare il passaggio).
* **Tastierino Virtuale & Tastiera Fisica**: Inserimento agevole sia da smartphone/tablet che da desktop, con feedback di sicurezza visivo ed errore su codice errato.
* **Gestione Flessibile**: Modifica o rimozione del PIN in qualsiasi momento dalla sezione *Dati & Cache* nel pannello Impostazioni.
* **Stremio 100% Invariato**: Il PIN protegge esclusivamente l'editor web: gli endpoint Stremio (`/manifest.json`, `/api/poster/*`, `/catalog/*`, `/api/health`) rimangono sempre accessibili e senza alcuna interruzione.

---

## 🚀 Deploy Rapido

Scegli la modalità più comoda per la tua installazione:

| Piattaforma | Costo | Tipologia | Persistenza | Ideale per |
|---|---|---|---|---|
| [▲ **Vercel**](#-vercel) | **Gratis** | Serverless | Upstash Redis (KV) | **Consigliato**: 1 click, zero manutenzione, CDN globale ([📺 Video Guida](https://www.youtube.com/watch?v=FP6VJ2vGYiY)) |
| [🐳 **Docker Compose**](#-docker--compose) | **Gratis** | Container | Volume locale (`/data`) | NAS, Home Server, mini-PC (Unraid/TrueNAS) |
| [🤗 **Hugging Face**](#-hugging-face-spaces) | **Gratis** | Docker (16GB RAM) | Storage Bucket | Ottima RAM gratuita per istanze condivise |
| [🦾 **Oracle Cloud**](#-altre-modalit-di-installazione) | **Gratis** | VPS ARM (24GB RAM) | Disco Locale | Sempre online con risorse dedicate a costo zero |

---

### ☁️ Vercel (Gratuito & Consigliato)

[![Video Guida YouTube](https://img.shields.io/badge/YouTube-Video_Guida_Setup-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=FP6VJ2vGYiY)

> 📺 **Video Tutorial Passo-Passo**: preferisci seguire la procedura a video? Guarda la [**Video Guida su YouTube**](https://www.youtube.com/watch?v=FP6VJ2vGYiY) per completare il setup in meno di 2 minuti.

Ideale se non hai un server domestico. Setup in 2 minuti a costo zero con aggiornamenti automatici a 1 click:

1. **Ottieni la tua API Key TMDB (gratis)**:
   * Crea un account su [themoviedb.org](https://www.themoviedb.org/signup).
   * Vai in **Impostazioni → API** ([themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)) e genera una chiave API (*Developer*).
   * Copia la **Chiave API (autenticazione v3)** (stringa di 32 caratteri, *non* il token di lettura lungo).
2. **Fai il Fork della Repository**:
   * Vai su [**github.com/Eful97/Pictorium**](https://github.com/Eful97/Pictorium).
   * Clicca sul pulsante **Fork** in alto a destra e poi su **Create fork** (puoi lasciarla sia pubblica che privata).
3. **Importa il progetto su Vercel**:
   * Vai su [vercel.com](https://vercel.com) ed effettua l'accesso con il tuo account GitHub.
   * Clicca in alto su **Add New…** → **Project**.
   * Trova la tua repository **Pictorium** appena forkata e clicca su **Import**.
   * Nella sezione **Environment Variables**, inserisci:
     * `PICTORIUM_TMDB_KEY` = la tua chiave TMDB v3 (32 caratteri).
     * `PICTORIUM_PUBLIC_INSTANCE` = `1`
   * Clicca su **Deploy**.
4. **Collega Upstash Redis (database gratuito per salvare i tuoi poster)**:
   * A fine deploy, vai nella dashboard del progetto su Vercel.
   * Clicca sulla scheda **Storage** in alto → **Connect Store** (o **Create Database**) → seleziona **Upstash (Redis)**.
   * Scegli una regione vicina e clicca **Create & Connect** (Vercel imposterà automaticamente `KV_REST_API_URL` e `KV_REST_API_TOKEN`).
5. **Redeploy (Passaggio fondamentale!)**:
   * Vai nella scheda **Deployments** del progetto.
   * Clicca sui **tre puntini (⋯)** dell'ultimo deployment e seleziona **Redeploy**.
   * *(Nota: Vercel applica il database Upstash solo dal redeploy in poi)*.
6. **Installazione su Stremio & PIN iniziale**:
   * Apri l'URL generato (es. `https://tuo-pictorium.vercel.app`).
   * Completa la configurazione guidata (Lingua, Regione e imposta il tuo **PIN di sicurezza**).
   * Clicca su **Installa su Stremio**! *(Puoi verificare che tutto sia ok aprendo `/api/health`, che deve indicare `"storage": "kv"` e `"status": "ok"`)*.

---

#### 🔄 Come Aggiornare in Futuro (1 Click con Sync Fork)
Avendo fatto il Fork al punto 2, aggiornare la tua istanza quando escono nuove versioni richiede un solo click, senza dover riconfigurare nulla:
1. Apri la pagina del tuo fork su GitHub (`https://github.com/<tuo-username>/Pictorium`).
2. Sotto il titolo del repository clicca sul pulsante **Sync fork** → **Update branch**.
3. Vercel rileva subito il nuovo commit e **compila ed effettua il deploy automatico in 60 secondi** mantenendo intatti il database Upstash, le impostazioni, il PIN e i tuoi poster!

---

### 🐳 Docker & Compose

Crea un file `docker-compose.yml`:

```yaml
services:
  pictorium:
    image: eful97/pictorium:latest # o build locale: .
    container_name: pictorium
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - PICTORIUM_PUBLIC_INSTANCE=1
      - PICTORIUM_TMDB_KEY=la_tua_chiave_tmdb
    volumes:
      - pictorium-data:/data

volumes:
  pictorium-data:
```

Avvia il container:
```bash
docker compose up -d
```
Il manifest per Stremio sarà disponibile su: `http://<IP-SERVER>:8080/manifest.json`.

---

<details>
<summary><strong>👉 Altre modalità di installazione (Hugging Face, Oracle Cloud, VPS Caddy, Termux)</strong></summary>

#### 🤗 Hugging Face Spaces
1. Crea una Space su Hugging Face con SDK **Docker** collegata al repo `Eful97/Pictorium`.
2. In **Settings → Variables and secrets**:
   * `NODE_OPTIONS` = `--max-old-space-size=1024`
   * `PICTORIUM_PUBLIC_INSTANCE` = `1`
   * `PICTORIUM_TMDB_KEY` = *la tua chiave TMDB*
3. In **Settings → Storage**, collega uno Storage Bucket montato su `/data`.
4. Manifest Stremio: `https://<tua-space>.hf.space/manifest.json`.

#### 🦾 Oracle Cloud Always Free (ARM Ampere)
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
git clone https://github.com/Eful97/Pictorium && cd Pictorium
echo "PICTORIUM_PUBLIC_INSTANCE=1" > .env
echo "PICTORIUM_TMDB_KEY=la_tua_chiave" >> .env
sudo docker compose up -d
```

#### 🖥️ VPS + Caddy (HTTPS Automatico)
```caddyfile
tuodominio.com {
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

## 🔑 Configurazione & Variabili d'Ambiente

### Variabili Essenziali

> [!NOTE]
> Tutte le variabili supportano il prefisso `PICTORIUM_*` (consigliato, es. `PICTORIUM_TMDB_KEY`) con pieno supporto retrocompatibile alle vecchie variabili `POSTERIUM_*`.

| Variabile | Default | Descrizione |
|---|:---:|---|
| `PICTORIUM_PUBLIC_INSTANCE` | `0` | Imposta a `1` su Vercel/HF per consentire il salvataggio dei poster e l'uso dell'editor senza token admin. |
| `PICTORIUM_TMDB_KEY` | *(opzionale)* | Chiave API TMDB d'istanza per generare poster e cataloghi senza doverla inserire nei client. |
| `PICTORIUM_TVDB_API_KEY` | *(opzionale)* | Chiave TheTVDB per ordinamenti stagioni alternativi e descrizioni episodi. |
| `PICTORIUM_MDBLIST_KEY` | *(opzionale)* | Chiave MDBList per liste personalizzate e cataloghi anime. |
| `PICTORIUM_REGION` | `IT` | Paese delle classifiche JustWatch/FlixPatrol e lingua dei titoli (`IT`, `US`, `GB`, `FR`, `DE`, `ES`, `MX`, `IL`, `JP`, `KR`, `BR`, `IN`, `CA`, `AU`). Overridabile per-richiesta con `?region=` e per-utente via config-token/default salvati. |
| `PICTORIUM_DATA_DIR` | `./data` | Cartella di persistenza su disco per database e file salvati. |
| `KV_REST_API_URL` / `TOKEN` | *(vuoto)* | Parametri di connessione Upstash Redis per deploy serverless su Vercel. |

---

<details>
<summary><strong>⚙️ Variabili Avanzate, Stili Predefiniti & Pipeline di Rendering</strong></summary>

### Stili Grafici Predefiniti per i Cataloghi
| Variabile | Valori | Effetto |
|---|---|---|
| `PICTORIUM_BADGE_STYLE` | `shadow`, `pill`, `bar`, `colored`, `bordo`, `vetro` | Stile dei badge genere/voto. |
| `PICTORIUM_RANKING_BADGE_STYLE` | `default`, `bar`, `colored`, `pill`, `netflix` | Stile del badge per le classifiche. |
| `PICTORIUM_RIBBON_SIDE` | `left` / `right` | Lato del nastro verticale Netflix Top 10. |
| `PICTORIUM_BLUR_ENABLED` | `1` / `0` | Attiva o disattiva lo sfondo sfocato. |
| `PICTORIUM_BADGE_QUALITY` | `1` / `0` | Mostra/nasconde il badge qualità streaming (4K/1080p). |
| `PICTORIUM_NETWORK_LOGO` | `1` / `0` | Mostra/nasconde il logo del network (Netflix, Prime, ecc.). |
| `PICTORIUM_GRADIENT_HEIGHT` | `5` – `100` | Altezza percentuale del gradiente nero inferiore. |

### Concorrenza & Protezione Memoria
| Variabile | Default | Descrizione |
|---|:---:|---|
| `PICTORIUM_MAX_CONCURRENT_RENDERS` | `4` | Massimo numero di render paralleli su Sharp (protezione OOM). |
| `PICTORIUM_RENDER_TIMEOUT_MS` | `30000` | Timeout massimo per completare un render (ms). |
| `PICTORIUM_CACHE_MAX_MB` | `150` | Memoria RAM massima riservata alla cache delle immagini. |
| `PICTORIUM_SELF_WARMUP` | `1` | Preriscaldamento automatico dei cataloghi all'avvio. |
| `PICTORIUM_LOG_LEVEL` | `info` | Livello di log (`debug`, `info`, `warn`, `error`). |
</details>

---

## 🧪 Sviluppo in Locale

```bash
# 1. Clona il repository
git clone https://github.com/Eful97/Pictorium && cd Pictorium

# 2. Installa le dipendenze
npm install

# 3. Avvia il server di sviluppo
npm run dev

# 4. Esegui i test unitari (Vitest)
npm test

# 5. Verifica completa del codice (Typecheck + Lint + Unit test + Build)
npm run verify
```

---

## 📄 Licenza & Crediti

* Rilasciato sotto licenza open-source **GNU Affero General Public License v3.0 (AGPL-3.0)**.
* Ispirato al progetto [erdb](https://github.com/realbestia1/erdb) di realbestia1.
* Dati e metadati forniti da [TMDb](https://www.themoviedb.org/), [TheTVDB](https://thetvdb.com/) e [JustWatch](https://www.justwatch.com/).
* Loghi network e studi cinematografici per gentile concessione di [Wikimedia Commons](https://commons.wikimedia.org/).
