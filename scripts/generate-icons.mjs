import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0284c7" />
      <stop offset="1" stop-color="#14b8a6" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#g)" />
  <path d="M256 388c-6 0-12-2-17-6-42-33-98-79-98-140 0-42 34-72 72-72 24 0 44 11 43 32 -1-21 19-32 43-32 38 0 72 30 72 72 0 61-56 107-98 140-5 4-11 6-17 6z" fill="#ffffff"/>
</svg>
`;

const sizes = [192, 512];

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, `icon-${size}.png`));
  console.log(`generated icon-${size}.png`);
}

await sharp(Buffer.from(svg)).resize(32, 32).png().toFile(path.join(__dirname, "..", "src", "app", "favicon-temp.png"));
console.log("done");
