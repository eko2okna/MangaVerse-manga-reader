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

- Service Workers (instalowalne PWA) wymagają HTTPS. Jeśli zostaniesz przy HTTP na porcie 40141, SW nie zarejestruje się (poza localhost).
- Cloudflare i niestandardowe porty:
	- Cloudflare proxy (pomarańczowa chmurka) obsługuje tylko wybrane porty; 40141 nie jest na liście proxy’owanych portów.
	- Masz 2 proste opcje, żeby mieć HTTPS przy zachowaniu 40141 na serwerze:
		1. Cloudflare Tunnel (cloudflared): domena na 443 u Cloudflare → tunel do `http://localhost:40141`. Nie musisz otwierać 80/443 na VPS. Patrz niżej (sekcja 4.1).
		2. HTTPS na 40141 bezpośrednio na VPS (origin TLS) i „DNS only” w Cloudflare (szara chmurka). Wtedy wchodzisz przez `https://domena:40141`.

### 4.1 Cloudflare Tunnel (polecane bez grzebania w 443 na VPS)

1. Zainstaluj cloudflared na VPS (Ubuntu/Debian przykład):
```bash
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt update && sudo apt install -y cloudflared
```

2. Zaloguj i utwórz tunel:
```bash
cloudflared tunnel login
cloudflared tunnel create mangaverse-tunnel
```

3. Skonfiguruj trasę i ingress (patrz `deploy/cloudflared-tunnel.example.yml`), np.:
```yaml
ingress:
	- hostname: mangaverse.tojest.dev
		service: http://localhost:40141
	- service: http_status:404
```

4. Zmapuj DNS:
```bash
cloudflared tunnel route dns mangaverse-tunnel mangaverse.tojest.dev
```

5. Uruchom jako usługę:
```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Po tym Twoja domena będzie dostępna po HTTPS (przez Cloudflare) i będzie proxy’owana do lokalnego portu 40141 na VPS.

### 4.2 HTTPS bezpośrednio na 40141 (origin TLS)

- Użyj `deploy/nginx.40141-ssl.conf.example`, podaj ścieżki do certów i `root /mangaverse;`.
- W Cloudflare ustaw rekord DNS na „DNS only” (szara chmurka), i łącz się przez `https://mangaverse.tojest.dev:40141`.

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
