#!/usr/bin/env node
/*
 Generate Android adaptive icon layers from assets/images/icon.png
 - Foreground: 432x432 px PNG (transparent background)
 - Background: 432x432 px PNG (solid color)
 - Monochrome: 432x432 px single-color glyph

 Usage:
   node scripts/generate-android-icons.js [--src ./assets/images/icon.png] [--bg #E6F4FE] [--size 432]
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const argv = process.argv.slice(2);
  const getArg = (name, def) => {
    const idx = argv.findIndex(a => a === name || a.startsWith(name + '='));
    if (idx === -1) return def;
    const val = argv[idx].includes('=') ? argv[idx].split('=')[1] : argv[idx + 1];
    return val ?? def;
  };

  const projectRoot = process.cwd();
  const srcPath = path.resolve(projectRoot, getArg('--src', './assets/images/icon.png'));
  const outDir = path.resolve(projectRoot, './assets/images');
  const bgColor = getArg('--bg', '#E6F4FE');
  const size = parseInt(getArg('--size', '432'), 10);

  if (!fs.existsSync(srcPath)) {
    console.error(`Source icon not found: ${srcPath}`);
    process.exit(1);
  }

  // Lazy import sharp with helpful error if not installed
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.error('\nMissing dependency: sharp\nInstall it first: npm i -D sharp\n');
    process.exit(1);
  }

  const fgOut = path.join(outDir, 'android-icon-foreground.png');
  const bgOut = path.join(outDir, 'android-icon-background.png');
  const monoOut = path.join(outDir, 'android-icon-monochrome.png');

  // Foreground: contain-fit into size x size with transparent padding
  // Add a small inset (12.5%) to avoid clipping in mask
  const inset = Math.round(size * 0.125);
  const canvasSize = size;
  const contentSize = size - inset * 2;

  // Prepare a transparent canvas
  const transparent = Buffer.from([
    0, 0, 0, 0 // placeholder; we'll build via sharp later
  ]);

  const canvas = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  // Resize the source icon to contentSize x contentSize (contain, preserving aspect)
  const src = sharp(srcPath).resize({
    width: contentSize,
    height: contentSize,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  });

  const srcBuf = await src.png().toBuffer();

  // Composite centered with inset
  await canvas
    .composite([
      { input: srcBuf, left: inset, top: inset },
    ])
    .png()
    .toFile(fgOut);

  // Background: solid color square
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bgColor,
    },
  })
    .png()
    .toFile(bgOut);

  // Monochrome: derive mask from the alpha channel of the resized source so we only keep opaque glyph
  const resizedSrc = await sharp(srcPath)
    .resize({ width: contentSize, height: contentSize, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Extract alpha channel as mask (anything with alpha > 0 becomes opaque)
  const alphaMask = await sharp(resizedSrc)
    .ensureAlpha()
    .extractChannel('alpha')
    .threshold(1)
    .toBuffer();

  const monoCanvas = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  const whiteGlyph = await sharp({
    create: {
      width: contentSize,
      height: contentSize,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  const whiteGlyphMasked = await sharp(whiteGlyph)
    .joinChannel(alphaMask) // use alpha mask from source as the glyph shape
    .toBuffer();

  await monoCanvas
    .composite([{ input: whiteGlyphMasked, left: inset, top: inset }])
    .png()
    .toFile(monoOut);

  console.log('\n✓ Generated Android adaptive icons:');
  console.log('  -', path.relative(projectRoot, fgOut));
  console.log('  -', path.relative(projectRoot, bgOut));
  console.log('  -', path.relative(projectRoot, monoOut));
  console.log('\nUpdate app.json android.adaptiveIcon if needed and reload Expo.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
