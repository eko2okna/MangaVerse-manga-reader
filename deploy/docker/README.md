# Dockerized static PWA server (port 40141)

This setup serves the exported web build from `/mangaverse` using Nginx in a container.

## 1) Export the site

```bash
npx expo export --platform web --output-dir /home/igor/Documents/mangaverse-export
```

## 2) Upload to VPS and place under /mangaverse

```bash
ssh -p 10161 user@[2a01:4f9:3a:12d7::161] 'sudo mkdir -p /mangaverse && sudo chown -R user:user /mangaverse'
rsync -avz --progress --delete -e "ssh -p 10161" /home/igor/Documents/mangaverse-export/ user@[2a01:4f9:3a:12d7::161]:/mangaverse
```

## 3) Build and run the container on VPS

```bash
# On the VPS, in your cloned repo directory
cd /path/to/MangaVerse-manga-reader
docker compose -f deploy/docker/docker-compose.yml up -d --build
```

- The container listens on port 40141 (IPv4/IPv6).
- It serves files from `/mangaverse` (mounted read-only).

## 4) HTTPS options (for full PWA / Service Worker)
- Cloudflare Tunnel: map `mangaverse.tojest.dev` → `http://localhost:40141` (see `deploy/README.md`).
- Or terminate TLS on the host/another container and reverse proxy to `mangaverse-web:40141`.

## 5) Update flow

Re-export locally and rsync again:
```bash
npx expo export --platform web --output-dir /home/igor/Documents/mangaverse-export
rsync -avz --progress --delete -e "ssh -p 10161" /home/igor/Documents/mangaverse-export/ user@[2a01:4f9:3a:12d7::161]:/mangaverse
# The container will serve the new files immediately.
```
