// src/utils/canvasRenderer.js

import { createCanvas } from 'canvas';

/**
 * canvasRenderer.js
 *
 * Provides functions to render dungeon layouts, character portraits,
 * and other game visuals to PNG buffers or data URLs using node-canvas.
 *
 * Usage:
 *   import { renderDungeonMap } from '../utils/canvasRenderer.js';
 *   const buffer = renderDungeonMap(rooms, corridors, { tileSize: 16 });
 *   // send buffer as image attachment or convert to DataURL: buffer.toString('base64')
 */

/**
 * Renders a top‐down dungeon map.
 *
 * @param {Array<{ x: number, y: number, width: number, height: number }>} rooms
 * @param {Array<{ x: number, y: number, x2: number, y2: number }>} corridors
 * @param {object} [options]
 *   - tileSize: number (pixels per grid unit; default 16)
 *   - margin: number (extra pixels around map; default tileSize)
 *   - roomColor: string (fill color; default '#444')
 *   - corridorColor: string (line color; default '#888')
 *   - bgColor: string (background color; default '#222')
 * @returns {Buffer} PNG image buffer
 */
export function renderDungeonMap(
  rooms,
  corridors,
  {
    tileSize = 16,
    margin = tileSize,
    roomColor = '#444',
    corridorColor = '#888',
    bgColor = '#222'
  } = {}
) {
  // 1️⃣ Determine bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rooms.forEach(r => {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.width);
    maxY = Math.max(maxY, r.y + r.height);
  });
  corridors.forEach(c => {
    minX = Math.min(minX, c.x, c.x2);
    minY = Math.min(minY, c.y, c.y2);
    maxX = Math.max(maxX, c.x, c.x2);
    maxY = Math.max(maxY, c.y, c.y2);
  });

  // 2️⃣ Canvas dimensions
  const width  = (maxX - minX) * tileSize + margin * 2;
  const height = (maxY - minY) * tileSize + margin * 2;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 3️⃣ Fill background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // 4️⃣ Draw corridors
  ctx.strokeStyle = corridorColor;
  ctx.lineWidth = Math.max(2, tileSize / 4);
  corridors.forEach(c => {
    const x1 = (c.x  - minX) * tileSize + margin + tileSize / 2;
    const y1 = (c.y  - minY) * tileSize + margin + tileSize / 2;
    const x2 = (c.x2 - minX) * tileSize + margin + tileSize / 2;
    const y2 = (c.y2 - minY) * tileSize + margin + tileSize / 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  // 5️⃣ Draw rooms
  ctx.fillStyle = roomColor;
  rooms.forEach(r => {
    const x = (r.x   - minX) * tileSize + margin;
    const y = (r.y   - minY) * tileSize + margin;
    const w = r.width  * tileSize;
    const h = r.height * tileSize;
    ctx.fillRect(x, y, w, h);
  });

  // 6️⃣ Optional: draw grid lines (for debugging)
  // ctx.strokeStyle = '#333';
  // ctx.lineWidth = 1;
  // for (let gx = 0; gx <= (maxX-minX); gx++) {
  //   const x = margin + gx * tileSize;
  //   ctx.beginPath();
  //   ctx.moveTo(x, margin);
  //   ctx.lineTo(x, height - margin);
  //   ctx.stroke();
  // }
  // for (let gy = 0; gy <= (maxY-minY); gy++) {
  //   const y = margin + gy * tileSize;
  //   ctx.beginPath();
  //   ctx.moveTo(margin, y);
  //   ctx.lineTo(width - margin, y);
  //   ctx.stroke();
  // }

  return canvas.toBuffer('image/png');
}

/**
 * Renders a circular portrait frame with an image fill.
 *
 * @param {Buffer|Image} imageBuffer  Image data or Canvas Image
 * @param {object} [options]
 *   - size: number (diameter in pixels; default 128)
 *   - borderColor: string (default '#fff')
 *   - borderWidth: number (pixels; default 4)
 * @returns {Buffer} PNG image buffer
 */
export function renderPortrait(imageBuffer, {
  size = 128,
  borderColor = '#fff',
  borderWidth = 4
} = {}) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Load the image
  const img = new Image();
  img.src = imageBuffer;

  // Draw circular clipping path
  const radius = (size - borderWidth * 2) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  // Draw image centered
  const aspect = img.width / img.height;
  let drawW, drawH;
  if (aspect > 1) {
    drawW = radius * 2 * aspect;
    drawH = radius * 2;
  } else {
    drawW = radius * 2;
    drawH = radius * 2 / aspect;
  }
  ctx.drawImage(
    img,
    (size - drawW) / 2,
    (size - drawH) / 2,
    drawW,
    drawH
  );
  ctx.restore();

  // Draw border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.stroke();

  return canvas.toBuffer('image/png');
}