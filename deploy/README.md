# Deploying MangaVerse PWA on a VPS (mikr.us)

This guide covers building the Expo web export, uploading it to your server, configuring Nginx (with SSL), and verifying the PWA.

## 1) Build a static web export

```bash
# From the project root
npx expo export --platform web --output-dir dist
```

The `dist/` folder will contain `index.html`, `manifest.webmanifest`, `sw.js`, and assets.

## 2) Upload to VPS

```bash
# Adjust user, host, and target path to your environment
rsync -avz --delete dist/ user@vps:/var/www/mangaverse
```

Ensure the target directory exists and is readable by Nginx (e.g., `/var/www/mangaverse`).

## 3) Configure Nginx (custom port 40141)

Use `deploy/nginx.conf.example` as a template. Update:
- `server_name` to your subdomain (e.g., `manga.yourdomain.mikr.us`)
- `root` to your deploy path
- `listen` port to `40141` (already set in the example)

Then enable the site and reload Nginx:

```bash
sudo ln -s /path/to/repo/deploy/nginx.conf.example /etc/nginx/sites-available/mangaverse.conf
sudo ln -s /etc/nginx/sites-available/mangaverse.conf /etc/nginx/sites-enabled/mangaverse.conf
sudo nginx -t
sudo systemctl reload nginx
```

## 4) HTTPS and PWA

- Service Workers (instalowalne PWA) wymagają HTTPS. Jeśli zostaniesz przy HTTP na porcie 40141, część funkcji PWA (SW) będzie wyłączona na większości przeglądarek/mobilkach.
- Rekomendacje:
	1. Użyj standardowego 443 na tym samym serwerze z inną subdomeną (Nginx obsługuje wiele vhostów na 443) i reverse proxy do 40141, lub
	2. Skonfiguruj HTTPS bezpośrednio na 40141, jeśli masz certyfikat (panel mikr.us lub DNS-01 w Let’s Encrypt). W pliku `nginx.conf.example` dodałem zakomentowany blok dla `listen 40141 ssl` – wystarczy podać ścieżki do certów.

Uwaga: Let’s Encrypt HTTP-01 wymaga portu 80, więc jeśli 80 jest zajęty na tym hoście, użyj DNS-01 lub zrób terminację TLS na 443 i reverse proxy do 40141.

## 5) Verify PWA
- Chrome/Android: open the site → install prompt (or Chrome menu → Install App)
- iOS Safari: Share → Add to Home Screen
- DevTools → Application → Manifest and Service Workers should show correct status.

## 6) Updating the app
- Rebuild and re-upload `dist/` via `rsync`.
- To force clients to pick up new assets, consider bumping the cache version in `public/sw.js` (e.g., `mv-app-v2`).
- Clear old SW in DevTools if needed (Application → Service Workers → Unregister).

## Notes
- If you deploy under a subpath (e.g., `/mangaverse`), update `start_url` and `scope` in `public/manifest.webmanifest` to match the base path.
- If a CDN or proxy is in front (e.g., Cloudflare), ensure `sw.js` is not cached and `manifest.webmanifest` has `Content-Type: application/manifest+json`.
