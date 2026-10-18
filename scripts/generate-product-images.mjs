#!/usr/bin/env node
/**
 * Generates the storefront product images from data/products.json.
 *
 * Every image is an original vector illustration drawn in this file, so the
 * project owns it and there is no licence to track. Output:
 * storefront/public/products/<sku>.webp, 800x800.
 *
 * Usage: node scripts/generate-product-images.mjs
 * Needs sharp (npm install --save-dev sharp).
 *
 * To use a photo for a product instead, remove its entry from ILLUSTRATIONS
 * and drop the .webp in the output folder. The script skips it with a warning.
 */
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CATALOG = path.join(ROOT, 'data', 'products.json');
const OUT_DIR = path.join(ROOT, 'storefront', 'public', 'products');
const SIZE = 800;

const BACKGROUNDS = {
  Audio: ['#FBF4EA', '#EAD9C3'],
  Phones: ['#EEF3FA', '#D2DDED'],
  Laptops: ['#F1F2F4', '#D8DCE2'],
  Wearables: ['#EEF7F1', '#CFE6D8']
};

const ILLUSTRATIONS = {
  'VL-AUD-001': () => headphones({ body: '#2B2F36', accent: '#C8794A' }),
  'VL-AUD-002': () => earbuds({ body: '#3A4350', accent: '#3CC2B4' }),
  'VL-AUD-003': () => speaker({ body: '#2E4A7D', accent: '#E8833A' }),
  'VL-PHN-001': () => phones({ body: '#4F7CC4', screen: ['#7FB2F0', '#2C4F8F'], camera: 'dual' }),
  'VL-PHN-002': () => phones({ body: '#3A3F47', screen: ['#9C8CF2', '#2B2350'], camera: 'triple' }),
  'VL-PHN-003': () => phones({ body: '#E07A5F', screen: ['#F7C59F', '#C4554A'], camera: 'single' }),
  'VL-LAP-001': () => laptop({ body: '#C7CCD3', screen: ['#8EC5FC', '#3B6FB6'], scale: 1 }),
  'VL-LAP-002': () => laptop({ body: '#4A4F57', screen: ['#F59E7A', '#5B2A86'], scale: 1.12 }),
  'VL-LAP-003': () => laptop({ body: '#8EB8E5', screen: ['#B9F3D0', '#2E8C6A'], scale: 0.9 }),
  'VL-WRB-001': () => smartwatch({ body: '#22252A', strap: '#E07A3F' }),
  'VL-WRB-002': () => band({ body: '#8C7AE6', accent: '#7CE0B5' }),
  'VL-WRB-003': () => ring({ body: '#A9AEB6' })
};

// ---------- helpers ----------

/** Lightens (amount > 0) or darkens (amount < 0) a #rrggbb colour. */
function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const mix = (c) => Math.round((target - c) * p + c);
  const r = mix(n >> 16);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/** Small lightning bolt used as the Voltline brand mark. */
function bolt(x, y, scale, color) {
  return `<path transform="translate(${x} ${y}) scale(${scale})" d="M2 -14 L-7 2 L-1 2 L-3 14 L7 -2 L1 -2 Z" fill="${color}"/>`;
}

function shadow(cy, rx) {
  return `<ellipse cx="400" cy="${cy}" rx="${rx}" ry="22" fill="#000" opacity="0.18" filter="url(#soft)"/>`;
}

function frame(background, inner) {
  const [from, to] = background;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 800 800">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </radialGradient>
    <filter id="soft" x="-50%" y="-200%" width="200%" height="500%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  ${inner}
</svg>`;
}

// ---------- Audio ----------

function headphones({ body, accent }) {
  const light = shade(body, 0.25);
  const dark = shade(body, -0.3);
  return `
  <defs>
    <linearGradient id="cup" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient>
  </defs>
  ${shadow(650, 210)}
  <path d="M255 440 C255 160 545 160 545 440" fill="none" stroke="${body}" stroke-width="34" stroke-linecap="round"/>
  <path d="M300 310 C320 228 480 228 500 310" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
  <rect x="244" y="390" width="22" height="70" rx="8" fill="${dark}"/>
  <rect x="534" y="390" width="22" height="70" rx="8" fill="${dark}"/>
  <rect x="195" y="440" width="120" height="190" rx="56" fill="url(#cup)"/>
  <rect x="485" y="440" width="120" height="190" rx="56" fill="url(#cup)"/>
  <rect x="215" y="465" width="80" height="140" rx="38" fill="none" stroke="${accent}" stroke-width="6"/>
  <rect x="505" y="465" width="80" height="140" rx="38" fill="none" stroke="${accent}" stroke-width="6"/>
  ${bolt(255, 535, 1.6, accent)}
  ${bolt(545, 535, 1.6, accent)}`;
}

function earbuds({ body, accent }) {
  const dark = shade(body, -0.35);
  const bud = (cx, cy, flip) => `
  <g transform="translate(${cx} ${cy}) scale(${flip} 1) rotate(-18)">
    <rect x="-16" y="10" width="32" height="120" rx="16" fill="${body}" stroke="${dark}" stroke-width="3"/>
    <circle cx="0" cy="0" r="52" fill="${body}" stroke="${dark}" stroke-width="3"/>
    <ellipse cx="-40" cy="-12" rx="22" ry="27" fill="${shade(body, 0.45)}"/>
    <circle cx="8" cy="-4" r="14" fill="${accent}"/>
  </g>`;
  return `
  <defs>
    <linearGradient id="case" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(body, 0.15)}"/><stop offset="1" stop-color="${shade(body, -0.2)}"/>
    </linearGradient>
  </defs>
  ${shadow(640, 170)}
  <rect x="270" y="420" width="260" height="190" rx="80" fill="url(#case)" stroke="${dark}" stroke-width="3"/>
  <path d="M276 478 H524" stroke="${dark}" stroke-width="3"/>
  <circle cx="400" cy="560" r="7" fill="${accent}"/>
  ${bud(295, 250, 1)}
  ${bud(505, 250, -1)}`;
}

function speaker({ body, accent }) {
  const light = shade(body, 0.2);
  const dark = shade(body, -0.35);
  return `
  <defs>
    <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <pattern id="grille" width="16" height="16" patternUnits="userSpaceOnUse">
      <circle cx="8" cy="8" r="3.4" fill="${dark}"/>
    </pattern>
  </defs>
  ${shadow(600, 240)}
  <path d="M590 395 C700 370 705 520 590 495" fill="none" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>
  <rect x="340" y="318" width="30" height="20" rx="8" fill="${dark}"/>
  <rect x="385" y="318" width="30" height="20" rx="8" fill="${dark}"/>
  <rect x="430" y="318" width="30" height="20" rx="8" fill="${dark}"/>
  <rect x="160" y="330" width="460" height="220" rx="110" fill="url(#spk)"/>
  <rect x="215" y="365" width="350" height="150" rx="75" fill="url(#grille)"/>
  <circle cx="390" cy="440" r="28" fill="${light}"/>
  ${bolt(390, 440, 1.6, accent)}`;
}

// ---------- Phones ----------

function phones({ body, screen, camera }) {
  const dark = shade(body, -0.35);
  const light = shade(body, 0.2);
  const W = 210;
  const H = 430;
  const top = -H / 2;
  const left = -W / 2;

  const lens = (x, y, r = 22) => `
      <circle cx="${x}" cy="${y}" r="${r}" fill="#0D1014" stroke="${shade(body, -0.55)}" stroke-width="5"/>
      <circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 4}" fill="#5B7FB8" opacity="0.7"/>`;
  const flash = (x, y) => `<circle cx="${x}" cy="${y}" r="8" fill="#F3E9C6"/>`;

  const cameras = {
    dual: `
      <rect x="${left + 20}" y="${top + 20}" width="68" height="124" rx="34" fill="${dark}"/>
      ${lens(left + 54, top + 54)}${lens(left + 54, top + 110)}${flash(left + 106, top + 44)}`,
    triple: `
      <rect x="${left + 20}" y="${top + 20}" width="68" height="180" rx="34" fill="${dark}"/>
      ${lens(left + 54, top + 54)}${lens(left + 54, top + 110)}${lens(left + 54, top + 166)}${flash(left + 106, top + 44)}`,
    single: `
      ${lens(left + 50, top + 50, 24)}${flash(left + 50, top + 96)}`
  };

  return `
  <defs>
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${screen[0]}"/><stop offset="1" stop-color="${screen[1]}"/>
    </linearGradient>
    <linearGradient id="back" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${shade(body, -0.12)}"/>
    </linearGradient>
    <clipPath id="screenClip">
      <rect x="${left + 9}" y="${top + 9}" width="${W - 18}" height="${H - 18}" rx="28"/>
    </clipPath>
  </defs>
  ${shadow(655, 230)}
  <g transform="translate(305 405) rotate(-8)">
    <rect x="${left}" y="${top}" width="${W}" height="${H}" rx="36" fill="${dark}"/>
    <g clip-path="url(#screenClip)">
      <rect x="${left}" y="${top}" width="${W}" height="${H}" fill="url(#scr)"/>
      <circle cx="${left + 40}" cy="${top + 300}" r="150" fill="#fff" opacity="0.14"/>
      <circle cx="${left + 190}" cy="${top + 120}" r="90" fill="#fff" opacity="0.12"/>
    </g>
    <circle cx="0" cy="${top + 30}" r="7" fill="#0B0D10"/>
  </g>
  <g transform="translate(492 395) rotate(7)">
    <rect x="${left}" y="${top}" width="${W}" height="${H}" rx="36" fill="url(#back)" stroke="${shade(body, -0.2)}" stroke-width="3"/>
    ${cameras[camera]}
    ${bolt(0, 70, 2.2, shade(body, -0.25))}
  </g>`;
}

// ---------- Laptops ----------

function laptop({ body, screen, scale }) {
  const W = Math.round(460 * scale);
  const H = Math.round(290 * scale);
  const hinge = 540;
  const x = 400 - W / 2;
  const y = hinge - H;
  const baseDark = shade(body, -0.25);
  return `
  <defs>
    <linearGradient id="scr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${screen[0]}"/><stop offset="1" stop-color="${screen[1]}"/>
    </linearGradient>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(body, 0.15)}"/><stop offset="1" stop-color="${body}"/>
    </linearGradient>
    <clipPath id="screenClip">
      <rect x="${x + 22}" y="${y + 22}" width="${W - 44}" height="${H - 34}" rx="4"/>
    </clipPath>
  </defs>
  ${shadow(hinge + 55, W / 2 + 80)}
  <rect x="${x}" y="${y}" width="${W}" height="${H + 6}" rx="18" fill="${shade(body, -0.1)}"/>
  <rect x="${x + 10}" y="${y + 10}" width="${W - 20}" height="${H - 10}" rx="10" fill="#111418"/>
  <g clip-path="url(#screenClip)">
    <rect x="${x}" y="${y}" width="${W}" height="${H}" fill="url(#scr)"/>
    <circle cx="${x + W * 0.25}" cy="${y + H * 0.95}" r="${H * 0.6}" fill="#fff" opacity="0.14"/>
    <circle cx="${x + W * 0.85}" cy="${y + H * 0.15}" r="${H * 0.35}" fill="#fff" opacity="0.12"/>
  </g>
  <circle cx="400" cy="${y + 16}" r="3.5" fill="#2A2F36"/>
  <path d="M${x - 30} ${hinge} H${x + W + 30} L${x + W + 52} ${hinge + 26} H${x - 52} Z" fill="url(#base)"/>
  <rect x="${x - 52}" y="${hinge + 24}" width="${W + 104}" height="8" rx="4" fill="${baseDark}"/>
  <rect x="350" y="${hinge}" width="100" height="8" rx="4" fill="${baseDark}"/>`;
}

// ---------- Wearables ----------

function smartwatch({ body, strap }) {
  const strapDark = shade(strap, -0.3);
  // Analog face at 10:09: twelve ticks and three hands.
  const point = (degrees, length) => {
    const a = (degrees * Math.PI) / 180;
    return [(400 + length * Math.sin(a)).toFixed(1), (400 - length * Math.cos(a)).toFixed(1)];
  };
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const major = i % 3 === 0;
    const [x1, y1] = point(i * 30, major ? 68 : 78);
    const [x2, y2] = point(i * 30, 88);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#E8EAED" stroke-width="${major ? 6 : 3}" stroke-linecap="round"/>`;
  }).join('');
  const hand = (degrees, length, width, color) => {
    const [x, y] = point(degrees, length);
    return `<line x1="400" y1="400" x2="${x}" y2="${y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  };
  const ringSvg = `
    ${ticks}
    ${hand(304.5, 46, 9, '#F4F5F7')}
    ${hand(54, 68, 6, '#F4F5F7')}
    ${hand(200, 74, 3, strap)}
    <circle cx="400" cy="400" r="8" fill="${strap}"/>`;
  return `
  <defs>
    <linearGradient id="case" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${shade(body, 0.3)}"/><stop offset="1" stop-color="${shade(body, -0.2)}"/>
    </linearGradient>
    <linearGradient id="strapTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${strapDark}"/><stop offset="1" stop-color="${strap}"/>
    </linearGradient>
    <linearGradient id="strapBottom" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${strap}"/><stop offset="1" stop-color="${strapDark}"/>
    </linearGradient>
  </defs>
  ${shadow(700, 130)}
  <rect x="335" y="120" width="130" height="210" rx="26" fill="url(#strapTop)"/>
  <rect x="335" y="470" width="130" height="210" rx="26" fill="url(#strapBottom)"/>
  <circle cx="400" cy="570" r="6" fill="${strapDark}"/>
  <circle cx="400" cy="600" r="6" fill="${strapDark}"/>
  <circle cx="400" cy="630" r="6" fill="${strapDark}"/>
  <rect x="512" y="350" width="20" height="58" rx="8" fill="${shade(body, 0.25)}"/>
  <rect x="512" y="425" width="14" height="36" rx="6" fill="${shade(body, 0.15)}"/>
  <rect x="280" y="265" width="240" height="270" rx="64" fill="url(#case)"/>
  <rect x="298" y="283" width="204" height="234" rx="50" fill="#07090C"/>
  ${ringSvg}`;
}

function band({ body, accent }) {
  const dark = shade(body, -0.3);
  const bars = [14, 24, 32, 18, 28]
    .map((h, i) => `<rect x="${356 + i * 18}" y="${532 - h}" width="10" height="${h}" rx="3" fill="${accent}"/>`)
    .join('');
  return `
  ${shadow(600, 210)}
  <ellipse cx="400" cy="390" rx="210" ry="130" fill="none" stroke="${dark}" stroke-width="44"/>
  <path d="M190 390 A210 130 0 0 0 610 390" fill="none" stroke="${body}" stroke-width="44"/>
  <path d="M232 470 A210 130 0 0 0 568 470" fill="none" stroke="${shade(body, 0.25)}" stroke-width="6" opacity="0.6"/>
  <rect x="322" y="486" width="156" height="62" rx="31" fill="#0B0D10" stroke="${dark}" stroke-width="3"/>
  ${bars}`;
}

function ring({ body }) {
  return `
  <defs>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${shade(body, 0.55)}"/>
      <stop offset="0.45" stop-color="${body}"/>
      <stop offset="0.75" stop-color="${shade(body, -0.35)}"/>
      <stop offset="1" stop-color="${shade(body, 0.15)}"/>
    </linearGradient>
  </defs>
  ${shadow(620, 170)}
  <circle cx="400" cy="395" r="165" fill="none" stroke="url(#metal)" stroke-width="58"/>
  <circle cx="400" cy="395" r="136" fill="none" stroke="${shade(body, -0.5)}" stroke-width="4" opacity="0.6"/>
  <circle cx="400" cy="395" r="194" fill="none" stroke="${shade(body, -0.35)}" stroke-width="2" opacity="0.5"/>
  <path d="M245 339 A165 165 0 0 1 317 252" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.5"/>
  <rect x="362" y="522" width="16" height="12" rx="4" fill="#1E2226"/>
  <rect x="392" y="526" width="16" height="12" rx="4" fill="#1E2226"/>
  <rect x="422" y="522" width="16" height="12" rx="4" fill="#1E2226"/>
  <circle cx="400" cy="517" r="4" fill="#5BE38A"/>
  ${bolt(400, 230, 1.4, shade(body, -0.45))}`;
}

// ---------- main ----------

async function main() {
  const products = JSON.parse(await readFile(CATALOG, 'utf8'));
  await mkdir(OUT_DIR, { recursive: true });

  for (const product of products) {
    const draw = ILLUSTRATIONS[product.sku];
    if (!draw) {
      console.warn(`skip ${product.sku}: no illustration, add one or drop a photo in ${OUT_DIR}`);
      continue;
    }
    const background = BACKGROUNDS[product.productLine];
    if (!background) {
      throw new Error(`${product.sku}: unknown product line "${product.productLine}"`);
    }
    const svg = frame(background, draw());
    const file = path.join(OUT_DIR, `${product.sku}.webp`);
    await sharp(Buffer.from(svg)).webp({ quality: 85, effort: 6 }).toFile(file);
    console.log(`wrote ${path.relative(ROOT, file)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
