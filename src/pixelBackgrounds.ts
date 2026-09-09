export const pixelBackgroundPresets = [
  { kind: 'meadow', label: 'Pixel meadow' },
  { kind: 'night', label: 'Pixel night' },
  { kind: 'cherryBlossom', label: 'Cherry blossom garden' },
  { kind: 'temple', label: 'Japanese temple' },
  { kind: 'spaceStation', label: 'Space station' },
  { kind: 'neonCity', label: 'Neon city' },
  { kind: 'aquarium', label: 'Underwater reef' },
  { kind: 'mushroom', label: 'Mushroom forest' },
] as const;

// Only rectangular pixels: usable both by the webview canvas and lightweight rendering checks.
type PixelCanvas = { fillStyle: string; fillRect(x: number, y: number, width: number, height: number): void };
export function drawPixelScene(ctx: PixelCanvas, w: number, h: number, kind: string): boolean {
  const rect = (x: number, y: number, width: number, height: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.max(1, Math.ceil(width)), Math.max(1, Math.ceil(height)));
  };
  const oval = (x: number, y: number, rx: number, ry: number, color: string) => {
    for (let row = -Math.ceil(ry); row <= ry; row++) {
      const span = rx * Math.sqrt(Math.max(0, 1 - (row / ry) ** 2));
      rect(x - span, y + row, span * 2, 1, color);
    }
  };
  const stars = (color: string) => {
    for (let x = 3; x < w; x += 11) rect(x, 4 + (x * 17 % Math.max(1, Math.floor(h * 0.62))), 1, 1, color);
  };
  const ground = h - 6;
  if (kind === 'cherryBlossom' || kind === 'temple') {
    rect(0, 0, w, h, kind === 'temple' ? '#c49cae' : '#b8d7dd');
    oval(w * 0.77, h * 0.25, 7, 7, '#ffe1b3');
    for (let layer = 0; layer < 2; layer++) {
      for (let x = 0; x < w; x++) {
        const ridge = h * (0.62 + layer * 0.13) + Math.sin(x / 16 + layer) * 6;
        rect(x, ridge, 1, h - ridge, ['#939eaf', '#789487'][layer]);
      }
    }
    rect(0, ground - 3, w, 9, '#5d7a64');
    rect(w * 0.32, ground - 1, w * 0.38, 7, '#b6b1a1');
    const tree = (x: number, y: number, scale: number) => {
      rect(x - scale, y - 22 * scale, 3 * scale, 24 * scale, '#634b60');
      for (let i = 0; i < 11; i++) {
        rect(x - i * scale, y - (12 + i) * scale, 2 * scale, 2 * scale, '#634b60');
        rect(x + i * scale, y - (16 + i) * scale, 2 * scale, 2 * scale, '#634b60');
      }
      oval(x - 9 * scale, y - 25 * scale, 12 * scale, 8 * scale, '#c8789f');
      oval(x + 9 * scale, y - 28 * scale, 12 * scale, 9 * scale, '#da8bae');
      oval(x, y - 33 * scale, 16 * scale, 9 * scale, '#f1b1cc');
      oval(x - 5 * scale, y - 35 * scale, 9 * scale, 5 * scale, '#ffd0df');
      for (let i = 0; i < 15; i++) rect(x + ((i * 7) % 29 - 14) * scale, y - (22 + (i * 5) % 17) * scale, scale, scale, '#ffe2e9');
    };
    if (kind === 'cherryBlossom') {
      const scale = Math.min(1.8, w / 55, h / 65);
      tree(w * 0.63, ground, scale);
      tree(w * 0.06, ground - 2, scale * 0.55);
      for (let i = 0; i < w; i += 7) rect(i, ground + (i % 4), 2, 1, '#edb1ce');
      for (let i = 0; i < 10; i++) rect((i * 19 + w * 0.2) % w, ground - 8 - (i * 7 % 30), 1, 1, '#ffd0df');
    } else {
      tree(w * 0.1, ground - 1, Math.min(0.7, w / 90));
      const center = w * 0.64, size = Math.min(50, w * 0.64), tierHeight = Math.min(13, h / 8);
      rect(center - size * 0.44, ground - 2, size * 0.88, 4, '#c5c0b1');
      for (let tier = 0; tier < 3; tier++) {
        const y = ground - 3 - tier * tierHeight, width = size * (1 - tier * 0.2);
        rect(center - width * 0.34, y - tierHeight + 2, width * 0.68, tierHeight - 1, '#a55555');
        for (let x = center - width * 0.25; x < center + width * 0.3; x += 5) rect(x, y - tierHeight + 4, 2, tierHeight - 5, '#efc393');
        for (let row = 0; row < 5; row++) rect(center - width / 2 + row * 2, y - tierHeight + 2 - row, width - row * 4, 1, '#343d53');
        rect(center - width / 2 - 2, y - tierHeight - 1, 3, 2, '#343d53');
        rect(center + width / 2 - 1, y - tierHeight - 1, 3, 2, '#343d53');
      }
      rect(center - 1, ground - 3 * tierHeight - 7, 2, 7, '#e3c69c');
      rect(center - 3, ground - 11, 6, 9, '#473b49');
      for (const x of [w * 0.25, w * 0.9]) {
        rect(x, ground - 12, 1, 12, '#574b56');
        rect(x - 2, ground - 13, 5, 5, '#f2cc92');
        rect(x - 3, ground - 14, 7, 1, '#4c4757');
      }
    }
    return true;
  }
  if (kind === 'spaceStation') {
    rect(0, 0, w, h, '#171e36'); stars('#aac9e0');
    oval(w * 0.7, h * 0.39, Math.min(w * 0.2, 17), Math.min(w * 0.2, 17), '#597d9e');
    oval(w * 0.72, h * 0.36, Math.min(w * 0.13, 11), Math.min(w * 0.13, 11), '#86acb8');
    rect(0, h * 0.72, w, h * 0.28, '#303e50');
    for (const x of [0, w * 0.5, w - 3]) { rect(x, 0, 3, h * 0.74, '#46576a'); rect(x + 1, 0, 1, h * 0.74, '#789399'); }
    rect(0, h * 0.71, w, 2, '#95dbd7');
    for (let x = 6; x < w - 9; x += 24) {
      rect(x, h * 0.79, 17, 9, '#172d3c');
      rect(x + 2, h * 0.79 + 2, 10, 1, '#79d9c0');
      rect(x + 2, h * 0.79 + 5, 5, 1, '#63a7c8');
      rect(x + 13, h * 0.79 + 5, 2, 2, '#efb56e');
    }
    rect(0, ground, w, 6, '#212b3c');
    for (let x = 2; x < w; x += 12) rect(x, ground + 1, 7, 1, '#718e9a');
    return true;
  }
  if (kind === 'neonCity') {
    rect(0, 0, w, h, '#201c38'); stars('#70678c');
    oval(w * 0.73, h * 0.28, 7, 7, '#d483a7');
    for (let layer = 0; layer < 2; layer++) {
      for (let x = -3; x < w; x += 12 + layer * 4) {
        const top = h * 0.5 + ((x + 3) * 7 % 23) + layer * 10;
        rect(x, top, 10 + layer * 3, h - top, layer ? '#2b324a' : '#363750');
        for (let y = top + 3; y < ground - 3; y += 6) {
          rect(x + 2, y, 2, 2, '#bd8aab'); rect(x + 6, y, 2, 2, '#6bafbd');
        }
        if (layer) { rect(x + 9, top + 6, 3, 12, '#ce729d'); rect(x + 10, top + 8, 1, 7, '#ffe1bd'); }
      }
    }
    rect(0, ground - 2, w, 8, '#1d293d');
    for (let x = 4; x < w; x += 16) rect(x, ground + 2, 8, 1, '#729cac');
    return true;
  }
  if (kind === 'aquarium') {
    rect(0, 0, w, h, '#1b526c');
    for (let y = 0; y < h; y += 12) rect(0, y, w, 1, '#245d75');
    for (let i = 0; i < 7; i++) {
      const x = (i * 23 + 8) % w, y = h * 0.3 + (i * 17 % Math.max(1, h * 0.4));
      oval(x, y, 3, 1.5, i % 2 ? '#edb779' : '#96c9c1');
      rect(x - 5, y - 1, 2, 3, '#d88982'); rect(x + 2, y, 1, 1, '#203c54');
    }
    rect(0, ground - 2, w, 8, '#b5ab89');
    for (let x = 3; x < w; x += 13) {
      const height = 8 + x % 14;
      for (let y = 0; y < height; y++) rect(x + Math.sin(y / 3) * 2, ground - y, 2, 1, '#4e9c8a');
    }
    for (const x of [w * 0.2, w * 0.78]) {
      rect(x, ground - 10, 2, 10, '#d68a99'); rect(x - 4, ground - 8, 10, 2, '#d68a99');
      rect(x - 4, ground - 12, 2, 6, '#eca9a4'); rect(x + 4, ground - 14, 2, 8, '#eca9a4');
    }
    return true;
  }
  if (kind === 'mushroom') {
    rect(0, 0, w, h, '#24333c');
    for (let x = 5; x < w; x += 17) { rect(x, 0, 4, h, '#314846'); rect(x - 3, h * 0.2, 3, 2, '#3e5650'); }
    rect(0, ground - 2, w, 8, '#354f48');
    for (const [x, size] of [[w * 0.2, 12], [w * 0.68, 19], [w * 0.91, 8]]) {
      const scale = Math.min(1, w / 75, h / 90), cap = size * scale;
      rect(x - 2, ground - cap * 1.5, 4, cap * 1.5, '#c5c6a8');
      oval(x, ground - cap * 1.5, cap, cap * 0.48, '#a56e9b');
      rect(x - cap, ground - cap * 1.5, cap * 2, 2, '#e4b7c5');
      rect(x - cap * 0.5, ground - cap * 1.75, 3, 2, '#f0d8c6');
      rect(x + cap * 0.25, ground - cap * 1.85, 2, 2, '#f0d8c6');
    }
    for (let i = 0; i < 12; i++) rect((i * 19 + 7) % w, h * 0.48 + (i * 11 % Math.max(1, h * 0.4)), 1, 1, '#b9d89a');
    return true;
  }
  return false;
}
