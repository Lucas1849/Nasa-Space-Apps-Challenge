// Motor de arte 3D em ASCII e retícula Bayer (inspirado no vídeo de referência e na Íris by Tesela).
// Renderiza cenas espaciais 3D (Órbita/Olho, Lua com crateras, Saturno com anéis, Nuvem de asteroides,
// Ampulheta da corrida espacial, Telescópio em tripé e Foguete) em uma grade de caracteres monoespaçados
// com iluminação direcional 3D de alto contraste, sombra projetada no plano inferior e partículas orbitais.
import { el } from './components.js';

const RAMP = ' .,:;-=+*#%@';
const BAYER4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

export const ASCII_SCENES = [
  { id: 'olho', label: 'Órbita', sub: 'sonda e anéis orbitais' },
  { id: 'lua', label: 'Lua', sub: 'crateras e mares lunares' },
  { id: 'saturno', label: 'Saturno', sub: 'sistema de anéis' },
  { id: 'asteroides', label: 'Nuvem', sub: 'aglomerado e detritos' },
  { id: 'ampulheta', label: '1957–69', sub: 'janela da corrida' },
  { id: 'telescopio', label: 'Telescópio', sub: 'rastreio de espaço profundo' },
  { id: 'foguete', label: 'Foguete', sub: 'veículo lançador em rotação' },
];

export function sceneForMission(missionId, stageId = null) {
  if (stageId === 'launch') return 'foguete';
  if (stageId === 'orbit') return 'olho';
  if (stageId === 'transit') return 'asteroides';
  if (!missionId) return 'saturno';
  if (missionId.includes('lunar') || missionId.includes('moon') || missionId === 'apollo' || missionId === 'luna') return 'lua';
  if (missionId.includes('planet') || missionId.includes('outer') || missionId.includes('voyager') || missionId.includes('mariner')) return 'saturno';
  if (missionId.includes('station') || missionId.includes('walk') || missionId.includes('weather')) return 'telescopio';
  if (missionId.includes('living') || missionId.includes('crewed') || missionId.includes('human')) return 'foguete';
  return 'olho';
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

function rotY(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}
function rotX(x, y, z, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x, y * c - z * s, y * s + z * c];
}

// Luz principal vinda do alto à esquerda (igual ao vídeo: topo-esquerda claro, baixo-direita denso)
const LX = -0.62, LY = -0.64, LZ = 0.45;

function shadeNormal(nx, ny, nz, rimBoost = 0.28) {
  const len = Math.hypot(nx, ny, nz) || 1;
  const x = nx / len, y = ny / len, z = nz / len;
  const ndotl = clamp(x * LX + y * LY + z * LZ, -0.3, 1);
  // Curva S de contraste para deixar a luz limpa e a sombra bem marcada como no vídeo
  const diff = clamp((ndotl + 0.18) / 1.12, 0, 1);
  const diffContrast = Math.pow(diff, 1.15);
  const rim = Math.pow(1 - Math.abs(z), 2.6) * rimBoost;
  const ink = clamp(1.02 - diffContrast * 0.94 + rim, 0.04, 0.99);
  return ink;
}

// Sombra projetada no chão (y = 0.64) — anéis concêntricos ou elipse escura
function floorShadow(u, v, rings = true, radius = 0.56) {
  const cy = 0.63;
  const dy = (v - cy) / 0.19;
  const dx = (u - 0.01) / radius;
  const r = Math.hypot(dx, dy);
  if (r > 1.05) return 0;
  if (!rings) {
    // Sombra elíptica densa (Lua, Nuvem, Ampulheta)
    return r < 0.86 ? 0.86 : 0.64;
  }
  // Anéis concêntricos nítidos como no vídeo (00:01, 00:05, 00:10, 00:14)
  if (r < 0.24) return 0.88;
  if (r > 0.36 && r < 0.52) return 0.78;
  if (r > 0.64 && r < 0.80) return 0.82;
  if (r > 0.90 && r <= 1.04) return 0.90;
  return 0.24;
}

// 1. OLHO / SONDA ORBITAL (esfera central + aro toroidal 3D inclinado + anéis concêntricos na base)
function evalOlho(u, v, t) {
  const floor = floorShadow(u, v, true, 0.56);
  const cy = -0.06 + Math.sin(t * 1.5) * 0.02;
  const x = u, y = v - cy;

  // Inclinação 3D do aro externo (gira suavemente como no vídeo em 00:00–00:02 e 00:12–00:16)
  const tiltX = 0.32 + Math.sin(t * 1.1) * 0.22;
  const tiltY = Math.cos(t * 0.85) * 0.38;
  const cY = Math.cos(tiltY), sY = Math.sin(tiltY);
  const cX = Math.cos(tiltX), sX = Math.sin(tiltX);

  // Esfera central (pupila/núcleo da sonda)
  const rCore = 0.24;
  const d2Core = x * x + y * y;
  let coreZ = -99, coreInk = 0;
  if (d2Core < rCore * rCore) {
    coreZ = Math.sqrt(rCore * rCore - d2Core);
    coreInk = shadeNormal(x / rCore, y / rCore, coreZ / rCore, 0.34);
    // Sombra interna na parte superior/direita da esfera e brilho especular
    if (Math.hypot(x + 0.08, y + 0.08) < 0.055) coreInk = 0.10;
    else coreInk = clamp(coreInk + 0.14, 0.12, 0.98);
  }

  // Aro toroidal 3D ao redor da esfera (raio maior R = 0.42, raio do tubo r = 0.14)
  // Projetamos o raio para encontrar a interseção com o toro inclinado
  let torusZ = -99, torusInk = 0;
  const maxR = 0.57;
  if (x * x + y * y < maxR * maxR) {
    const R = 0.41, rTube = 0.145;
    // Busca rápida em z (frente para trás) ao longo do raio
    for (let step = 0; step < 26; step++) {
      const z = 0.45 - step * 0.035;
      // Transforma (x, y, z) para o espaço local do toro
      const x1 = x * cY - z * sY;
      const z1 = x * sY + z * cY;
      const y2 = y * cX - z1 * sX;
      const z2 = y * sX + z1 * cX;
      const qx = Math.hypot(x1, y2) - R;
      const dist = Math.hypot(qx, z2);
      if (dist <= rTube) {
        torusZ = z;
        // Normal no espaço local do toro
        const invR = 1 / (Math.hypot(x1, y2) || 1);
        const lnx = qx * (x1 * invR);
        const lny = qx * (y2 * invR);
        const lnz = z2;
        // Volta normal para o espaço da câmera
        const ny1 = lny * cX + lnz * sX;
        const nz1 = -lny * sX + lnz * cX;
        const nxW = lnx * cY + nz1 * sY;
        const nzW = -lnx * sY + nz1 * cY;
        torusInk = shadeNormal(nxW, ny1, nzW, 0.36);
        // Friso concêntrico fino no aro (igual ao detalhe do vídeo)
        if (Math.abs(qx) < 0.022 && z2 > 0) torusInk = clamp(torusInk + 0.24, 0.2, 0.96);
        break;
      }
    }
  }

  if (coreZ > -10 && coreZ >= torusZ) return coreInk;
  if (torusZ > -10) return torusInk;
  return floor;
}

// 2. LUA COM CRATERAS (esfera 3D com relevo de crateras e sombra elíptica — 00:03 e 00:17 do vídeo)
const CRATERS = [
  [0.35, -0.22, 0.78, 0.24],
  [-0.48, 0.18, 0.72, 0.19],
  [0.12, 0.52, 0.68, 0.22],
  [-0.25, -0.55, 0.62, 0.17],
  [0.68, 0.25, 0.42, 0.25],
  [-0.72, -0.15, 0.48, 0.22],
  [0.15, -0.12, -0.82, 0.26],
  [-0.38, 0.44, -0.65, 0.21],
];
function evalLua(u, v, t) {
  const floor = floorShadow(u, v, false, 0.46);
  const cy = -0.07 + Math.sin(t * 1.3) * 0.02;
  const x = u, y = v - cy;
  const R = 0.48;
  const d2 = x * x + y * y;
  if (d2 >= R * R) return floor;

  const z = Math.sqrt(R * R - d2);
  let nx = x / R, ny = y / R, nz = z / R;
  let [sx, sy, sz] = rotX(nx, ny, nz, 0.22);
  [sx, sy, sz] = rotY(sx, sy, sz, t * 0.7);

  let albedoShift = 0;
  const mare = Math.sin(sx * 2.8 + 0.5) * Math.cos(sy * 2.4 - 0.3) * Math.sin(sz * 2.6);
  if (mare > 0.15) albedoShift += (mare - 0.15) * 0.42;

  for (const [cx, cy2, cz, cr] of CRATERS) {
    const l = Math.hypot(cx, cy2, cz);
    const dx = sx - cx / l, dy = sy - cy2 / l, dz = sz - cz / l;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < cr) {
      const uCr = dist / cr;
      const slope = uCr < 0.76 ? -uCr * 0.65 : (1 - uCr) * 1.65;
      nx += (dx / (dist + 0.001)) * slope;
      ny += (dy / (dist + 0.001)) * slope;
      albedoShift += uCr < 0.72 ? 0.16 : -0.10;
    }
  }
  return clamp(shadeNormal(nx, ny, nz, 0.34) + albedoShift, 0.04, 0.99);
}

// 3. SATURNO COM ANÉIS (planeta + anéis em perspectiva 3D passando na frente e atrás do globo — 00:05 e 00:19 do vídeo)
function evalSaturno(u, v, t) {
  const floor = floorShadow(u, v, true, 0.58);
  const cy = -0.10 + Math.sin(t * 1.4) * 0.025;
  const x = u, y = v - cy;

  // Inclinação lateral do sistema de Saturno (balança suavemente como no vídeo 00:05)
  const roll = -0.32 + Math.sin(t * 0.75) * 0.14;
  const pitchRatio = 2.75 + Math.cos(t * 0.6) * 0.35; // compressão elíptica dos anéis em perspectiva
  const cR = Math.cos(-roll), sR = Math.sin(-roll);
  const rx = x * cR - y * sR;
  const ry = x * sR + y * cR;

  // Esfera central de Saturno
  const R = 0.24;
  const d2 = rx * rx + ry * ry;
  let sphereZ = -99, sphereInk = 0;
  if (d2 < R * R) {
    sphereZ = Math.sqrt(R * R - d2);
    const bands = Math.sin((ry / R) * 14) * 0.08;
    // Sombra projetada pelo anel frontal na faixa equatorial do planeta
    const ringShadowOnGlobe = ry > 0.04 && ry < 0.13 ? 0.20 : 0;
    sphereInk = clamp(shadeNormal(rx / R, ry / R, sphereZ / R, 0.34) + bands + ringShadowOnGlobe, 0.05, 0.98);
  }

  // Plano dos anéis: ry > 0 está na frente do planeta (ringZ > 0), ry < 0 está atrás (ringZ < 0)
  const ringZ = ry * pitchRatio;
  const ringR = Math.hypot(rx, ringZ);

  let ringInk = 0, hasRing = false;
  if (ringR >= 0.34 && ringR <= 0.74) {
    // Divisão de Cassini (fenda escura/vazia entre os anéis interno e externo)
    const cassini = ringR > 0.55 && ringR < 0.595;
    if (!cassini) {
      hasRing = true;
      // Sombra do planeta projetada na parte traseira superior-direita do anel
      const inGlobeShadow = ringZ < 0 && rx > -0.05 && Math.abs(rx) < R * 1.05;
      const ringLight = clamp(0.68 + (rx * -0.22) + (ry * 0.15), 0.38, 0.88);
      ringInk = inGlobeShadow ? 0.95 : (ringR < 0.55 ? clamp(ringLight + 0.10, 0.45, 0.90) : ringLight * 0.82);
    }
  }

  if (sphereZ > -10 && (!hasRing || sphereZ >= ringZ)) return sphereInk;
  if (hasRing) return ringInk;
  return floor;
}

// 4. NUVEM / AGLOMERADO DE ASTEROIDES (00:07 e 00:21 do vídeo)
const LOBES = [
  [0.0, -0.05, 0.09, 0.25],
  [-0.22, 0.04, 0.06, 0.21],
  [0.22, 0.05, 0.05, 0.20],
  [-0.11, -0.18, -0.04, 0.19],
  [0.14, -0.15, -0.05, 0.18],
  [0.02, 0.14, 0.13, 0.19],
  [-0.26, -0.07, -0.08, 0.16],
  [0.26, -0.06, -0.08, 0.16],
];
function evalAsteroides(u, v, t) {
  const floor = floorShadow(u, v, false, 0.46);
  const cy = -0.08 + Math.sin(t * 1.6) * 0.025;
  const x = u, y = v - cy;
  const aY = t * 0.6, aX = Math.sin(t * 0.45) * 0.22;

  let bestZ = -99, bestInk = 0;
  for (let i = 0; i < LOBES.length; i++) {
    const [lx0, ly0, lz0, lr] = LOBES[i];
    let [lx, ly, lz] = rotY(lx0, ly0, lz0, aY);
    [lx, ly, lz] = rotX(lx, ly, lz, aX);
    const dx = x - lx, dy = y - ly;
    const d2 = dx * dx + dy * dy;
    if (d2 < lr * lr) {
      const dz = Math.sqrt(lr * lr - d2);
      const z = lz + dz;
      if (z > bestZ) {
        bestZ = z;
        const ao = dz / lr < 0.36 ? 0.22 : 0;
        bestInk = clamp(shadeNormal(dx / lr, dy / lr, dz / lr, 0.34) + ao, 0.04, 0.98);
      }
    }
  }
  return bestZ > -10 ? bestInk : floor;
}

// 5. AMPULHETA 1957–1969 (00:09 e 00:23 do vídeo)
function evalAmpulheta(u, v, t) {
  const floor = floorShadow(u, v, false, 0.38);
  const cy = -0.06 + Math.sin(t * 1.4) * 0.018;
  const rot = t * 0.7;
  const x = u, y = v - cy;
  const H = 0.39;

  if (Math.abs(y) > H + 0.05) return floor;

  if (Math.abs(Math.abs(y) - H) < 0.042) {
    const capR = 0.28;
    if (Math.abs(x) < capR) {
      const z = Math.sqrt(Math.max(0.001, capR * capR - x * x));
      return clamp(shadeNormal(x / capR, y > 0 ? 0.4 : -0.4, z / capR, 0.38) + 0.15, 0.15, 0.98);
    }
  }

  for (const side of [-1, 1]) {
    const px = side * 0.24 * Math.cos(rot);
    const pz = side * 0.24 * Math.sin(rot);
    if (Math.abs(x - px) < 0.025 && Math.abs(y) < H && pz > -0.05) {
      return pz > 0 ? 0.78 : 0.92;
    }
  }

  const ny = y / H;
  const bulbR = 0.038 + 0.21 * Math.pow(Math.abs(ny), 0.76);
  if (Math.abs(x) < bulbR && Math.abs(y) < H) {
    const z = Math.sqrt(Math.max(0.001, bulbR * bulbR - x * x));
    const nx = x / bulbR, nz = z / bulbR;
    let glassInk = shadeNormal(nx, -Math.sign(ny) * 0.35, nz, 0.45);
    const sandStream = y > 0 && Math.abs(x) < 0.018 && ((Math.floor((y - t * 0.35) * 55) & 1) === 0);
    const bottomPile = ny > 0.34 && Math.abs(x) < bulbR * 0.84 && (ny - Math.abs(x) * 1.1 > 0.36);
    const topSand = ny < -0.24 && ny > -0.78 && Math.abs(x) < bulbR * 0.80;
    if (sandStream || bottomPile || topSand) {
      glassInk = clamp(glassInk + 0.28, 0.42, 0.98);
    }
    return glassInk;
  }

  return floor;
}

// 6. TELESCÓPIO EM TRIPÉ (00:10 e 00:11 do vídeo)
function evalTelescopio(u, v, t) {
  const floor = floorShadow(u, v, true, 0.54);
  const pivotX = 0.0, pivotY = -0.04;

  const tubeAng = -0.54 + Math.sin(t * 0.9) * 0.12;
  const cA = Math.cos(tubeAng), sA = Math.sin(tubeAng);
  const dx = u - pivotX, dy = v - pivotY;
  const along = dx * cA + dy * sA;
  const perp = -dx * sA + dy * cA;

  // Tubo óptico principal robusto (igual ao vídeo 00:10)
  if (along > -0.38 && along < 0.38) {
    const rTube = along < -0.16 ? 0.125 : along > 0.27 ? 0.064 : 0.102;
    if (Math.abs(perp) < rTube) {
      const z = Math.sqrt(Math.max(0.001, rTube * rTube - perp * perp));
      const nPerp = perp / rTube, nz = z / rTube;
      const nx = -nPerp * sA, ny = nPerp * cA;
      let ink = shadeNormal(nx, ny, nz, 0.42);
      if (Math.abs(along + 0.16) < 0.022 || Math.abs(along - 0.05) < 0.020 || Math.abs(along - 0.26) < 0.020) {
        ink = clamp(ink + 0.30, 0.3, 0.98);
      }
      if (along < -0.32) ink = 0.95;
      return ink;
    }
  }

  // Buscadora paralela no topo do tubo
  if (along > -0.10 && along < 0.22 && perp > -0.165 && perp < -0.115) {
    return 0.84;
  }

  // Cabeça equatorial
  if (Math.hypot(dx, dy - 0.05) < 0.082) return 0.88;

  // 3 pernas firmes do tripé até os anéis da base
  const legAngles = [-0.52, 0.03, 0.54];
  const rotAz = Math.sin(t * 0.7) * 0.16;
  for (let i = 0; i < 3; i++) {
    const spread = Math.sin(legAngles[i] * 2.1 + rotAz) * 0.32;
    const endX = pivotX + spread;
    const endY = 0.58;
    const startX = pivotX, startY = pivotY + 0.06;
    if (v >= startY && v <= endY) {
      const frac = (v - startY) / (endY - startY);
      const lx = startX + (endX - startX) * frac;
      const dist = Math.abs(u - lx);
      const thick = 0.024 * (1 - frac * 0.22);
      if (dist < thick) return i === 1 ? 0.92 : 0.80;
    }
  }
  if (Math.abs(v - 0.28) < 0.020 && Math.abs(u - pivotX) < 0.13) return 0.85;

  return floor;
}

// 7. FOGUETE / VEÍCULO ESPACIAL EM ROTAÇÃO
function evalFoguete(u, v, t) {
  const floor = floorShadow(u, v, true, 0.52);
  const cy = -0.06 + Math.sin(t * 2.0) * 0.022;
  const tilt = Math.sin(t * 0.8) * 0.14;
  const cT = Math.cos(tilt), sT = Math.sin(tilt);
  const x = u * cT - (v - cy) * sT;
  const y = u * sT + (v - cy) * cT;

  if (y >= -0.46 && y <= 0.40) {
    let r = 0.13;
    if (y < -0.18) {
      const k = (y + 0.46) / 0.28;
      r = 0.13 * Math.pow(clamp(k, 0, 1), 0.72);
    } else if (y > 0.26) {
      const k = (y - 0.26) / 0.14;
      r = 0.075 + k * 0.065;
    }
    if (Math.abs(x) < r && r > 0.004) {
      const z = Math.sqrt(Math.max(0.001, r * r - x * x));
      let ink = shadeNormal(x / r, y < -0.18 ? -0.35 : 0, z / r, 0.38);
      if (Math.abs(y + 0.18) < 0.022 || Math.abs(y - 0.05) < 0.022 || Math.abs(y - 0.25) < 0.022) {
        ink = clamp(ink + 0.32, 0.3, 0.98);
      }
      const ang = Math.atan2(x, z) + t * 1.4;
      if (y > -0.03 && y < 0.06 && Math.sin(ang * 4) > 0) {
        ink = clamp(ink + 0.34, 0.35, 0.98);
      }
      return ink;
    }
    if (y > 0.08 && y < 0.35) {
      const finSpan = 0.13 + ((y - 0.08) / 0.27) * 0.15;
      if (Math.abs(x) >= 0.12 && Math.abs(x) <= finSpan) {
        return x > 0 ? 0.86 : 0.68;
      }
    }
  }
  return floor;
}

const SCENE_EVAL = {
  olho: evalOlho,
  lua: evalLua,
  saturno: evalSaturno,
  asteroides: evalAsteroides,
  ampulheta: evalAmpulheta,
  telescopio: evalTelescopio,
  foguete: evalFoguete,
};

export function createAsciiCanvas({
  scene = 'olho',
  cycle = false,
  width = 420,
  height = 360,
  cell = 5,
  onSceneChange = null,
} = {}) {
  const canvas = el('canvas', {
    class: 'ascii-canvas',
    width: String(width),
    height: String(height),
    'aria-hidden': 'true',
  });

  if (typeof canvas.getContext !== 'function' || typeof window === 'undefined') {
    return { canvas, setScene: () => {}, setCycle: () => {} };
  }

  const ctx = canvas.getContext('2d');
  let activeScene = scene;
  let autoCycle = cycle;
  let lastSwitch = performance.now();
  let transitionStart = 0;

  // Partículas orbitais 3D (poeira cósmica e estrelas ao redor do objeto, igual ao vídeo)
  const PARTICLES = Array.from({ length: 88 }, (_, i) => ({
    r: 0.44 + hash(i * 3 + 1) * 0.46,
    theta: hash(i * 3 + 2) * Math.PI * 2,
    y: -0.68 + hash(i * 3 + 3) * 1.18,
    speed: (0.16 + hash(i * 5) * 0.34) * (i % 2 ? 1 : -1),
    size: i % 4 === 0 ? 1.35 : 1.0,
  }));

  let dpr = 1;
  let sprite = null;
  let spriteCell = 0;
  let spriteTheme = '';

  function buildSprite(cellPx, isDark) {
    const s = document.createElement('canvas');
    s.width = cellPx * RAMP.length;
    s.height = cellPx;
    const g = s.getContext('2d');
    g.font = `700 ${Math.max(8, Math.round(cellPx * 1.04))}px 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const fg = isDark ? '240, 240, 242' : '18, 19, 22';
    for (let i = 1; i < RAMP.length; i++) {
      const frac = i / (RAMP.length - 1);
      // Nos tons mais escuros, adiciona preenchimento de célula para dar peso de gravura editorial
      if (frac > 0.56) {
        g.fillStyle = `rgba(${fg}, ${(frac - 0.50) * 0.65})`;
        const pad = Math.max(0.4, cellPx * 0.06);
        g.fillRect(i * cellPx + pad, pad, cellPx - pad * 2, cellPx - pad * 2);
      }
      g.fillStyle = `rgba(${fg}, ${clamp(0.62 + frac * 0.38, 0.62, 1)})`;
      g.fillText(RAMP[i], i * cellPx + cellPx / 2, cellPx / 2 + 0.5);
    }
    return s;
  }

  function renderFrame(now) {
    const t = now / 1000;
    if (autoCycle && now - lastSwitch > 4000) {
      const idx = ASCII_SCENES.findIndex((s) => s.id === activeScene);
      const next = ASCII_SCENES[(idx + 1) % ASCII_SCENES.length].id;
      activeScene = next;
      lastSwitch = now;
      transitionStart = now;
      if (onSceneChange) onSceneChange(activeScene);
    }

    dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth || width;
    const ch = canvas.clientHeight || height;
    const targetW = Math.round(cw * dpr);
    const targetH = Math.round(ch * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const isDark = document.documentElement.getAttribute('data-tema') === 'escuro';
    const cellPx = Math.max(4, Math.round(cell * dpr));
    const themeKey = isDark ? 'dark' : 'light';
    if (!sprite || spriteCell !== cellPx || spriteTheme !== themeKey) {
      sprite = buildSprite(cellPx, isDark);
      spriteCell = cellPx;
      spriteTheme = themeKey;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, targetW, targetH);

    const cols = Math.floor(targetW / cellPx);
    const rows = Math.floor(targetH / cellPx);
    const scale = Math.min(cols, rows) * 0.49;
    const cx = cols * 0.5;
    const cy = rows * 0.47;
    const evalFn = SCENE_EVAL[activeScene] || evalOlho;

    const transElapsed = (now - transitionStart) / 420;
    const scatter = transElapsed >= 0 && transElapsed < 1 ? Math.sin(transElapsed * Math.PI) * 0.15 : 0;

    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        let u = (gx - cx) / scale;
        let v = (gy - cy) / scale;
        if (scatter > 0.001) {
          u += (hash(gx * 17 + gy * 31) - 0.5) * scatter;
          v += (hash(gx * 29 + gy * 13) - 0.5) * scatter;
        }
        const ink = evalFn(u, v, t);
        if (ink <= 0.03) continue;

        const bayer = (BAYER4[(gy & 3) * 4 + (gx & 3)] / 16 - 0.5) * 0.24;
        const dithered = clamp(ink + bayer, 0, 0.999);
        const charIdx = Math.floor(dithered * RAMP.length);
        if (charIdx <= 0) continue;

        ctx.drawImage(
          sprite,
          charIdx * cellPx,
          0,
          cellPx,
          cellPx,
          gx * cellPx,
          gy * cellPx,
          cellPx,
          cellPx,
        );
      }
    }

    // Partículas pontilhadas nítidas ao redor do objeto (como os pontinhos pretos voando no vídeo)
    const fg = isDark ? '240, 240, 242' : '18, 19, 22';
    const dotSize = Math.max(2, Math.round(cellPx * 0.44));
    for (let i = 0; i < PARTICLES.length; i++) {
      const p = PARTICLES[i];
      const ang = p.theta + t * p.speed;
      const px = Math.cos(ang) * p.r * (1 + scatter * 1.4);
      const pz = Math.sin(ang) * p.r;
      const py = p.y + Math.sin(t * 0.9 + i) * 0.04;
      const sx = Math.round((cx + px * scale) * cellPx);
      const sy = Math.round((cy + py * scale) * cellPx);
      if (sx < 0 || sx >= targetW || sy < 0 || sy >= targetH) continue;
      const alpha = clamp(0.45 + (pz + 0.8) * 0.42, 0.28, 0.95);
      ctx.fillStyle = `rgba(${fg}, ${alpha})`;
      const s = Math.round(dotSize * p.size);
      ctx.fillRect(sx, sy, s, s);
    }
  }

  let lastFrame = 0;
  const reducedMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // main.js reconstrói a tela inteira a cada ação: o canvas antigo sai do DOM e o laço dele precisa parar,
  // senão cada clique deixa uma animação rodando escondida (o jogo fica lento ao longo da partida).
  const bornAt = performance.now();
  let attached = false;

  function loop(now) {
    if (canvas.isConnected) attached = true;
    else if (attached || now - bornAt > 2000) return; // saiu da tela (ou nunca entrou): encerra o laço
    if (now - lastFrame >= 40 && !document.hidden) {
      lastFrame = now;
      renderFrame(now);
    }
    if (!reducedMotion) {
      requestAnimationFrame(loop);
    }
  }

  renderFrame(performance.now());
  if (!reducedMotion) {
    requestAnimationFrame(loop);
  }

  const setScene = (newScene, manual = false) => {
    if (newScene !== activeScene) {
      activeScene = newScene;
      transitionStart = performance.now();
      lastSwitch = performance.now();
      renderFrame(performance.now());
    }
    if (manual) {
      autoCycle = false;
    }
  };

  const setCycle = (enabled) => {
    autoCycle = enabled;
    lastSwitch = performance.now();
  };

  return { canvas, setScene, setCycle };
}

export function asciiMissionCard({
  missionId = null,
  stageId = null,
  scene = null,
  caption = null,
  height = 200,
} = {}) {
  const chosen = scene || sceneForMission(missionId, stageId);
  const info = ASCII_SCENES.find((s) => s.id === chosen) || ASCII_SCENES[0];
  const { canvas } = createAsciiCanvas({
    scene: chosen,
    cycle: false,
    width: 300,
    height,
    cell: 4.5,
  });
  return el('div', { class: 'ascii-mission-card' }, [
    canvas,
    caption !== false ? el('span', { class: 'ascii-caption' }, caption || info.sub) : null,
  ]);
}
