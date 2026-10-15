import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import '@fontsource/jetbrains-mono/700.css';
import './style.css';
import { MENUS, SCHOOLS } from './data.js';

const CAPTURE = new URLSearchParams(location.search).has('capture');

// ---------- helpers ----------
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(1945);
const matCache = new Map();
function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.92, metalness: o.m ?? 0, flatShading: true, emissive: o.e ?? 0x000000, emissiveIntensity: o.ei ?? 1, transparent: !!o.t, opacity: o.t ?? 1 }));
  return matCache.get(k);
}
const STEEL = () => mat('#C3C9C8', { r: 0.6, m: 0.15 });
function mesh(geo, m, x = 0, y = 0, z = 0, parent) {
  const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
  if (parent) parent.add(me); return me;
}
function box(w, h, d, color, x, y, z, parent, o) { return mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color, o) : color, x, y + h / 2, z, parent); }
function cyl(rt, rb, h, seg, color, x, y, z, parent, o) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg), typeof color === 'string' ? mat(color, o) : color, x, y + h / 2, z, parent); }
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => t * t * (3 - 2 * t);
const fmt = (m) => { m = ((Math.floor(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const nf = (n) => Math.round(n).toLocaleString('en-US');

// ---------- renderer ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: CAPTURE });
renderer.setPixelRatio(CAPTURE ? 1 : Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#2B3350', 160, 420);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 900);
camera.position.set(14, 40, 58);
const controls = new OrbitControls(camera, canvas);
controls.target.set(-2, 0, 2); controls.enableDamping = true; controls.maxPolarAngle = 1.35; controls.minDistance = 8; controls.maxDistance = 260;
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.32, 0.5, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight('#FFF1DC', '#7C6A55', 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight('#FFE2B8', 1.6);
sun.position.set(60, 110, 70); sun.target.position.set(40, 0, 5); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -110, right: 120, top: 80, bottom: -80, near: 10, far: 330 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04; sun.shadow.radius = 4;
scene.add(sun);
const lampLights = [];
for (const x of [-26, -6, 14]) { const p = new THREE.PointLight('#FFC98A', 0, 40, 1.6); p.position.set(x, 8, 5); scene.add(p); lampLights.push(p); }

// ---------- world ----------
const world = new THREE.Group(); scene.add(world);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 700), mat('#A3C28B')); ground.rotation.x = -Math.PI / 2; ground.position.set(50, -0.02, 0); ground.receiveShadow = true; world.add(ground);
function road(x1, z1, x2, z2, w = 6) {
  const len = Math.hypot(x2 - x1, z2 - z1) + w; const g = new THREE.Mesh(new THREE.BoxGeometry(x1 === x2 ? w : len, 0.06, x1 === x2 ? len : w), mat('#8E8579'));
  g.position.set((x1 + x2) / 2, 0.02, (z1 + z2) / 2); g.receiveShadow = true; world.add(g);
  const n = Math.floor(len / 4);
  for (let i = 1; i < n; i++) { const t = i / n; const dsh = new THREE.Mesh(new THREE.BoxGeometry(x1 === x2 ? 0.25 : 1.6, 0.02, x1 === x2 ? 1.6 : 0.25), mat('#EFE3C8')); dsh.position.set(lerp(x1, x2, t) - (x1 === x2 ? 0 : 0), 0.07, lerp(z1, z2, t)); world.add(dsh); }
}
road(-75, 24, 165, 24); road(41, -6, 41, 24); road(-48, 2, -48, 24);
for (const s of SCHOOLS) road(s.x, 24, s.x, s.z > 24 ? s.z - 5 : s.z + 5, 4.5);

// compound fence + yard
box(80, 0.1, 40, '#D9CDB6', -4, 0, 2, world);
// kitchen floor tiles
const tileCv = document.createElement('canvas'); tileCv.width = tileCv.height = 64; const tc = tileCv.getContext('2d');
tc.fillStyle = '#EDE3D0'; tc.fillRect(0, 0, 64, 64); tc.fillStyle = '#E3D6BF'; tc.fillRect(0, 0, 32, 32); tc.fillRect(32, 32, 32, 32);
const tileTex = new THREE.CanvasTexture(tileCv); tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(34, 16); tileTex.magFilter = THREE.NearestFilter; tileTex.colorSpace = THREE.SRGBColorSpace;
const floor = new THREE.Mesh(new THREE.BoxGeometry(68, 0.3, 32), new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.95 })); floor.position.set(-4, 0.15, 0); floor.receiveShadow = true; world.add(floor);
const FY = 0.3; // floor top
// walls (cutaway)
box(68, 6, 0.6, '#E9D6BB', -4, FY, -16, world);
box(68, 1.4, 0.65, '#9FBC97', -4, FY, -16, world);
for (let i = 0; i < 8; i++) box(4.2, 1.8, 0.2, '#BFD6DE', -32 + i * 8, FY + 3, -15.6, world, { e: '#6F8FA0', ei: 0.15 });
box(0.6, 6, 14, '#E9D6BB', -38, FY, -9, world); box(0.6, 6, 6, '#E9D6BB', -38, FY, 13, world);
box(0.65, 1.4, 14, '#9FBC97', -38, FY, -9, world); box(0.65, 1.4, 6, '#9FBC97', -38, FY, 13, world);
box(0.6, 3, 10, '#E9D6BB', 30, FY, -11, world);
// columns + trusses + lamps
const lampMeshes = [];
for (const x of [-30, -18, -6, 6, 18]) {
  for (const z of [-15.4, 15.4]) box(0.32, 9, 0.32, '#D8C9AE', x, FY, z, world);
  box(0.28, 0.35, 31, '#D8C9AE', x, 9.3, 0, world);
  for (const z of [-9, 0, 9]) {
    box(0.05, 1.4, 0.05, '#5B6669', x, 7.9, z, world);
    const shade = mesh(new THREE.ConeGeometry(0.9, 0.7, 8, 1, true), mat('#E9B44C', { r: 0.8 }), x, 7.7, z, world); shade.material.side = THREE.DoubleSide;
    const bulb = mesh(new THREE.SphereGeometry(0.28, 8, 6), mat('#FFF3D6', { e: '#FFD9A0', ei: 2.4 }), x, 7.35, z, world); bulb.castShadow = false; lampMeshes.push(bulb);
  }
}

// ---------- workers ----------
const SKIN = ['#C68B5B', '#A86E45', '#8D5A3B', '#D9A27A', '#B57A4E'];
const SHIRT = ['#5C8F5A', '#D9774B', '#5E7C8A', '#C9973A'];
const workers = [];
function worker(x, z, rotY, role, parent = world) {
  const g = new THREE.Group(); g.position.set(x, FY, z); g.rotation.y = rotY; parent.add(g);
  const shirt = SHIRT[Math.floor(R() * SHIRT.length)];
  const legL = box(0.28, 0.9, 0.3, '#3D4A52', -0.17, 0, 0, g); const legR = box(0.28, 0.9, 0.3, '#3D4A52', 0.17, 0, 0, g);
  const body = mesh(new THREE.CylinderGeometry(0.38, 0.46, 1.1, 7), mat(shirt), 0, 1.45, 0, g);
  box(0.62, 0.95, 0.06, '#F7F2E8', 0, 0.95, 0.42, g);
  const head = mesh(new THREE.IcosahedronGeometry(0.3, 0), mat(SKIN[Math.floor(R() * SKIN.length)]), 0, 2.28, 0, g);
  mesh(new THREE.CylinderGeometry(0.33, 0.31, 0.22, 8), mat('#FAF7F0'), 0, 2.5, 0, g);
  box(0.36, 0.06, 0.18, '#E8E3D8', 0, 2.08, 0.25, g); // mask
  const arms = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(s * 0.5, 1.9, 0); g.add(pivot);
    box(0.2, 0.75, 0.2, shirt, 0, -0.75, 0, pivot); box(0.18, 0.18, 0.18, '#7FB5C9', 0, -0.92, 0, pivot);
    arms.push(pivot);
  }
  const w = { g, arms, legL, legR, role, phase: R() * 6, active: () => true };
  workers.push(w); return w;
}
function animWorker(w, at) {
  const on = w.active();
  const p = at * 6 + w.phase;
  const [a, b] = w.arms;
  if (w.role === 'walk') return;
  if (!on) { a.rotation.set(0.1, 0, 0.08); b.rotation.set(0.1, 0, -0.08); return; }
  if (w.role === 'stir') { a.rotation.set(-1.1 + Math.sin(p) * 0.35, Math.cos(p) * 0.3, 0); b.rotation.set(-0.9, 0, -0.1); }
  else if (w.role === 'chop') { a.rotation.set(-1.0 + Math.abs(Math.sin(p * 1.4)) * 0.5, 0, 0.1); b.rotation.set(-0.8, 0, -0.1); }
  else if (w.role === 'scoop') { const s = Math.sin(p * 0.9); a.rotation.set(-0.9 + s * 0.4, 0, 0.2 + s * 0.2); b.rotation.set(-0.6, 0, -0.1); }
  else if (w.role === 'wash') { a.rotation.set(-0.9, Math.sin(p) * 0.4, 0); b.rotation.set(-0.9, -Math.sin(p) * 0.4, 0); }
  else if (w.role === 'check') { a.rotation.set(-1.2 + Math.sin(p * 0.3) * 0.15, 0, 0); b.rotation.set(-0.2, 0, -0.1); }
}

// ---------- steam / particles ----------
const puffCv = document.createElement('canvas'); puffCv.width = puffCv.height = 64; const pc = puffCv.getContext('2d');
const grd = pc.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,.45)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
pc.fillStyle = grd; pc.fillRect(0, 0, 64, 64);
const puffTex = new THREE.CanvasTexture(puffCv);
const steamSources = [];
const puffs = [];
for (let i = 0; i < 160; i++) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: '#FFFFFF', transparent: true, opacity: 0, depthWrite: false })); s.visible = false; scene.add(s); puffs.push({ s, life: 0, max: 1, v: new THREE.Vector3() });
}
let puffIdx = 0;
function emitPuff(src) {
  const p = puffs[puffIdx++ % puffs.length]; p.life = 0; p.max = 2.2 + R() * 1.4; p.s.visible = true;
  p.s.position.set(src.x + (R() - 0.5) * src.spread, src.y, src.z + (R() - 0.5) * src.spread);
  p.v.set((R() - 0.5) * 0.3, 1.1 + R() * 0.7, (R() - 0.5) * 0.3); p.base = src.size; p.op = src.op;
}

// ---------- stations ----------
const stations = {};
// receiving pallets
const pallet = new THREE.Group(); world.add(pallet);
box(5, 0.3, 4, '#B48A5A', -33, FY, 6, pallet);
const sacks = [];
for (let i = 0; i < 6; i++) sacks.push(box(1.2, 0.7, 0.8, '#E8DCC0', -34.6 + (i % 3) * 1.3, FY + 0.3 + Math.floor(i / 3) * 0.7, 4.8, pallet));
const crateCols = ['#6FA35C', '#F2A541', '#F4F1EA', '#E8C26A', '#DCE6EE'];
const inCrates = [];
for (let i = 0; i < 5; i++) inCrates.push(box(1.1, 0.8, 1.1, crateCols[i], -35 + i * 1.15, FY + 0.3, 7.3, pallet));
// washing sinks
for (const x of [-32, -27.5]) {
  box(4, 2.2, 2, STEEL(), x, FY, -12, world);
  box(3.4, 0.05, 1.5, '#7FB5C9', x, FY + 2.1, -12, world, { e: '#4B8AA8', ei: 0.25 });
  box(0.2, 1.2, 0.2, STEEL(), x, FY + 2.2, -12.9, world); box(0.2, 0.2, 0.8, STEEL(), x, FY + 3.2, -12.6, world);
}
for (let i = 0; i < 8; i++) box(0.45, 0.35, 0.45, ['#6FA35C', '#E86F4F', '#F2A541', '#5E9B46'][i % 4], -33.4 + i * 0.85, FY + 2.15, -11.8 + (i % 2) * 0.4, world);
const wWash1 = worker(-32, -10, Math.PI, 'wash'); const wWash2 = worker(-27.5, -10, Math.PI, 'wash');
// prep tables
for (const x of [-21, -16]) {
  box(4, 1.9, 2.2, STEEL(), x, FY, -12, world); box(1.6, 0.12, 1, '#C99B65', x - 0.6, FY + 1.9, -12, world);
  for (let i = 0; i < 6; i++) mesh(new THREE.IcosahedronGeometry(0.22, 0), mat(['#5E9B46', '#E8893B', '#F4E6C8'][i % 3]), x + 0.6 + (i % 3) * 0.4, FY + 2.05, -12.3 + Math.floor(i / 3) * 0.5, world);
}
const wPrep1 = worker(-21, -10, Math.PI, 'chop'); const wPrep2 = worker(-16, -10, Math.PI, 'chop');
// rice steamer cabinets
const steamers = [];
for (const x of [-9.5, -6, -2.5]) {
  const g = new THREE.Group(); g.position.set(x, FY, -12.3); world.add(g);
  box(3, 3.8, 2, STEEL(), 0, 0, 0, g); box(2.6, 0.06, 0.04, '#8E9696', 0, 1.3, 1.02, g); box(2.6, 0.06, 0.04, '#8E9696', 0, 2.5, 1.02, g);
  box(0.25, 1.4, 0.15, '#5B6669', 1.1, 1.2, 1.05, g);
  const gauge = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 10), mat('#FFF8E8', { e: '#FFE2A8', ei: 0.4 }), -0.9, 3.3, 1.02, g); gauge.rotation.x = Math.PI / 2;
  box(0.4, 0.6, 0.4, STEEL(), 0.8, 3.8, -0.4, g);
  steamers.push(g); steamSources.push({ x, y: FY + 4.4, z: -12.6, spread: 0.6, size: 1.2, op: 0.42, rate: 2.2, on: () => inRange(T.RICE) });
}
const wRice = worker(-6, -9.6, Math.PI, 'check');
// wok line + hood
box(13, 1.4, 4.4, '#E9B44C', -6, 7.2, -3, world, { r: 0.85 }); cyl(0.7, 0.7, 2, 8, '#B8A88E', -6, 8.6, -3.5, world);
const wokFood = []; const flames = [];
for (const x of [-10, -6, -2]) {
  box(3, 1.6, 2.6, '#7A716A', x, FY, -3.2, world); box(3.05, 0.12, 2.65, '#5B5550', x, FY + 1.6, -3.2, world);
  const wok = mesh(new THREE.SphereGeometry(1.0, 10, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#4A4E52', { r: 0.7 }), x, FY + 2.55, -3.3, world); wok.material.side = THREE.DoubleSide;
  const f = mesh(new THREE.CylinderGeometry(0.72, 0.6, 0.14, 9), mat('#B86A2E'), x, FY + 1.95, -3.3, world); wokFood.push(f);
  for (let i = 0; i < 8; i++) { const fl = mesh(new THREE.ConeGeometry(0.2, 0.75, 5), mat('#FFB24A', { e: '#FF8A2A', ei: 2.2 }), x + Math.cos(i * 0.785) * 0.98, FY + 1.68, -3.3 + Math.sin(i * 0.785) * 0.98, world); fl.castShadow = false; flames.push(fl); }
  box(0.12, 0.12, 1.4, '#6B4A2E', x + 0.9, FY + 2.5, -2.1, world);
  steamSources.push({ x, y: FY + 2.8, z: -3.3, spread: 0.8, size: 1.0, op: 0.3, rate: 1.4, on: () => inRange(T.WOK) });
}
const wWok = [worker(-10, -1, Math.PI, 'stir'), worker(-6, -1, Math.PI, 'stir'), worker(-2, -1, Math.PI, 'stir')];
// conveyor
const CONV = { x0: -15, x1: 21, z: 6, y: FY + 1.5 };
box(37, 0.6, 2.2, '#E9B44C', 3, FY + 0.9, CONV.z, world);
const beltCv = document.createElement('canvas'); beltCv.width = 64; beltCv.height = 8; const bc = beltCv.getContext('2d'); bc.fillStyle = '#3E4549'; bc.fillRect(0, 0, 64, 8); bc.fillStyle = '#4C555A'; for (let i = 0; i < 64; i += 8) bc.fillRect(i, 0, 3, 8);
const beltTex = new THREE.CanvasTexture(beltCv); beltTex.wrapS = THREE.RepeatWrapping; beltTex.repeat.set(36, 1); beltTex.magFilter = THREE.NearestFilter; beltTex.colorSpace = THREE.SRGBColorSpace;
const belt = new THREE.Mesh(new THREE.BoxGeometry(36.8, 0.08, 1.8), new THREE.MeshStandardMaterial({ map: beltTex, roughness: 0.95 })); belt.position.set(3, CONV.y - 0.03, CONV.z); belt.receiveShadow = true; world.add(belt);
for (let x = -14; x <= 20; x += 4) { box(0.25, 1.2, 0.25, '#5B6669', x, FY, CONV.z - 0.8, world); box(0.25, 1.2, 0.25, '#5B6669', x, FY, CONV.z + 0.8, world); }
// ompreng stack at start
for (let i = 0; i < 10; i++) box(1.5, 0.1, 1.05, STEEL(), -17, FY + 1.2 + i * 0.12, CONV.z, world);
box(2, 1.2, 1.6, '#5B6669', -17, FY, CONV.z, world);
// fill stations
const FILL = [{ k: 'nasi', x: -9 }, { k: 'lauk', x: -3.5 }, { k: 'sayur', x: 2 }, { k: 'buah', x: 7.5 }, { k: 'milk', x: 11.5 }, { k: 'lid', x: 15 }];
const pans = {};
for (const f of FILL) {
  box(2.6, 1.3, 1.6, STEEL(), f.x, FY, CONV.z - 2.1, world);
  if (f.k !== 'lid' && f.k !== 'milk') { box(2.3, 0.28, 1.3, STEEL(), f.x, FY + 1.3, CONV.z - 2.1, world); pans[f.k] = box(2.05, 0.06, 1.05, '#FFFFFF', f.x, FY + 1.54, CONV.z - 2.1, world); pans[f.k].bumps = []; for (let i = 0; i < 7; i++) pans[f.k].bumps.push(mesh(new THREE.IcosahedronGeometry(0.2 + R() * 0.1, 0), mat('#FFFFFF'), f.x - 0.75 + (i % 4) * 0.5, FY + 1.62, CONV.z - 2.4 + Math.floor(i / 4) * 0.55, world)); }
  if (f.k === 'lid') for (let i = 0; i < 8; i++) box(1.5, 0.08, 1.05, '#D3D8D7', f.x, FY + 1.3 + i * 0.09, CONV.z - 2.1, world, { r: 0.55 });
  if (f.k === 'milk') { pans.milk = new THREE.Group(); world.add(pans.milk); for (let i = 0; i < 9; i++) box(0.32, 0.55, 0.32, '#F4F6F8', f.x - 0.6 + (i % 3) * 0.45, FY + 1.3, CONV.z - 2.5 + Math.floor(i / 3) * 0.4, pans.milk); }
  f.w = worker(f.x, CONV.z - 3.6, 0, 'scoop');
}
steamSources.push({ x: -9, y: FY + 1.6, z: CONV.z - 2.1, spread: 1.2, size: 0.8, op: 0.22, rate: 1.2, on: () => inRange(T.PORTION) });
// QC gate
box(0.25, 3, 0.25, '#5B6669', 18.5, FY, CONV.z - 1.3, world); box(0.25, 3, 0.25, '#5B6669', 18.5, FY, CONV.z + 1.3, world); box(0.4, 0.4, 2.9, '#5B6669', 18.5, FY + 3, CONV.z, world);
const qcLamp = box(0.5, 0.25, 0.5, '#9BE08F', 18.5, FY + 3.4, CONV.z, world, { e: '#5FD46A', ei: 0.4 });
box(2, 1.3, 1.4, STEEL(), 19.5, FY, CONV.z + 2.4, world); box(0.5, 0.05, 0.7, '#F7F2E8', 19.2, FY + 1.3, CONV.z + 2.4, world);
const wQC = worker(19.5, CONV.z + 3.8, Math.PI, 'check');
// crates staging
const crates = [];
for (let i = 0; i < 18; i++) { const c = box(1.7, 0.9, 1.2, i % 2 ? '#D9774B' : '#E9B44C', 24 + (i % 3) * 1.8, FY + Math.floor(i / 9) * 0.92, 1 + Math.floor((i % 9) / 3) * 1.4, world); c.visible = false; crates.push(c); }
const stackTray = []; for (let i = 0; i < 6; i++) { const t = box(1.5, 0.12, 1.05, STEEL(), 23.5, FY + 1.3 + i * 0.16, CONV.z, world); t.visible = false; stackTray.push(t); }
box(2, 1.3, 1.6, '#5B6669', 23.5, FY, CONV.z, world);
const wLoad = worker(26, 7.5, -Math.PI / 2, 'idle');
// van bays
for (const z of [-2, 4, 10]) { box(0.2, 0.04, 5, '#F4EBDD', 33, 0.05, z - 3, world); }
box(0.2, 0.04, 5, '#F4EBDD', 33, 0.05, 13, world);

// ---------- vehicles ----------
function wheel(g, x, z, r = 0.5) { const w = mesh(new THREE.CylinderGeometry(r, r, 0.35, 10), mat('#2E3336'), x, r, z, g); w.rotation.x = Math.PI / 2; return w; }
function makeVan(color) {
  const g = new THREE.Group();
  box(4.4, 2.6, 2.3, '#F7F3EA', -0.7, 0.55, 0, g); box(4.42, 0.4, 2.32, color, -0.7, 1.3, 0, g);
  box(1.7, 1.8, 2.2, '#F7F3EA', 2.35, 0.55, 0, g); box(0.1, 0.8, 1.9, '#4F6E80', 3.22, 1.4, 0, g, { r: 0.5 });
  box(1.2, 0.7, 0.05, '#4F6E80', 2.35, 1.5, 1.1, g, { r: 0.5 }); box(1.2, 0.7, 0.05, '#4F6E80', 2.35, 1.5, -1.1, g, { r: 0.5 });
  box(0.15, 0.2, 0.5, '#FFF2C8', 3.25, 0.8, 0.75, g, { e: '#FFE29A', ei: 1.5 }); box(0.15, 0.2, 0.5, '#FFF2C8', 3.25, 0.8, -0.75, g, { e: '#FFE29A', ei: 1.5 });
  box(0.05, 2.3, 0.04, '#B9B2A4', -2.93, 0.7, 0, g); box(0.06, 0.35, 0.3, '#D7383B', -2.93, 0.9, 0.95, g, { e: '#B32020', ei: 0.6 }); box(0.06, 0.35, 0.3, '#D7383B', -2.93, 0.9, -0.95, g, { e: '#B32020', ei: 0.6 }); box(0.06, 0.4, 2.2, color, -2.93, 1.3, 0, g);
  for (const x of [-2, 2.2]) for (const z of [-1.1, 1.1]) wheel(g, x, z);
  world.add(g); return g;
}
function makeTruck() {
  const g = new THREE.Group();
  box(2.2, 2.4, 2.6, '#6E9C6A', 3.4, 0.6, 0, g); box(0.1, 0.9, 2.2, '#4F6E80', 4.52, 1.8, 0, g, { r: 0.5 });
  box(6, 0.4, 2.7, '#5B6669', -0.8, 0.6, 0, g);
  for (const s of [-1, 1]) box(6, 0.8, 0.1, '#6E9C6A', -0.8, 1.0, s * 1.33, g);
  const load = [];
  for (let i = 0; i < 8; i++) load.push(box(1.2, 0.8, 1.1, crateCols[i % 5], -3.2 + (i % 4) * 1.4, 1.0, (Math.floor(i / 4) - 0.5) * 1.2, g));
  for (const x of [-2.6, 1.0, 3.4]) for (const z of [-1.2, 1.2]) wheel(g, x, z, 0.55);
  world.add(g); return { g, load };
}
function pathCurve(pts) { return new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal'); }
function cornered(pts, r = 3) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]), d2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const r1 = Math.min(r, d1 / 2), r2 = Math.min(r, d2 / 2);
    out.push([b[0] - (b[0] - a[0]) / d1 * r1, b[1] - (b[1] - a[1]) / d1 * r1]);
    out.push([b[0] + (c[0] - b[0]) / d2 * r2, b[1] + (c[1] - b[1]) / d2 * r2]);
  }
  out.push(pts[pts.length - 1]); return out;
}
const VAN_SPEED = 3.6; // units per sim minute
const BAYS = [-2, 4, 10];
const vans = BAYS.map((z, i) => ({ id: i + 1, bay: z, g: makeVan(['#D9774B', '#5C8F5A', '#E9B44C'][i]), state: 'idle', t0: 0, t1: 0, curve: null, school: null, len: 0 }));
function vanPath(v, s) {
  const pts = cornered([[35, v.bay], [41, v.bay], [41, 22.5], [s.x + (s.z > 24 ? 1.5 : -1.5), 22.5], [s.x + (s.z > 24 ? 1.5 : -1.5), s.z > 24 ? s.z - 6 : s.z + 6]]);
  return pathCurve(pts);
}
function placeOnCurve(g, curve, u, reverse = false) {
  u = clamp(u, 0, 1); const p = curve.getPointAt(u); const tg = curve.getTangentAt(u); if (reverse) tg.negate();
  g.position.set(p.x, 0, p.z); g.rotation.y = Math.atan2(-tg.z, tg.x);
}
const truck = makeTruck();
const truckCurve = pathCurve(cornered([[-80, 22.5], [-49.5, 22.5], [-49.5, 6]], 4));

function gable(depth, h, len) {
  const sh = new THREE.Shape(); sh.moveTo(-depth / 2, 0); sh.lineTo(depth / 2, 0); sh.lineTo(0, h); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false }); geo.translate(0, 0, -len / 2); geo.rotateY(Math.PI / 2); return geo;
}
// ---------- schools ----------
const schoolObjs = [];
const labelsEl = document.getElementById('labels');
for (const s of SCHOOLS) {
  const g = new THREE.Group(); g.position.set(s.x, 0, s.z); world.add(g);
  const face = s.z > 24 ? -1 : 1;
  box(26, 0.12, 15, '#CBB892', 0, 0, 0, g);
  box(14, 3.4, 5, '#F2E6D0', 0, 0, -2 * face, g);
  mesh(gable(6.2, 2.2, 15), mat('#C2553A'), 0, 3.5, -2 * face, g);
  for (let i = 0; i < 4; i++) box(1.6, 1.2, 0.1, '#BFD6DE', -4.8 + i * 3.2, 1.4, -2 * face + 2.52 * face, g);
  box(1.4, 2.2, 0.12, '#8A5A3B', 0, 0, -2 * face + 2.55 * face, g);
  cyl(0.08, 0.08, 6, 6, '#E8E3D8', 7.5, 0, 3 * face, g);
  const flag = new THREE.Group(); flag.position.set(8.6, 5.3, 3 * face); g.add(flag);
  box(2, 0.6, 0.05, '#D7383B', 0, 0.6, 0, flag); box(2, 0.6, 0.05, '#FAF7F0', 0, 0, 0, flag);
  for (let i = 0; i < 3; i++) tree(-11 + R() * 3, (R() * 4 - 2) - 3 * face, g);
  const lab = document.createElement('div'); lab.className = 'lab'; lab.innerHTML = `${s.name}<small>${s.portions}</small>`; labelsEl.appendChild(lab);
  schoolObjs.push({ s, g, lab, flag });
}
function tree(x, z, parent = world) {
  const g = new THREE.Group(); g.position.set(x, 0, z); parent.add(g);
  cyl(0.25, 0.35, 1.6, 6, '#8A6A48', 0, 0, 0, g);
  const s = 1 + R() * 0.8;
  const c = mesh(new THREE.IcosahedronGeometry(1.5 * s, 0), mat(R() > 0.5 ? '#6F9E5C' : '#8DB36A'), 0, 1.6 + 1.2 * s, 0, g); c.scale.y = 1.1;
  return g;
}
for (let i = 0; i < 70; i++) {
  const x = -90 + R() * 260, z = -70 + R() * 140;
  if (x > -52 && x < 45 && z > -22 && z < 30) continue;
  if (Math.abs(z - 24) < 6) continue;
  if (SCHOOLS.some((s) => Math.abs(s.x - x) < 15 && Math.abs(s.z - z) < 10)) continue;
  if (SCHOOLS.some((s) => Math.abs(s.x - x) < 5)) continue;
  if (Math.abs(x - 41) < 5 || Math.abs(x + 48) < 5) continue;
  tree(x, z);
}
// generic neighbourhood houses
for (let i = 0; i < 14; i++) {
  const x = -70 + R() * 220, z = R() > 0.5 ? 34 + R() * 25 : -30 - R() * 30;
  if (SCHOOLS.some((s) => Math.abs(s.x - x) < 18 && Math.abs(s.z - z) < 14) || (x > -55 && x < 48 && z > -25 && z < 32)) continue;
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = R() > 0.5 ? 0 : Math.PI / 2; world.add(g);
  box(5, 2.6, 4, ['#EBD9BE', '#E2CDB0', '#F0E2C8'][i % 3], 0, 0, 0, g);
  mesh(gable(4.8, 1.7, 5.8), mat(['#B4583F', '#9A6B4A', '#C9773E'][i % 3]), 0, 2.6, 0, g);
}

// ---------- trays ----------
const TRAY_POOL = [];
const lidMat = mat('#D3D8D7', { r: 0.55 });
function makeTray() {
  const g = new THREE.Group(); world.add(g); g.visible = false;
  box(1.5, 0.1, 1.05, STEEL(), 0, 0, 0, g);
  box(1.5, 0.12, 0.06, STEEL(), 0, 0.1, 0.5, g); box(1.5, 0.12, 0.06, STEEL(), 0, 0.1, -0.5, g); box(0.06, 0.12, 1.05, STEEL(), 0.72, 0.1, 0, g); box(0.06, 0.12, 1.05, STEEL(), -0.72, 0.1, 0, g);
  box(0.05, 0.1, 0.95, STEEL(), -0.05, 0.1, 0, g); box(0.7, 0.1, 0.05, STEEL(), 0.34, 0.1, 0.05, g); box(0.05, 0.1, 0.45, STEEL(), 0.34, 0.1, 0.27, g);
  const parts = {};
  parts.nasi = mesh(new THREE.SphereGeometry(0.33, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), mat('#FAF6EC'), -0.38, 0.1, 0, g); parts.nasi.scale.set(1, 0.6, 1.2);
  parts.lauk = new THREE.Group(); parts.lauk.position.set(0.34, 0.14, -0.22); g.add(parts.lauk);
  parts.sayur = new THREE.Group(); parts.sayur.position.set(0.17, 0.12, 0.27); g.add(parts.sayur);
  parts.buah = new THREE.Group(); parts.buah.position.set(0.53, 0.12, 0.27); g.add(parts.buah);
  parts.milk = box(0.26, 0.42, 0.26, '#F4F6F8', 0.3, 0.3, -0.22, null); g.add(parts.milk); parts.milk.position.set(-0.85, 0.21, -0.38);
  parts.lid = box(1.52, 0.07, 1.07, lidMat, 0, 0.17, 0, g);
  const t = { g, parts, x: 0, done: {}, menu: -1, alive: false };
  TRAY_POOL.push(t); return t;
}
for (let i = 0; i < 22; i++) makeTray();
function buildFood(t, mi) {
  const M = MENUS[mi]; const p = t.parts;
  for (const k of ['lauk', 'sayur', 'buah']) while (p[k].children.length) p[k].remove(p[k].children[0]);
  const L = p.lauk;
  if (M.laukShape === 'drum') { const a = mesh(new THREE.CapsuleGeometry(0.11, 0.25, 2, 6), mat(M.laukColor), -0.05, 0.04, 0, L); a.rotation.z = Math.PI / 2; mesh(new THREE.SphereGeometry(0.15, 6, 4), mat(M.laukColor), 0.14, 0.05, 0, L); }
  else if (M.laukShape === 'egg') { for (const dx of [-0.15, 0.15]) { const e = mesh(new THREE.SphereGeometry(0.15, 7, 5), mat('#FAF4E4'), dx, 0.03, 0, L); e.scale.y = 0.75; mesh(new THREE.SphereGeometry(0.13, 6, 4), mat(M.laukColor), dx, 0.1, 0, L).scale.y = 0.45; } }
  else if (M.laukShape === 'fish') { const f = mesh(new THREE.SphereGeometry(0.2, 7, 5), mat(M.laukColor), -0.04, 0.03, 0, L); f.scale.set(1.4, 0.45, 0.6); const tl = mesh(new THREE.ConeGeometry(0.1, 0.16, 4), mat(M.laukColor), 0.24, 0.03, 0, L); tl.rotation.z = Math.PI / 2; }
  else if (M.laukShape === 'tempe') { box(0.22, 0.1, 0.16, M.laukColor, -0.12, -0.02, 0, L); box(0.18, 0.12, 0.16, M.lauk2Color, 0.14, -0.02, 0, L); }
  else { for (let i = 0; i < 3; i++) mesh(new THREE.IcosahedronGeometry(0.09, 0), mat(M.laukColor), -0.15 + i * 0.14, 0.03, (i % 2) * 0.06 - 0.03, L); }
  for (let i = 0; i < 7; i++) mesh(new THREE.IcosahedronGeometry(0.085, 0), mat(M.vegColors[i % M.vegColors.length]), -0.13 + (i % 4) * 0.085, 0.03 + (i > 3 ? 0.04 : 0), (Math.floor(i / 4) - 0.5) * 0.12, p.sayur);
  const B = p.buah;
  if (M.fruitShape === 'banana') { const b = mesh(new THREE.TorusGeometry(0.15, 0.06, 4, 8, Math.PI * 0.9), mat(M.fruitColor), 0, 0.05, 0, B); b.rotation.x = -Math.PI / 2; }
  else if (M.fruitShape === 'orange') mesh(new THREE.IcosahedronGeometry(0.14, 1), mat(M.fruitColor), 0, 0.08, 0, B);
  else { const w = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.08, 3, 1), mat(M.fruitColor), 0, 0.03, 0, B); box(0.04, 0.08, 0.26, M.rindColor || '#5E9B46', -0.08, -0.01, 0, B); w.rotation.y = Math.PI; }
  t.menu = mi;
}

// ---------- data / state ----------
const T = { RECV: [180, 228], WASH: [192, 275], PREP: [210, 330], RICE: [228, 510], WOK: [240, 515], PORTION: [330, 540], QC: [334, 545], LOAD: [360, 600] };
const TARGET = 3000; const RATE = TARGET / (T.PORTION[1] - T.PORTION[0]);
const inRange = (r) => S.clock >= r[0] && S.clock < r[1];
const S = { clock: 180, speed: 2, menu: 0, dayIdx: 0, trays: 0, nextSpawn: 0, lastPop: 0, crateCount: 0, dispatched: 0, delivered: 0, nextSchool: 0, cam: 'overview', at: 0, rt: 0, events: [], doneAt: null, trayLog: 0 };
const schoolState = SCHOOLS.map(() => ({ status: 'waiting', eta: 0, at: 0, van: null }));
let cum = 0; for (const s of SCHOOLS) { cum += s.portions; s.cum = cum; }
function produced() { return clamp((S.clock - T.PORTION[0]) * RATE, 0, TARGET); }

wWash1.active = wWash2.active = () => inRange(T.WASH);
wPrep1.active = wPrep2.active = () => inRange(T.PREP);
wRice.active = () => inRange(T.RICE);
wWok.forEach((w) => (w.active = () => inRange(T.WOK)));
FILL.forEach((f) => (f.w.active = () => inRange(T.PORTION)));
wQC.active = () => inRange(T.QC);
const porter = worker(-44, 6, 0, 'walk');

// ---------- UI ----------
const $ = (id) => document.getElementById(id);
const popEl = $('popups');
const popups = [];
function popup(text, pos, cls = '') { const el = document.createElement('div'); el.className = 'pop ' + cls; el.textContent = text; popEl.appendChild(el); popups.push({ el, pos: pos.clone(), life: 0 }); }
const track = $('track'); let tickX = 0; const tickItems = [];
function log(msg) {
  const el = document.createElement('span'); el.innerHTML = `<em>${fmt(S.clock)}</em>${msg}`; track.appendChild(el); tickItems.push(el);
  S.events.unshift({ t: S.clock, msg });
}
function updateTicker(dt) {
  tickX -= dt * 70;
  const first = track.firstElementChild;
  if (first && tickX + first.offsetWidth < 0) {
    tickX += first.offsetWidth; track.removeChild(first);
    if (track.children.length < 7) track.appendChild(first);
  }
  const wrapW = track.parentElement.offsetWidth;
  if (track.offsetWidth + tickX < wrapW * 0.6 && track.children.length) { /* keep flowing */ }
  track.style.transform = `translateX(${Math.round(tickX + wrapW * 0.35)}px)`;
}

const STATIONS = [
  ['Receiving dock', 'RECV'], ['Washing station', 'WASH'], ['Vegetable prep', 'PREP'], ['Rice steamers', 'RICE'], ['Wok station', 'WOK'], ['Portioning line', 'PORTION'], ['QC gate', 'QC'], ['Loading dock', 'LOAD'],
];
function renderKitchen() {
  const M = MENUS[S.menu];
  $('tab-kitchen').innerHTML = `<h4>Stations</h4>${STATIONS.map(([n, k]) => { const r = T[k]; const st = S.clock < r[0] ? 'Starts ' + fmt(r[0]) : S.clock < r[1] ? 'Active' : 'Done'; return `<div class="st ${st === 'Active' ? 'active' : st === 'Done' ? 'done' : ''}"><span class="dot"></span>${n}<span class="s">${st}</span></div>`; }).join('')}
  <div class="card"><h4>On every tray today</h4><div class="nut">
  <div class="chip c-carb"><i>Carbs</i>${M.carb}</div><div class="chip c-pro"><i>Protein</i>${M.protein}</div>
  <div class="chip c-veg"><i>Vegetables</i>${M.veg}</div><div class="chip c-fruit"><i>Fruit</i>${M.fruit}</div>
  ${M.milk ? `<div class="chip c-milk"><i>Extra</i>Milk carton</div>` : ''}</div></div>`;
}
function renderMenu() {
  $('tab-menu').innerHTML = `<h4>Daily menu, tap a day</h4>${MENUS.map((m, i) => `<button class="menu-item ${i === S.menu ? 'on' : ''}" data-menu="${i}"><span class="sw" style="background:${m.swatch}"></span><div><b>${m.day}, ${m.name}</b><span>${m.protein} with ${m.veg.toLowerCase()}, ${m.fruit.toLowerCase()}${m.milk ? ', milk' : ''}</span></div></button>`).join('')}
  <div class="card" style="font-size:12.5px;color:#5B6669;font-weight:700;line-height:1.45">New menus apply to the next trays on the line, so you can watch the lauk change at the wok and the fill station.</div>`;
  $('tab-menu').querySelectorAll('[data-menu]').forEach((b) => b.onclick = () => setMenu(+b.dataset.menu));
}
function vanStatus(v) { if (v.state === 'idle') return 'At bay'; if (v.state === 'loading') return 'Loading'; if (v.state === 'out') return 'To ' + v.school.short; if (v.state === 'unload') return 'At ' + v.school.short; return 'Returning'; }
function renderDeliveries() {
  $('tab-deliveries').innerHTML = `<h4>Schools served</h4>${SCHOOLS.map((s, i) => { const st = schoolState[i]; let pill = '<span class="pill">Waiting</span>', meta = 'ETA ~' + fmt(st.eta);
    if (st.status === 'loading') { pill = '<span class="pill load">Loading</span>'; meta = 'ETA ' + fmt(st.eta); }
    if (st.status === 'road') { pill = '<span class="pill road">On the road</span>'; meta = 'ETA ' + fmt(st.eta); }
    if (st.status === 'done') { pill = '<span class="pill ok">Delivered</span>'; meta = 'Arrived ' + fmt(st.at); }
    return `<div class="sch"><div class="row"><span>${s.name}</span>${pill}</div><div class="meta"><span>${s.portions} trays, ${s.dist}</span><span>${meta}</span></div></div>`; }).join('')}
  <div class="card"><h4>Box vans</h4>${vans.map((v) => `<div class="van"><span>Van ${v.id}</span><span>${vanStatus(v)}</span></div>`).join('')}</div>`;
}
let uiTimer = 0;
function renderTabs() { renderKitchen(); renderDeliveries(); }
document.querySelectorAll('.tabs button').forEach((b) => b.onclick = () => setTab(b.dataset.tab));
function setTab(t) { document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t)); document.querySelectorAll('.tab').forEach((s) => s.classList.toggle('on', s.id === 'tab-' + t)); }
document.querySelectorAll('[data-cam]').forEach((b) => b.onclick = () => setCam(b.dataset.cam));
document.querySelectorAll('[data-speed]').forEach((b) => b.onclick = () => setSpeed(+b.dataset.speed));
function setSpeed(s) { S.speed = s; document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', +b.dataset.speed === s)); }
const CAM_NAMES = { overview: 'Overview', map: 'Top map', tray: 'Follow tray', van: 'Follow van', action: 'Action cam' };
function setCam(c) { S.cam = c; S.camBlend = 0; S.shot = 0; S.shotT = 0; S.followTray = null; S.followVan = null; document.querySelectorAll('[data-cam]').forEach((b) => b.classList.toggle('on', b.dataset.cam === c)); controls.enabled = c === 'overview'; if (c === 'overview') { S.ovFrom = camera.position.clone(); S.ovTo = new THREE.Vector3(14, 40, 58); } }
function setMenu(i) {
  if (i === S.menu) return; S.menu = i; renderMenu(); renderKitchen(); applyMenuStations();
  $('dayname').textContent = MENUS[i].day + ' menu';
  log(`Menu switched to ${MENUS[i].name}, the next trays get ${MENUS[i].protein.toLowerCase()}`);
  popup(MENUS[i].name + ' on the wok', new THREE.Vector3(-6, 5.2, -3), 'gold');
}
function applyMenuStations() {
  const M = MENUS[S.menu];
  const pc = { nasi: ['#FAF6EC'], lauk: [M.laukColor, M.lauk2Color || M.laukColor], sayur: M.vegColors, buah: [M.fruitColor] }; for (const k in pc) { pans[k].material = mat(pc[k][0]); pans[k].bumps.forEach((b, i) => (b.material = mat(pc[k][i % pc[k].length]))); }
  wokFood.forEach((f) => (f.material = mat(M.laukColor))); pans.milk.visible = !!M.milk;
}
addEventListener('keydown', (e) => { const k = e.key; if (k === ' ') { setSpeed(S.speed ? 0 : 2); e.preventDefault(); } const cams = ['overview', 'map', 'tray', 'van', 'action']; if (k >= '1' && k <= '5') setCam(cams[+k - 1]); });

// ---------- day reset ----------
function resetDay(menuIdx) {
  S.clock = 180; S.trays = 0; S.nextSpawn = 0; S.lastPop = 0; S.crateCount = 0; S.dispatched = 0; S.delivered = 0; S.nextSchool = 0; S.doneAt = null; S.trayLog = 0; S.flags = {};
  S.menu = menuIdx; applyMenuStations(); renderMenu(); $('dayname').textContent = MENUS[menuIdx].day + ' menu';
  schoolState.forEach((st, i) => { st.status = 'waiting'; st.van = null; st.eta = T.PORTION[0] + SCHOOLS[i].cum / RATE + 6 + travelMin(vans[0], SCHOOLS[i]); });
  vans.forEach((v) => { v.state = 'idle'; placeVanIdle(v); });
  TRAY_POOL.forEach((t) => { t.alive = false; t.g.visible = false; });
  $('banner').style.display = 'none';
  log(`New day, ${MENUS[menuIdx].day} menu is ${MENUS[menuIdx].name}, supplier truck on the way`);
}
function travelMin(v, s) { return vanPath(v, s).getLength() / VAN_SPEED; }
function placeVanIdle(v) { v.g.position.set(35, 0, v.bay); v.g.rotation.y = Math.PI; }

const FILLERS = [
  [T.WASH, 'Vegetables rinsed in running water before cutting'],
  [T.PREP, 'Separate boards for raw and cooked food at prep'],
  [T.PREP, 'Hairnet, mask and glove check done on the prep line'],
  [T.RICE, 'Rice batch out of the steamer, next batch loaded'],
  [T.WOK, 'Fresh batch from the wok station'],
  [T.PORTION, 'Ompreng rinsed and dried for the next run'],
  [T.QC, 'Temperature check passed at the QC gate'],
  [T.QC, 'Sample tray set aside for checking'],
  [T.PORTION, 'Hand washing round for the portioning team'],
  [T.WASH, 'Wash station water changed'],
];

// ---------- sim step ----------
const tmpV = new THREE.Vector3();
function simStep(dtReal) {
  const sdt = dtReal * S.speed; // sim minutes
  S.rt += dtReal; S.at += sdt;
  if (sdt > 0) {
    const prev = S.clock; S.clock += sdt; const c = S.clock;
    const crossed = (m) => prev < m && c >= m;
    if (crossed(181)) log('Supplier truck arriving with rice, eggs, chicken, vegetables, fruit and milk');
    if (crossed(192)) log('Washing station open, produce goes in first');
    if (crossed(210)) log('Vegetable prep started, cutting for ' + MENUS[S.menu].veg.toLowerCase());
    if (crossed(228)) { log('Rice steamers on'); popup('Steamers on', new THREE.Vector3(-6, 6, -12), 'gold'); }
    if (crossed(240)) log('Wok station cooking ' + MENUS[S.menu].protein.toLowerCase());
    if (crossed(T.PORTION[0])) { log('Portioning line running, ompreng start moving'); popup('Line started', new THREE.Vector3(-12, 4, 6), 'terra'); }
    for (let i = 0; i < FILLERS.length; i++) { const [r, msg] = FILLERS[i]; const m = r[0] + 14 + i * 9; if (crossed(m) && m < r[1]) log(msg); }
    // trays
    while (inRange(T.PORTION) && S.at >= S.nextSpawn) {
      S.nextSpawn = S.at + 1.15; const t = TRAY_POOL.find((q) => !q.alive);
      if (t) { t.alive = true; t.g.visible = true; t.x = CONV.x0 + 0.5; t.done = {}; buildFood(t, S.menu); for (const k of ['nasi', 'lauk', 'sayur', 'buah', 'milk', 'lid']) { t.parts[k].visible = false; t.parts[k].scale.setScalar ? null : null; } }
    }
    if (S.nextSpawn < S.at - 5) S.nextSpawn = S.at;
    // vans dispatch
    const made = produced();
    if (S.nextSchool < SCHOOLS.length && made - S.dispatched >= SCHOOLS[S.nextSchool].portions - 0.5) {
      const v = vans.find((q) => q.state === 'idle');
      if (v) {
        const s = SCHOOLS[S.nextSchool]; const st = schoolState[S.nextSchool];
        v.state = 'loading'; v.t0 = c; v.school = s; v.si = S.nextSchool; v.curve = vanPath(v, s); v.len = v.curve.getLength();
        st.status = 'loading'; st.van = v; st.eta = c + 6 + v.len / VAN_SPEED;
        S.dispatched += s.portions; S.nextSchool++;
        log(`Van ${v.id} loading ${s.portions} trays for ${s.name}`);
      }
    }
    for (const v of vans) {
      const st = schoolState[v.si];
      if (v.state === 'loading' && c >= v.t0 + 6) { v.state = 'out'; v.t0 = c; st.status = 'road'; popup(`Van ${v.id} out, ${v.school.portions} trays`, new THREE.Vector3(36, 5, v.bay), 'terra'); log(`Van ${v.id} left for ${v.school.name}, ETA ${fmt(st.eta)}`); }
      if (v.state === 'out') { const u = (c - v.t0) * VAN_SPEED / v.len; placeOnCurve(v.g, v.curve, u); if (u >= 1) { v.state = 'unload'; v.t0 = c; st.status = 'done'; st.at = c; S.delivered += v.school.portions; popup(`Delivered ${v.school.portions}`, new THREE.Vector3(v.school.x, 8, v.school.z), 'green'); log(`${v.school.name} received ${v.school.portions} trays, ready before lunch`); } }
      if (v.state === 'unload' && c >= v.t0 + 9) { v.state = 'back'; v.t0 = c; }
      if (v.state === 'back') { const u = 1 - (c - v.t0) * VAN_SPEED / v.len; placeOnCurve(v.g, v.curve, u, true); if (u <= 0) { v.state = 'idle'; placeVanIdle(v); log(`Van ${v.id} back at the bay`); } }
    }
    for (let i = S.nextSchool; i < SCHOOLS.length; i++) schoolState[i].eta = Math.max(c, T.PORTION[0] + SCHOOLS[i].cum / RATE) + 6 + travelMin(vans[0], SCHOOLS[i]);
    if (S.delivered >= TARGET && !S.doneAt && vans.every((v) => v.state === 'idle' || v.state === 'back')) {
      S.doneAt = c; log('All schools served, kitchen cleanup starts'); $('banner').innerHTML = `Day complete<small>${nf(TARGET)} trays reached ${SCHOOLS.length} schools before lunch</small>`; $('banner').style.display = 'block';
    }
    if (S.doneAt && c > Math.max(S.doneAt + 40, 735)) resetDay((S.menu + 1) % MENUS.length);
  }
  // trays move
  const at = S.at;
  for (const t of TRAY_POOL) {
    if (!t.alive) continue;
    t.x += sdt * 2.3;
    for (const f of FILL) {
      if (!t.done[f.k] && t.x >= f.x) { t.done[f.k] = S.at; if (f.k !== 'milk' || MENUS[t.menu].milk) t.parts[f.k].visible = true; }
      if (t.done[f.k] !== undefined) { const k = clamp((S.at - t.done[f.k]) / 0.25, 0, 1); const s = k < 1 ? 0.3 + 0.9 * Math.sin(k * Math.PI * 0.75) / Math.sin(Math.PI * 0.75) : 1; if (f.k === 'nasi') t.parts.nasi.scale.set(s, 0.6 * s, 1.2 * s); else if (f.k !== 'lid') t.parts[f.k].scale.setScalar(s); else t.parts.lid.position.y = 0.17 + (1 - k) * 0.8; }
    }
    if (t.x >= 18.5 && !t.qc) { t.qc = true; S.qcFlash = S.at; }
    if (t.x >= CONV.x1 + 2) {
      t.alive = false; t.g.visible = false; t.qc = false; S.trays++;
      if (S.trays % 6 === 0) { const now = Math.round(produced()); const d = now - S.lastPop; S.lastPop = now; if (d > 0) popup(`+${d} trays`, new THREE.Vector3(25, 4.6, 4), 'gold'); }
      continue;
    }
    t.g.position.set(t.x, CONV.y, CONV.z);
  }
  qcLamp.material = mat('#9BE08F', { e: '#5FD46A', ei: S.qcFlash && S.at - S.qcFlash < 0.35 ? 3 : 0.4 });
  // stack trays + crates
  const n = S.trays % 6; stackTray.forEach((s, i) => (s.visible = i < n && inRange(T.PORTION)));
  const crateN = clamp(Math.round((produced() - S.dispatched) / 95), 0, crates.length); crates.forEach((c, i) => (c.visible = i < crateN));
  // belt
  if (inRange(T.PORTION)) beltTex.offset.x -= sdt * 2.3 / (36.8 / 36);
  // truck
  const tc = S.clock;
  if (tc < 186) placeOnCurve(truck.g, truckCurve, (tc - 180) / 6);
  else if (tc < 226) placeOnCurve(truck.g, truckCurve, 1);
  else if (tc < 234) placeOnCurve(truck.g, truckCurve, 1 - (tc - 226) / 8, true);
  else truck.g.position.set(-200, 0, 0);
  const unloadK = clamp((tc - 186) / 38, 0, 1);
  truck.load.forEach((b, i) => (b.visible = i >= Math.floor(unloadK * 8)));
  inCrates.forEach((b, i) => (b.visible = tc < 186 ? false : tc < 290 ? i < Math.ceil(unloadK * 5) : i < 2));
  sacks.forEach((b, i) => (b.visible = tc >= 186 && (tc < 330 || i < 3)));
  // porter
  if (tc >= 186 && tc < 226) {
    const cyc = ((tc - 186) % 5) / 5; const fw = cyc < 0.5; const k = smooth(fw ? cyc * 2 : (cyc - 0.5) * 2);
    const x = fw ? lerp(-47, -36.5, k) : lerp(-36.5, -47, k); porter.g.position.set(x, x < -38 ? 0 : FY, 5.5); porter.g.rotation.y = fw ? Math.PI / 2 : -Math.PI / 2;
    const sw = Math.sin(at * 14); porter.legL.rotation.x = sw * 0.5; porter.legR.rotation.x = -sw * 0.5; porter.arms.forEach((a) => a.rotation.set(fw ? -1.2 : sw * 0.4, 0, 0));
  } else { porter.g.position.set(-35.5, FY, 9.5); porter.g.rotation.y = -0.4; porter.legL.rotation.x = porter.legR.rotation.x = 0; porter.arms.forEach((a) => a.rotation.set(0.1, 0, 0)); }
  workers.forEach((w) => animWorker(w, at));
  // flames
  const wokOn = inRange(T.WOK);
  flames.forEach((f, i) => { f.visible = wokOn; const s = 0.7 + 0.4 * Math.abs(Math.sin(at * 9 + i * 1.7)); f.scale.set(1, s, 1); });
  wokFood.forEach((f, i) => { f.visible = wokOn; f.position.y = FY + 1.95 + Math.abs(Math.sin(at * 5 + i)) * 0.18; f.rotation.y = at * 2 + i; });
  // steam
  for (const src of steamSources) { if (!src.on()) continue; src.acc = (src.acc || 0) + sdt * src.rate * 1.4; while (src.acc > 1) { src.acc -= 1; emitPuff(src); } }
  for (const p of puffs) {
    if (!p.s.visible) continue; p.life += sdt * 0.7; const k = p.life / p.max;
    if (k >= 1) { p.s.visible = false; continue; }
    p.s.position.addScaledVector(p.v, sdt * 0.7); const sc = p.base * (0.6 + k * 1.8); p.s.scale.set(sc, sc, 1); p.s.material.opacity = p.op * Math.sin(k * Math.PI);
  }
  // flags
  schoolObjs.forEach((o, i) => { o.flag.rotation.y = Math.sin(at * 1.5 + i) * 0.25; });
}

// ---------- time of day ----------
const SKY = [[180, '#2B3350', 0.12, '#8EA0D8', 0.45], [290, '#4A4C78', 0.35, '#A3A6D8', 0.62], [325, '#D9957E', 0.95, '#FFC59A', 0.8], [345, '#ECB089', 1.25, '#FFCFA3', 0.88], [390, '#F2D6AE', 1.5, '#FFE2B8', 0.95], [450, '#EFE3CC', 1.75, '#FFF0D8', 1.0], [720, '#EFE3CC', 1.8, '#FFF0D8', 1.0]];
const cA = new THREE.Color(), cB = new THREE.Color();
function applySky() {
  const m = S.clock; let i = 0; while (i < SKY.length - 2 && m > SKY[i + 1][0]) i++;
  const a = SKY[i], b = SKY[i + 1]; const k = clamp((m - a[0]) / (b[0] - a[0]), 0, 1);
  cA.set(a[1]).lerp(cB.set(b[1]), k); scene.background = cA.clone(); scene.fog.color.copy(cA);
  sun.intensity = lerp(a[2], b[2], k); sun.color.set(a[3]).lerp(cB.set(b[3]), k); hemi.intensity = lerp(a[4], b[4], k);
  const night = clamp(1 - (sun.intensity - 0.12) / 1.2, 0, 1);
  lampLights.forEach((l) => (l.intensity = 28 * night + 4));
  lampMeshes.forEach((b) => (b.material.emissiveIntensity = 0.8 + 2.4 * night));
  renderer.toneMappingExposure = 1.0 + night * 0.25;
  document.body.style.background = '#' + cA.getHexString();
}

// ---------- camera ----------
const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3();
const ACTION = [
  { p: [-1.5, 4.2, 3.5], t: [-6, 2.2, -3.2], d: [-3, 0, 0] },
  { p: [-6, 4.4, 7.5], t: [-2, 1.6, 6], d: [3, 0, 0] },
  { p: [-4, 5.2, -5.8], t: [-6.5, 3, -12.3], d: [-3, 0, 0] },
  { p: [14, 3.2, 10.5], t: [19, 1.8, 6], d: [-1.5, 0, 0] },
  { p: [26, 5, 18], t: [35, 1.3, 4], d: [2, 0, -1] },
  { p: [-24, 4.5, -5], t: [-30, 1.8, -12], d: [2, 0, 0] },
];
function chooseVan() { if (S.followVan && S.followVan.state !== 'idle') return S.followVan; const v = vans.find((q) => q.state === 'loading') || vans.find((q) => q.state === 'out') || vans.find((q) => q.state === 'unload') || vans.find((q) => q.state === 'back'); S.followVan = v || null; return v || vans[0]; }
function updateCamera(dt) {
  S.camBlend = Math.min(1, (S.camBlend ?? 1) + dt * 1.6);
  const b = smooth(S.camBlend);
  if (S.cam === 'overview') {
    if (S.camBlend < 1 && S.ovFrom) { camera.position.lerpVectors(S.ovFrom, S.ovTo, b); controls.target.lerp(new THREE.Vector3(-2, 0, 2), b); }
    else if (CAPTURE || S.speed > 0) { const ang = dt * 0.035 * (CAPTURE ? 1 : 0.6); camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), ang).add(controls.target); }
    controls.update(); return;
  }
  if (S.cam === 'map') { camPos.set(48, 215, 75); camTgt.set(48, 0, 8); }
  if (S.cam === 'tray') {
    let t = S.followTray;
    if (!t || !t.alive) { t = TRAY_POOL.filter((q) => q.alive && q.x < -6).sort((a, c) => c.x - a.x)[0] || TRAY_POOL.filter((q) => q.alive).sort((a, c) => a.x - c.x)[0]; S.followTray = t; }
    if (t) { camPos.set(t.x + 1.5, CONV.y + 3.6, CONV.z + 4.8); camTgt.set(t.x + 0.6, CONV.y, CONV.z - 0.6); }
    else { camPos.set(-6, 6, 13); camTgt.set(-4, 1.5, 6); }
  }
  if (S.cam === 'van') {
    const v = chooseVan(); const g = v.g; const fwd = new THREE.Vector3(Math.cos(g.rotation.y), 0, -Math.sin(g.rotation.y));
    camPos.copy(g.position).addScaledVector(fwd, -14).add(tmpV.set(0, 10, 0)).add(tmpV.set(-fwd.z * 5, 0, fwd.x * 5)); camTgt.copy(g.position).addScaledVector(fwd, 5).add(tmpV.set(0, 1, 0));
  }
  if (S.cam === 'action') {
    S.shotT += dt; if (S.shotT > 4.2) { S.shotT = 0; S.shot = (S.shot + 1) % ACTION.length; S.camBlend = 1; S.cut = true; }
    const sh = ACTION[S.shot]; const k = S.shotT / 4.2;
    camPos.set(sh.p[0] + sh.d[0] * k, sh.p[1] + sh.d[1] * k, sh.p[2] + sh.d[2] * k); camTgt.set(...sh.t);
  }
  if (S.cut) { camera.position.copy(camPos); controls.target.copy(camTgt); S.cut = false; }
  else { const f = S.camBlend < 1 ? 0.08 + b * 0.3 : (S.cam === 'action' ? 1 : 0.18); camera.position.lerp(camPos, f); controls.target.lerp(camTgt, f); }
  camera.lookAt(controls.target);
}

// ---------- overlay projection ----------
const proj = new THREE.Vector3();
function toScreen(v) { proj.copy(v).project(camera); return { x: (proj.x * 0.5 + 0.5) * innerWidth, y: (-proj.y * 0.5 + 0.5) * innerHeight, vis: proj.z < 1 && proj.z > -1 }; }
function updateOverlay(dt) {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i]; p.life += dt; const k = p.life / 1.9;
    if (k >= 1) { p.el.remove(); popups.splice(i, 1); continue; }
    const s = toScreen(p.pos); p.el.style.display = s.vis ? 'block' : 'none';
    p.el.style.left = s.x + 'px'; p.el.style.top = s.y - k * 50 + 'px'; p.el.style.opacity = k < 0.12 ? k / 0.12 : k > 0.75 ? (1 - k) / 0.25 : 1;
    p.el.style.transform = `translate(-50%,-100%) scale(${k < 0.12 ? 0.8 + k * 1.6 : 1})`;
  }
  const showLab = S.cam === 'map' || S.cam === 'overview' || S.cam === 'van';
  schoolObjs.forEach((o, i) => {
    const s = toScreen(tmpV.set(o.s.x, 8.5, o.s.z)); const st = schoolState[i];
    o.lab.style.display = showLab && s.vis && s.x < innerWidth - 380 ? 'block' : 'none'; o.lab.style.left = s.x + 'px'; o.lab.style.top = s.y + 'px';
    o.lab.innerHTML = `${o.s.short}<small>${st.status === 'done' ? 'served' : st.status === 'road' ? 'van coming' : o.s.portions + ' trays'}</small>`;
  });
}
function updateHUD() {
  $('clock').textContent = fmt(S.clock);
  const made = produced();
  $('count').textContent = nf(made); $('countbar').style.width = (made / TARGET) * 100 + '%';
  $('delivered').textContent = `${nf(S.delivered)} delivered to ${schoolState.filter((s) => s.status === 'done').length} of ${SCHOOLS.length} schools`;
  const c = S.clock; let st = 'Receiving ingredients';
  if (c >= 228) st = 'Washing and prep'; if (c >= 240) st = 'Cooking'; if (c >= T.PORTION[0]) st = 'Portioning and packing'; if (c >= T.PORTION[1]) st = 'Delivering to schools'; if (S.doneAt) st = 'Day complete';
  $('stage').textContent = st;
}

// ---------- loop ----------
SCHOOLS.forEach((s) => (s.dist = Math.round(travelMin(vans[0], s)) + ' min drive'));
resetDay(0);
renderTabs(); renderMenu();
function frame(dt) {
  simStep(dt); applySky(); updateCamera(dt); updateTicker(dt); updateOverlay(dt); updateHUD();
  uiTimer += dt; if (uiTimer > 0.25) { uiTimer = 0; renderTabs(); }
  composer.render();
}
function viewOffset() { const off = innerWidth > 900 ? 190 : 0; camera.setViewOffset(innerWidth, innerHeight, off, 0, innerWidth, innerHeight); }
viewOffset();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; viewOffset(); camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight); });
if (!CAPTURE) {
  let last = performance.now();
  const loop = (now) => { const dt = Math.min(0.1, (now - last) / 1000); last = now; frame(dt); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
} else {
  const cur = $('cursor'); cur.innerHTML = '<div class="ring"></div>';
  window.__cap = {
    frame, setCam, setMenu, setSpeed, setTab, S,
    jump(clock) { const sp = S.speed; S.speed = 1; while (S.clock < clock - 0.01) simStep(Math.min(0.5, clock - S.clock)); S.speed = sp; track.innerHTML = ''; tickX = 0; S.events.slice(0, 6).reverse().forEach((e) => { const el = document.createElement('span'); el.innerHTML = `<em>${fmt(e.t)}</em>${e.msg}`; track.appendChild(el); }); popups.forEach((p) => p.el.remove()); popups.length = 0; },
    cursor(x, y, ring) { cur.style.display = 'block'; cur.style.left = x + 'px'; cur.style.top = y + 'px'; const r = cur.firstChild; r.style.opacity = ring > 0 ? ring : 0; r.style.transform = `scale(${1.6 - ring * 0.6})`; },
    rect(sel) { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; },
  };
}
await document.fonts.ready;
window.ready = true;
