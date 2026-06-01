/**
 * COGNAPSE Extension Icons Generator
 * Renders the eye logo as SVG and rasterizes to PNG at 16, 48, 128px via sharp.
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = join(__dirname, '..', 'extension');

const SVG_EYE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="rgba(250,204,21,0.5)"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0.95)"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="30%" stop-color="rgba(250,204,21,0.85)"/>
      <stop offset="100%" stop-color="rgba(250,204,21,0)"/>
    </radialGradient>
  </defs>
  <!-- Dark background -->
  <rect width="100" height="100" fill="#000000"/>
  <!-- Dashed orbital ring -->
  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(250,204,21,0.2)" stroke-width="2" stroke-dasharray="6,4"/>
  <!-- Orbit dot -->
  <circle cx="82" cy="18" r="4.5" fill="#FACC15"/>
  <!-- Outer chassis -->
  <circle cx="50" cy="50" r="38" fill="none" stroke="#FACC15" stroke-width="3"/>
  <!-- Iris fill -->
  <circle cx="50" cy="50" r="32" fill="url(#irisGrad)"/>
  <!-- Iris border -->
  <circle cx="50" cy="50" r="32" fill="none" stroke="rgba(250,204,21,0.3)" stroke-width="1.5"/>
  <!-- Central laser glow -->
  <circle cx="50" cy="50" r="16" fill="url(#glow)"/>
  <!-- Pupil slit -->
  <ellipse cx="50" cy="50" rx="3" ry="9" fill="#000000"/>
</svg>`;

const sizes = [16, 48, 128];

async function main() {
  for (const size of sizes) {
    const svgBuffer = Buffer.from(SVG_EYE);
    const pngBuffer = await sharp(svgBuffer)
      .resize(size, size, { kernel: 'lanczos3' })
      .png()
      .toBuffer();

    const outPath = join(EXT_DIR, `icon${size}.png`);
    writeFileSync(outPath, pngBuffer);
    console.log(`Generated ${outPath} (${pngBuffer.length} bytes)`);
  }
  console.log('All icons generated successfully.');
}

main().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
