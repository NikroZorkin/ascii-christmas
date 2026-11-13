'use strict';

// A little winter, rendered one character at a time.
const canvas = document.querySelector('#tree');
const ctx = canvas.getContext('2d');
const TAU = Math.PI * 2;
const GLYPHS = 'xvVWX%&#@o*+';
const GOLD = [245, 215, 122];
const RED = [220, 62, 74];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { time: reducedMotion ? 18 : 0, paused: reducedMotion };
const TIMING = { branches: 1.2, garland: 6.2, ornaments: 8.3,
  gifts: 9.7, lights: 10.5, star: 11.7, message: 13.3 };
const MESSAGE = 'MERRY CHRISTMAS 2026';
function smooth(value) {
  const x = Math.max(0, Math.min(1, value));
  return x * x * (3 - 2 * x);
}
let width = 0, height = 0, dpr = 1, last = 0, frame = 0;
let seed = 2026;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}
const snow = Array.from({ length: 330 }, () => ({
  x: random(), y: random(), depth: .25 + random() * .75,
  speed: .015 + random() * .03, phase: random() * TAU,
}));
const needles = [];
const garland = [];
const lights = [];
const ornaments = [];
// Presents stand around the tree on one ground plane.
const gifts = [
  { width: 52, height: 70, depth: 45, color: RED, ribbon: GOLD },
  { width: 46, height: 66, depth: 43, color: [83, 103, 220], ribbon: GOLD },
  { width: 42, height: 55, depth: 42, color: [212, 161, 62], ribbon: RED },
  { width: 46, height: 62, depth: 42, color: [44, 156, 105], ribbon: GOLD },
  { width: 45, height: 68, depth: 44, color: RED, ribbon: [231, 224, 206] },
].map((gift, index) => {
  const angle = Math.PI / 10 + index * TAU / 5;
  return { ...gift, x: Math.cos(angle) * 232, z: Math.sin(angle) * 232 };
});

function radiusAt(y) {
  const tier = (y * 7) % 1;
  return 8 + y * 205 * (.86 + .14 * tier);
}
function makeTree() {
  for (let row = 0; row < 86; row++) {
    const y = row / 85;
    const radius = radiusAt(y);
    const count = Math.max(12, Math.floor(radius * 1.4));
    for (let j = 0; j < count; j++) {
      const angle = j / count * TAU + random() * .02;
      needles.push({ y: y * 450, radius: radius + Math.sin(angle * 13 + row * .14) * y * 8 + random() * 7,
        angle, glyph: GLYPHS[Math.floor(random() * GLYPHS.length)],
        birth: TIMING.branches + (1 - y) * 4.6 + random() * .28,
        snowy: random() < .018, shade: .6 + random() * .4 });
    }
  }
  for (let i = 0; i < 950; i++) {
    const progress = i / 949;
    const y = .98 - progress * .92;
    const angle = y * TAU * 3.6;
    garland.push({ y: y * 450 + Math.abs(Math.sin(angle * 2.5)) * 8,
      radius: radiusAt(y) + 11, angle,
      birth: TIMING.garland + progress * 2.1 });
  }
  for (let i = 0; i < 170; i++) {
    const y = .06 + i / 170 * .92;
    lights.push({ y: y * 450, radius: radiusAt(y) + 9,
      angle: i * 2.39996, phase: random() * TAU,
      birth: TIMING.lights + random() * 1.1 });
  }
  for (let i = 0; i < 27; i++) {
    const y = .17 + (i / 27) * .78;
    ornaments.push({ y: y * 450, radius: radiusAt(y) + 4,
      angle: i * 2.39996, size: 9 + y * 7,
      birth: TIMING.ornaments + (1 - y) * 1.5,
      color: i % 4 === 0 ? GOLD : RED });
  }
}
makeTree();

function resize() {
  const bounds = canvas.getBoundingClientRect();
  width = bounds.width;
  height = bounds.height;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
new ResizeObserver(resize).observe(canvas);

function renderScene(time) {
  ctx.fillStyle = '#060a0e';
  ctx.fillRect(0, 0, width, height);
  const scale = Math.min(width / 540, (height - 35) / 650);
  const cx = width / 2;
  const top = (height - 650 * scale) / 2 + 48 * scale;
  const rotation = time * Math.PI / 10;
  const cellW = 6.3 * scale, cellH = 9 * scale;
  const pixels = new Map();
  const cos = Math.cos(rotation), sin = Math.sin(rotation);

  // A depth buffer keeps the back of the tree behind the branches.
  function put(x, y, z, glyph, color, glow = 0) {
    const col = Math.round(x / 6.3);
    const row = Math.round(y / 9);
    const key = col + ':' + row;
    if (!pixels.has(key) || pixels.get(key).z <= z) {
      pixels.set(key, { x: col, y: row, z, glyph, color, glow });
    }
  }
  function project(x, y, z) {
    const rx = x * cos + z * sin;
    const rz = z * cos - x * sin;
    return { x: rx, y: y + rz * .21, z: rz };
  }
  function rgb(color, brightness = 1) {
    return `rgb(${color.map(v => Math.round(v * brightness)).join(',')})`;
  }

  // Snow falls at different speeds to give the scene depth.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const flake of snow) {
    const y = ((flake.y + time * flake.speed) % 1) * height;
    const x = ((flake.x + Math.sin(time * .3 + flake.phase) * .018 + 1) % 1) * width;
    ctx.font = `${(7 + flake.depth * 6) * Math.min(1, width / 550)}px monospace`;
    ctx.fillStyle = `rgba(201,216,225,${.15 + flake.depth * .55})`;
    ctx.fillText(flake.depth > .8 ? '+' : flake.depth > .6 ? '*' : '·', x, y);
  }

  // A quiet dotted floor beneath the floating snow.
  ctx.font = `${8 * scale}px monospace`;
  for (let row = 0; row < 22; row++) {
    const y = top + (380 + row * 12) * scale;
    if (y > height) break;
    for (let col = -60; col <= 60; col++) {
      const x = cx + col * 11 * scale;
      const v = Math.sin(col * 127.1 + row * 311.7) * 43758.5453;
      const noise = v - Math.floor(v);
      ctx.fillStyle = `rgba(118,140,169,${.09 + noise * .19})`;
      ctx.fillText(noise > .8 ? '·' : '.', x, y);
    }
  }

  // Branches grow from the bottom upward, with a brief white leading edge.
  for (let y = 435; y < 494; y += 7) {
    if (time < TIMING.branches + (494 - y) * .005) continue;
    for (let x = -13; x < 14; x += 6) put(x, y, -20, '#', '#886b45');
  }
  for (const p of needles) {
    const age = time - p.birth;
    if (age < 0) continue;
    const growth = .92 + .08 * smooth(age / .35);
    const a = p.angle + rotation;
    const radius = p.radius * growth;
    const z = Math.sin(a) * radius;
    const brightness = (.4 + .6 * (Math.sin(a) + 1) / 2) * p.shade;
    const flash = 1 - smooth(age / .4);
    const green = p.snowy ? [165, 191, 177] : [53, 181, 111];
    const color = green.map(v => v * brightness * (1 - flash) + 235 * flash);
    put(Math.cos(a) * radius, p.y + z * .21 + 42, z,
      flash > .35 ? '#' : p.glyph, rgb(color), flash * 5);
  }

  // The golden garland winds upward around the finished branches.
  for (const strand of garland) {
    const age = time - strand.birth;
    if (age < 0) continue;
    const a = strand.angle + rotation;
    const z = Math.sin(a) * strand.radius;
    const flash = 1 - smooth(age / .25);
    put(Math.cos(a) * strand.radius, strand.y + z * .21 + 42, z + 3,
      flash > .2 ? '#' : '~=@'[Math.floor(strand.angle * 9) % 3],
      rgb(GOLD, .65 + .3 * (Math.sin(a) + 1) / 2), 3 + flash * 8);
  }

  // Baubles appear one by one, from the lower branches to the tip.
  for (const ball of ornaments) {
    if (time < ball.birth) continue;
    const size = ball.size * smooth((time - ball.birth) / .35);
    if (size < 1) continue;
    const a = ball.angle + rotation;
    const z = Math.sin(a) * ball.radius;
    const x = Math.cos(a) * ball.radius;
    for (let dy = -size; dy <= size; dy += 6) {
      for (let dx = -size; dx <= size; dx += 5) {
        const distance = (dx * dx + dy * dy) / (size * size);
        if (distance > 1) continue;
        const shade = .55 + .45 * Math.sqrt(1 - distance);
        put(x + dx, ball.y + 42 + z * .21 + dy,
          z + Math.sqrt(1 - distance) * size,
          distance < .3 ? '@' : '%', rgb(ball.color, shade), 2);
      }
    }
  }

  // Each present sits outside the lower branches, on the same floor.
  // Near objects project downward; the tree occludes objects behind it.
  for (const [index, gift] of gifts.entries()) {
    const reveal = smooth((time - TIMING.gifts - index * .25) / .5);
    if (reveal === 0) continue;
    const bottom = 510;
    const top = bottom - gift.height * reveal;
    const halfW = gift.width / 2, halfD = gift.depth / 2;
    for (let face = 0; face < 5; face++) {
      const horizontal = face === 0 || face === 2 || face === 4 ? gift.width : gift.depth;
      const vertical = face === 4 ? gift.depth : gift.height * reveal;
      for (let u = -horizontal / 2; u <= horizontal / 2; u += 4) {
        for (let v = 0; v <= vertical; v += 5) {
          let x, y, z, nx = 0, nz = 0;
          if (face === 4) { x = u; y = top; z = v - halfD; }
          else {
            y = bottom - v;
            if (face === 0) { x = u; z = halfD; nz = 1; }
            if (face === 1) { x = halfW; z = u; nx = 1; }
            if (face === 2) { x = u; z = -halfD; nz = -1; }
            if (face === 3) { x = -halfW; z = u; nx = -1; }
          }
          const normalZ = nz * cos - nx * sin;
          if (face !== 4 && normalZ <= 0) continue;
          const point = project(x + gift.x, y, z + gift.z);
          const ribbon = Math.abs(u) < 4 || (face === 4 && Math.abs(z) < 4);
          const brightness = face === 4 ? .97 : .64 + .25 * normalZ;
          const glyphs = ribbon ? '#=+' : '%#@%';
          const glyphIndex = Math.abs(Math.round(u / 4) + Math.round(v / 5) * 3 + face) % glyphs.length;
          put(point.x, point.y, point.z, glyphs[glyphIndex],
            rgb(ribbon ? gift.ribbon : gift.color, brightness));
        }
      }
    }
  }

  // The small lights switch on after the decorations are in place.
  for (const light of lights) {
    if (time < light.birth) continue;
    const a = light.angle + rotation;
    const z = Math.sin(a) * light.radius;
    const flicker = .65 + .35 * Math.sin(time * 2 + light.phase) ** 2;
    put(Math.cos(a) * light.radius, light.y + z * .21 + 42, z + 4,
      flicker > .83 ? 'o' : '*', rgb(GOLD, flicker), z > 0 ? 7 : 0);
  }

  ctx.font = `${10 * scale}px "SFMono-Regular", Consolas, monospace`;
  for (const p of pixels.values()) {
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.glow * scale;
    ctx.fillText(p.glyph, cx + p.x * cellW, top + p.y * cellH);
  }
  ctx.shadowBlur = 0;

  // The star ignites last, with a white flash that settles into gold.
  if (time >= TIMING.star) {
    const ignition = smooth((time - TIMING.star) / .35);
    const flash = Math.max(0, 1 - (time - TIMING.star) / 1.1) ** 2;
    const starY = top + 19 * scale;
    const pulse = .8 + .2 * Math.sin(time * 2.4);
    const vertices = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = (i % 2 === 0 ? 31 : 13) * ignition;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    function inside(x, y) {
      let hit = false;
      for (let i = 0, j = 9; i < 10; j = i++) {
        const [xi, yi] = vertices[i], [xj, yj] = vertices[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) hit = !hit;
      }
      return hit;
    }
    ctx.fillStyle = rgb(GOLD.map(v => v + (255 - v) * flash), pulse);
    ctx.shadowColor = '#ffe7a0';
    ctx.shadowBlur = (13 + 24 * flash) * scale;
    for (let y = -30; y <= 30; y += 7) {
      for (let x = -30; x <= 30; x += 6) {
        if (inside(x, y)) ctx.fillText('#', cx + x * scale, starY + y * scale);
      }
    }
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(245,215,122,${.08 + pulse * .06})`;
    ctx.lineWidth = .6;
    ctx.beginPath();
    ctx.moveTo(cx, starY - 44 * scale); ctx.lineTo(cx, starY - 90 * scale);
    ctx.moveTo(cx - 48 * scale, starY); ctx.lineTo(cx - 105 * scale, starY);
    ctx.moveTo(cx + 48 * scale, starY); ctx.lineTo(cx + 105 * scale, starY);
    ctx.stroke();
  }

  // The greeting is typed only when the entire tree is complete.
  const shown = Math.min(MESSAGE.length, Math.max(0, Math.floor((time - TIMING.message) * 7)));
  const spacing = 15 * scale;
  ctx.font = `${11 * scale}px monospace`;
  for (let i = 0; i < shown; i++) {
    const color = [RED, GOLD, [92, 185, 123]][Math.floor(i / 2 + time * .6) % 3];
    ctx.fillStyle = rgb(color, .85 + .15 * Math.sin(time * 3 + i));
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 5 * scale;
    ctx.fillText(MESSAGE[i], cx + (i - (MESSAGE.length - 1) / 2) * spacing, top + 590 * scale);
  }
  ctx.shadowBlur = 0;
}

// The editor displays the very functions that draw the scene above.
const source = [
  '// CHRISTMAS 2026 · a winter scene in ASCII',
  '// Every branch, every light, every snowflake is a character.',
  '', 'const TAU = Math.PI * 2;', "const GLYPHS = 'xvVWX%&#@o*+';",
  'const GOLD = [245, 215, 122];', 'const RED = [220, 62, 74];', '',
  'const TIMING = ' + JSON.stringify(TIMING, null, 2) + ';',
  smooth.toString(), '', radiusAt.toString(), '', makeTree.toString(), '', renderScene.toString(),
].join('\n').split('\n');
function highlight(line) {
  const token = /(\/\/.*$|'[^']*'|"[^"]*"|`[^`]*`|\b(?:const|let|function|return|for|of|if|else|new|true|false)\b|\b\d+(?:\.\d+)?\b|\b\w+(?=\())/g;
  const fragment = document.createDocumentFragment();
  let end = 0;
  for (const match of line.matchAll(token)) {
    fragment.append(document.createTextNode(line.slice(end, match.index)));
    const span = document.createElement('span');
    const value = match[0];
    span.className = 'tok-' + (value.startsWith('//') ? 'comment' : /^["'`]/.test(value) ? 'string' : /^\d/.test(value) ? 'number' : /^(const|let|function|return|for|of|if|else|new|true|false)$/.test(value) ? 'keyword' : 'function');
    span.textContent = value;
    fragment.append(span);
    end = match.index + value.length;
  }
  fragment.append(document.createTextNode(line.slice(end)));
  return fragment;
}
const code = document.querySelector('#code');
for (let repeat = 0; repeat < 2; repeat++) {
  source.forEach((line, i) => {
    const row = document.createElement('div');
    row.className = 'code-line';
    const number = document.createElement('span');
    number.className = 'line-number'; number.textContent = i + 1;
    const content = document.createElement('span');
    content.className = 'source-line'; content.append(highlight(line));
    row.append(number, content); code.append(row);
  });
}
function togglePause() { state.paused = !state.paused; }
function restart() {
  state.time = 0; state.paused = false; last = 0;
  renderScene(0); scrollCode(0);
}
let toastTimer;
function toast(message) {
  const el = document.querySelector('#toast'); el.textContent = message;
  el.classList.add('visible'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('visible'), 2200);
}
function capture() {
  const picture = document.createElement('canvas');
  picture.width = canvas.width; picture.height = canvas.height;
  const paint = picture.getContext('2d'); paint.drawImage(canvas, 0, 0);
  const a = document.createElement('a');
  a.download = 'ascii-christmas-2026.png'; a.href = picture.toDataURL('image/png'); a.click();
  toast('Картинка сохранена');
}
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else toast('Полноэкранный режим недоступен в этом браузере');
  } catch { toast('Не удалось включить полноэкранный режим'); }
}
canvas.addEventListener('click', togglePause);
window.addEventListener('keydown', event => {
  if (event.altKey || event.metaKey || event.ctrlKey || event.repeat) return;
  if (event.code === 'Space') { event.preventDefault(); togglePause(); }
  if (event.code === 'KeyR') restart();
  if (event.code === 'KeyS') capture();
  if (event.code === 'KeyF') fullscreen();
});
document.addEventListener('visibilitychange', () => { last = 0; });
// Scroll to the code for the stage currently being drawn.
const codeCues = [
  [0, 'function makeTree()'],
  [TIMING.branches, 'for (let row ='],
  [5.8, '// Branches grow'],
  [TIMING.garland, '// The golden garland'],
  [TIMING.ornaments, '// Baubles appear'],
  [TIMING.gifts, '// Each present'],
  [TIMING.lights, '// The small lights'],
  [TIMING.star, '// The star ignites'],
  [TIMING.message, '// The greeting is typed'],
  [18, 'const shown ='],
].map(([time, marker]) => ({ time, line: Math.max(0, source.findIndex(line => line.includes(marker))) }));
function scrollCode(time) {
  let index = 0;
  while (index < codeCues.length - 2 && time >= codeCues[index + 1].time) index++;
  const from = codeCues[index], to = codeCues[index + 1];
  const progress = smooth((time - from.time) / (to.time - from.time));
  const line = from.line + (to.line - from.line) * progress;
  const lineHeight = code.firstElementChild.getBoundingClientRect().height;
  const drift = Math.max(0, time - 18) * 12;
  const offset = Math.max(0, line * lineHeight + drift - code.parentElement.clientHeight * .25) % (source.length * lineHeight);
  code.style.transform = `translateY(${-offset}px)`;
}
function animate(now) {
  requestAnimationFrame(animate);
  if (now - frame < 1000 / 30) return;
  const delta = last ? Math.min((now - last) / 1000, .1) : 0;
  last = now; frame = now;
  if (!state.paused && !document.hidden) state.time += delta;
  renderScene(state.time);
  scrollCode(state.time);
}
resize(); requestAnimationFrame(animate);
