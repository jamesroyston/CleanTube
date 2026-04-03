import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import toIco from "to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(__dirname, "app-icon-source.svg");
const svg = readFileSync(svgPath);

/** Letterbox non-square art (matches SVG corners). */
const BG = { r: 15, g: 23, b: 42, alpha: 1 };

async function rasterSquare(size) {
  return sharp(svg, { density: 144 })
    .resize(size, size, {
      fit: "contain",
      background: BG,
      position: "center",
    })
    .png()
    .toBuffer();
}

const [b16, b32, b48] = await Promise.all([
  rasterSquare(16),
  rasterSquare(32),
  rasterSquare(48),
]);

writeFileSync(path.join(root, "src/app/favicon.ico"), await toIco([b16, b32, b48]));
writeFileSync(path.join(root, "src/app/icon.png"), b32);

const apple = await sharp(svg, { density: 144 })
  .resize(180, 180, {
    fit: "contain",
    background: BG,
    position: "center",
  })
  .png()
  .toBuffer();
writeFileSync(path.join(root, "src/app/apple-icon.png"), apple);

console.log("Generated src/app/favicon.ico, icon.png, apple-icon.png");
