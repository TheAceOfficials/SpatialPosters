# 🍿 Jellyfin Integration Guide — SpatialPosters

SpatialPosters provides 1-Click integration for **Jellyfin Media Server** via the official SpatialPosters Jellyfin Plugin (`IRemoteImageProvider` & `IScheduledTask`).

---

## ⚡ Quick 1-Click Installation in Jellyfin

### Step 1: Add SpatialPosters Plugin Repository

1. Open your Jellyfin Admin Dashboard.
2. Go to **Plugins** → **Repositories** → Click **+ Add Repository**.
3. Fill in:
   - **Repository Name**: `SpatialPosters`
   - **Repository URL**: `https://your-spatialposters-instance.com/api/jellyfin/manifest`
4. Click **Save**.

### Step 2: Install the SpatialPosters Plugin

1. Go to **Plugins** → **Catalog** tab.
2. Scroll to the **Metadata** section and click **SpatialPosters**.
3. Click **Install** and select the latest version (`1.0.0`).
4. Restart your Jellyfin server.

---

## ⚙️ Plugin Configuration

1. In Jellyfin Admin Dashboard, go to **Plugins** → **SpatialPosters**.
2. Configure:
   - **SpatialPosters Server URL**: `https://your-spatialposters-instance.com`
   - **Default Artwork Language**: `en` / `it` / `fr` / `de` / `es` / `hi`
   - **Config Token (Optional)**: `u=your_user_token`
3. Click **Save Settings**.

---

## 🖼️ Enable SpatialPosters Image Fetcher for Libraries

1. Go to **Admin Dashboard** → **Libraries**.
2. Click on a library (e.g. **Movies** or **TV Shows**).
3. Scroll down to **Image Fetchers**.
4. Check **SpatialPosters** and move it to the top of the list!
5. Save library settings.

---

## 🔄 Automatic 1-Click Library Batch Sync

1. Go to **Admin Dashboard** → **Scheduled Tasks**.
2. Locate **Sync SpatialPosters Artwork** under **Metadata**.
3. Click the Play button ▶️ to start an instant 1-click batch sync across your entire library!
4. You can also schedule this task to run automatically every 24 hours (default: 3 AM daily).
