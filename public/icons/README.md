# PWA icons for MangaVerse

Place the following PNG files in this folder (paths referenced by `public/manifest.webmanifest`):

- icon-192.png (192x192)
- icon-512.png (512x512)
- maskable-192.png (192x192, with safe margin)
- maskable-512.png (512x512, with safe margin)
- apple-touch-icon.png (180x180)

Quick way to generate from `assets/images/icon.png` using pwa-asset-generator:

```bash
# Install locally
npm i -D pwa-asset-generator

# Generate icons into public/icons
npx pwa-asset-generator assets/images/icon.png public/icons \
  -i public/manifest.webmanifest \
  -m \
  --favicon \
  --background '#ffffff' \
  --type png \
  --portrait-only
```

After generation, verify the manifest was updated with the generated icons.
