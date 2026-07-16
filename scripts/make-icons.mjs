import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const outputDir = path.join(process.cwd(), "public", "icons");

function sealSvg({ maskable = false } = {}) {
  const sealRadius = maskable ? 292 : 336;
  const innerRadius = sealRadius - 42;

  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <rect width="1024" height="1024" rx="${maskable ? 0 : 216}" fill="#f3ecdd"/>
      <circle cx="512" cy="512" r="408" fill="none" stroke="#39518f" stroke-width="18" opacity="0.2"/>
      <circle cx="512" cy="512" r="${sealRadius}" fill="#8c2318"/>
      <circle cx="482" cy="474" r="${sealRadius - 18}" fill="#a72f22"/>
      <circle cx="446" cy="420" r="${Math.round(sealRadius * 0.52)}" fill="#c04434" opacity="0.42"/>
      <circle cx="512" cy="512" r="${innerRadius}" fill="none" stroke="#f6ddd0" stroke-width="12" opacity="0.42"/>
      <text x="512" y="555" text-anchor="middle" fill="#f6ddd0" font-family="Georgia, serif" font-size="190" font-weight="700" letter-spacing="10">Q♥Z</text>
      <text x="512" y="661" text-anchor="middle" fill="#f6ddd0" font-family="Courier New, monospace" font-size="44" font-weight="700" letter-spacing="14" opacity="0.9">SEALED</text>
    </svg>
  `);
}

async function writeIcon(filename, size, options) {
  await sharp(sealSvg(options)).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(outputDir, filename));
}

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeIcon("icon-192.png", 192),
  writeIcon("icon-512.png", 512),
  writeIcon("icon-512-maskable.png", 512, { maskable: true }),
  writeIcon("apple-touch-icon.png", 180),
]);

console.log(`Generated app icons in ${outputDir}`);
