import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ViewHelper } from 'three/examples/jsm/helpers/ViewHelper.js';
import { applyIndustrialMaterials } from './materials.js';
import { getPartInfo, ZONES } from './partInfo.js';
import './style.css';

// --- State Variables & Telemetry --------------------------------------------
const PART_COUNT = 260;
let leakPts = null;
let animationFrameId = null;
let isRunning = true;

const APP = {
  activeLeak: null,
  severity: 2,
  rpm: 1800,
  load: 75,
  activeZone: null,
  autoRot: true,
  demo: false,
  explode: false,
};

const TQ_TABLE = {
  1100: 2848, 1200: 3120, 1300: 3609, 1400: 3656, 1500: 3564,
  1600: 3446, 1700: 3315, 1800: 3165, 1900: 2998, 2000: 2848, 2100: 2713
};

const SD = {
  MAF: { v: 842, u: 'kg/h', mn: 350, mx: 1200, c: '#00FFE0' },
  MAP_boost: { v: 218, u: 'kPa', mn: 100, mx: 330, c: '#3a9fff' },
  MAP_cac: { v: 213, u: 'kPa', mn: 100, mx: 325, c: '#3a9fff' },
  T_cac_out: { v: 52, u: '°C', mn: 20, mx: 140, c: '#CC88FF' },
  T_exh_man: { v: 512, u: '°C', mn: 280, mx: 800, c: '#FF6600' },
  dP_dpf: { v: 4.2, u: 'kPa', mn: 0, mx: 22, c: '#FF9944' },
};

const SN = {
  MAF: 'Mass Air Flow',
  MAP_boost: 'Boost Pressure',
  MAP_cac: 'CAC Outlet Press',
  T_cac_out: 'CAC Outlet Temp',
  T_exh_man: 'Exh Manifold Temp',
  dP_dpf: 'DPF Back-Pressure'
};

const LEAK_DEF = {
  A: { zone: 1, sen: 'MAF', d: -0.15, lbl: 'Zone 1 — Air Intake & MAF Sensor Drift', act: 'Inspect MAF sensor connector, intake filter element, and ducting. Recalibrate intake air-density model.' },
  B: { zone: 2, sen: 'MAP_boost', d: -0.17, lbl: 'Zone 2 — Turbo Compressor Boost Pressure Loss', act: 'Inspect turbocharger compressor housing, V-band clamp, and boost ducting. Check compressor wheel tip clearance.' },
  C: { zone: 2, sen: 'MAP_cac', d: -0.14, lbl: 'Zone 2 — Intercooler (CAC) Thermal Inefficiency', act: 'Inspect CAC heat exchanger core. Check for cooling fin blockage, thermal heat soak, or end-tank pressure loss.' },
  D: { zone: 3, sen: 'T_exh_man', d: -0.12, lbl: 'Zone 3 — Exhaust Manifold Thermal Blowby', act: 'Inspect cylinder exhaust manifold gasket interfaces. Check stud torque (65 Nm) and monitor EGT cylinder imbalance.' },
  E: { zone: 3, sen: 'dP_dpf', d: -0.23, lbl: 'Zone 3 — Wastegate Actuator Drift & Turbine ΔP', act: 'Inspect pneumatic wastegate actuator linkage and turbine bypass valve. Check for actuator diaphragm fatigue or carbon binding.' },
  F: { zone: 4, sen: 'MAP_boost', d: -0.05, lbl: '⚠ CRITICAL FAULT — Fuel Rail Pressure Loss', act: 'CRITICAL SAFETY ALERT: Fuel rail pressure loss detected — Fire/starvation risk. Inspect dual-lane HP pump and injector seals.' },
};

// Auto-calibrated leak positions (fallback values)
let LEAK_POS = {
  A: new THREE.Vector3(-150, 60, 20),
  B: new THREE.Vector3(80, 80, -20),
  C: new THREE.Vector3(-100, 60, -40),
  D: new THREE.Vector3(0, 10, 40),
  E: new THREE.Vector3(150, -40, 20),
  F: new THREE.Vector3(0, 20, -30),
};

const ZP = { 1: [], 2: [], 3: [], 4: [] };
const ORIG = new Map();

// --- DOM references ---------------------------------------------------------
const canvas = document.getElementById('viewport');
const loadingEl = document.getElementById('loading');
const progressBar = document.getElementById('progress-bar');
const loadingDetail = document.getElementById('loading-detail');
const statsEl = document.getElementById('stats');
const infoPanel = document.getElementById('info-panel');
const infoPanelClose = document.getElementById('info-close');
const infoBadge = document.getElementById('info-zone-badge');
const infoName = document.getElementById('info-name');
const infoDesc = document.getElementById('info-desc');
const infoSpecsTbody = document.querySelector('#info-specs tbody');
const hoverLabel = document.getElementById('hover-label');

// --- WebGL Renderer Setup ---------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const basePixelRatio = Math.min(window.devicePixelRatio, 2);
renderer.setPixelRatio(basePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;

const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0f14);
scene.fog = new THREE.Fog(0x0c0f14, 4000, 14000);

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.7;

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 100000);
camera.position.set(2600, 1900, 2800);

// --- Orbit Controls ---------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.zoomToCursor = true;

controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.ROTATE,
  RIGHT: THREE.MOUSE.PAN,
};
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

let pointerDownX = 0;
let pointerDownY = 0;
canvas.addEventListener('pointerdown', (e) => {
  pointerDownX = e.clientX;
  pointerDownY = e.clientY;
}, { capture: true });

// --- Navigation Gizmo -------------------------------------------------------
const viewHelper = new ViewHelper(camera, canvas);
viewHelper.setLabels('X', 'Y', 'Z');
viewHelper.location = { top: null, right: 20, bottom: 110, left: null };

canvas.addEventListener('pointerup', (e) => {
  if (viewHelper.handleClick(e)) {
    controls.enabled = false;
    requestRender();
  }
});

// Resolution drop during drag (HiDPI performance)
let resolutionRestoreTimer = null;
controls.addEventListener('start', () => {
  clearTimeout(resolutionRestoreTimer);
  renderer.setPixelRatio(1);
});
controls.addEventListener('end', () => {
  resolutionRestoreTimer = setTimeout(() => {
    renderer.setPixelRatio(basePixelRatio);
    requestRender();
  }, 150);
});

// --- Lighting ---------------------------------------------------------------
const hemiLight = new THREE.HemisphereLight(0xcfe0ff, 0x33312c, 0.5);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xfff8f0, 1.6);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0xcfe8ff, 0.4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xb0ccff, 0.5);
scene.add(rimLight);

const accentL = new THREE.PointLight(0xf5c518, 0, 800);
accentL.position.set(0, 500, 200);
scene.add(accentL);

const leakL = new THREE.PointLight(0xff2244, 0, 500);
scene.add(leakL);

// --- Ground & Grid ----------------------------------------------------------
const groundMat = new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.95, metalness: 0.0 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

let grid = new THREE.GridHelper(1, 1, 0x3a4250, 0x1c222c);
scene.add(grid);

// --- Explode view -----------------------------------------------------------
let explodeParts = [];
const EXPLODE_SCALE = 1.4;
let targetExplode = 0;
let currentExplode = 0;
let explodeSettled = true;

const explodeSlider = document.getElementById('explode-slider');
const explodeValueEl = document.getElementById('explode-value');
if (explodeSlider) {
  explodeSlider.addEventListener('input', () => {
    targetExplode = Number(explodeSlider.value) / 100;
    if (explodeValueEl) explodeValueEl.textContent = `${explodeSlider.value}%`;
    requestRender();
  });
}

// --- Dynamic Leak Emitters & Particle System ---------------------------------
function clearLeakParticles() {
  if (leakPts) {
    scene.remove(leakPts.pts);
    leakPts.pts.geometry.dispose();
    leakPts.pts.material.dispose();
  }
  leakPts = null;
}

function createLeakParticles(pos, hex) {
  clearLeakParticles();
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(PART_COUNT * 3);
  const vel = [], life = [];
  for (let i = 0; i < PART_COUNT; i++) {
    positions[i * 3] = pos.x + (Math.random() - 0.5) * 20;
    positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 15;
    positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 20;
    vel.push({ x: (Math.random() - 0.5) * 3.5, y: Math.random() * 5.0 + 1.0, z: (Math.random() - 0.5) * 3.5 });
    life.push({ v: Math.random(), max: 0.7 + Math.random() * 1.1 });
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: new THREE.Color(hex), size: 12.0, transparent: true,
    opacity: 0.8, sizeAttenuation: true, depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  leakPts = { pts: new THREE.Points(geo, mat), geo, vel, life, pos };
  scene.add(leakPts.pts);
}

function tickParticles() {
  if (!leakPts) return;
  const arr = leakPts.geo.attributes.position.array;
  const t = clock.getElapsedTime();
  for (let i = 0; i < PART_COUNT; i++) {
    leakPts.life[i].v -= 0.015;
    if (leakPts.life[i].v < 0) {
      leakPts.life[i].v = leakPts.life[i].max;
      arr[i * 3] = leakPts.pos.x + (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = leakPts.pos.y + (Math.random() - 0.5) * 15;
      arr[i * 3 + 2] = leakPts.pos.z + (Math.random() - 0.5) * 20;
      leakPts.vel[i].y = Math.random() * 5.0 + 1.0;
    }
    arr[i * 3] += leakPts.vel[i].x;
    arr[i * 3 + 1] += leakPts.vel[i].y;
    arr[i * 3 + 2] += leakPts.vel[i].z;
    leakPts.vel[i].y *= 0.993;
  }
  leakPts.geo.attributes.position.needsUpdate = true;
  leakPts.pts.material.opacity = 0.55 + 0.35 * Math.sin(t * 3.5);
}

// --- Auto-Calibration of Leak Positions -------------------------------------
function setLeakPositionFromMesh(leakType, mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  const pos = box.getCenter(new THREE.Vector3());
  LEAK_POS[leakType] = pos;
}

// --- Loading Model ----------------------------------------------------------
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/gltf/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);

let modelCenter = new THREE.Vector3();
let modelRadius = 0;
const initCamPos = new THREE.Vector3();
const initCamTarget = new THREE.Vector3();

let pistonMeshes = [];
let turboMeshes = [];
let crankMeshes = [];

gltfLoader.load(
  '/models/c18.glb',
  (gltf) => onModelLoaded(gltf),
  (xhr) => {
    if (xhr.total) {
      const pct = (xhr.loaded / xhr.total) * 100;
      if (progressBar) progressBar.style.width = `${pct.toFixed(1)}%`;
      if (loadingDetail) loadingDetail.textContent = `${pct.toFixed(0)}%  (${(xhr.loaded / 1048576).toFixed(1)} / ${(xhr.total / 1048576).toFixed(1)} MB)`;
    } else {
      if (loadingDetail) loadingDetail.textContent = `${(xhr.loaded / 1048576).toFixed(1)} MB loaded`;
    }
  },
  (err) => {
    if (loadingDetail) loadingDetail.textContent = 'Failed to load model — see console';
    console.error('GLTF load error:', err);
  }
);

function onModelLoaded(gltf) {
  const model = gltf.scene;

  applyIndustrialMaterials(model);

  let triangles = 0;
  let meshCount = 0;
  allMeshes = [];
  pistonMeshes = [];
  turboMeshes = [];
  crankMeshes = [];

  model.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      allMeshes.push(obj);
      meshCount++;
      const geo = obj.geometry;
      if (geo.index) triangles += geo.index.count / 3;
      else if (geo.attributes.position) triangles += geo.attributes.position.count / 3;

      // Group sub-meshes for animation & calibration
      const nameLower = obj.name.toLowerCase();
      if (nameLower.includes('piston')) {
        pistonMeshes.push({ mesh: obj, homeY: obj.position.y });
      } else if (nameLower.includes('turbo') || nameLower.includes('impeller') || nameLower.includes('compressor')) {
        turboMeshes.push(obj);
      } else if (nameLower.includes('crank') || nameLower.includes('flywheel')) {
        crankMeshes.push(obj);
      }

      // Dynamic leak calibration
      if (nameLower.includes('airflow') || nameLower.includes('maf')) {
        setLeakPositionFromMesh('A', obj);
      } else if (nameLower.includes('compressor') || (nameLower.includes('turbo') && nameLower.includes('outlet'))) {
        setLeakPositionFromMesh('B', obj);
      } else if (nameLower.includes('cooler') || nameLower.includes('cac')) {
        setLeakPositionFromMesh('C', obj);
      } else if (nameLower.includes('exhaust') && nameLower.includes('manifold')) {
        setLeakPositionFromMesh('D', obj);
      } else if (nameLower.includes('dpf') || nameLower.includes('scr') || nameLower.includes('aftertreatment')) {
        setLeakPositionFromMesh('E', obj);
      } else if (nameLower.includes('fuel') || nameLower.includes('rail') || nameLower.includes('injector')) {
        setLeakPositionFromMesh('F', obj);
      }

      // Map meshes to zones for emissive pulsing highlights
      const info = getPartInfo(obj.name || 'Structure');
      if (info && info.zone) {
        let zoneIdx = 0;
        if (info.zone === 'intake') zoneIdx = 1;
        else if (info.zone === 'boost') zoneIdx = 2;
        else if (info.zone === 'exhaust' || info.zone === 'aftertreatment') zoneIdx = 3;
        else if (info.zone === 'fuel') zoneIdx = 4;
        if (zoneIdx > 0) {
          ZP[zoneIdx].push(obj);
        }
      }
    }
  });

  scene.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;

  explodeParts = [];
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    const partCenter = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
    explodeParts.push({
      obj,
      home: obj.position.clone(),
      dir: partCenter.sub(center),
    });
  });

  const dist = radius * 2.1;
  camera.position.set(center.x + dist * 0.55, center.y + dist * 0.5, center.z + dist * 0.7);
  camera.near = Math.max(maxDim / 1000, 0.1);
  camera.far = maxDim * 12;
  camera.updateProjectionMatrix();

  controls.target.copy(center);
  controls.minDistance = radius * 0.05;
  controls.maxDistance = radius * 6;
  controls.update();

  modelCenter.copy(center);
  modelRadius = radius;
  initCamPos.copy(camera.position);
  initCamTarget.copy(center);

  const sunDist = maxDim * 1.2;
  sunLight.position.set(center.x + sunDist * 0.6, center.y + sunDist * 1.1, center.z + sunDist * 0.8);
  sunLight.target.position.copy(center);
  scene.add(sunLight.target);

  const shadowExtent = maxDim * 0.75;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  sunLight.shadow.camera.near = maxDim * 0.05;
  sunLight.shadow.camera.far = maxDim * 4;
  sunLight.shadow.camera.updateProjectionMatrix();

  fillLight.position.set(center.x - sunDist * 0.8, center.y + sunDist * 0.4, center.z - sunDist * 0.6);
  fillLight.target.position.copy(center);
  scene.add(fillLight.target);

  rimLight.position.set(center.x - sunDist * 0.4, center.y + sunDist * 0.2, center.z - sunDist * 1.0);
  rimLight.target.position.copy(center);
  scene.add(rimLight.target);

  const groundSize = maxDim * 4;
  ground.geometry.dispose();
  ground.geometry = new THREE.PlaneGeometry(groundSize, groundSize);
  ground.position.set(center.x, box.min.y - maxDim * 0.001, center.z);

  scene.remove(grid);
  grid.geometry.dispose();
  grid = new THREE.GridHelper(groundSize, 40, 0x4a5568, 0x1c222c);
  grid.position.set(center.x, box.min.y - maxDim * 0.0008, center.z);
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  scene.fog.near = radius * 2.5;
  scene.fog.far = radius * 9;

  if (statsEl) {
    statsEl.textContent = [
      `Objects: ${meshCount}`,
      `Triangles: ${Math.round(triangles).toLocaleString()}`,
      `Format: GLB (Draco compressed)`,
    ].join('\n');
  }

  renderer.compile(scene, camera);
  renderer.shadowMap.needsUpdate = true;

  if (explodeSlider) {
    explodeSlider.disabled = false;
    explodeSlider.value = '0';
  }
  if (explodeValueEl) explodeValueEl.textContent = '0%';

  // Wire up part interaction
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('click', onCanvasClick);
  if (infoPanelClose) infoPanelClose.addEventListener('click', deselectPart);

  // Initialize UI components
  buildSensorsUI();
  updateSensors(null);
  renderEF(null);

  // Hide loading screen
  if (loadingEl) loadingEl.classList.add('hidden');
  requestRender();
}

// --- Telemetry Calculations & Diagnostics Logic -----------------------------
function buildSensorsUI() {
  const sw = document.getElementById('sw');
  if (!sw) return;
  sw.innerHTML = '';
  Object.entries(SD).forEach(([k, s]) => {
    const pct = ((s.v - s.mn) / (s.mx - s.mn) * 100).toFixed(1);
    sw.innerHTML += `
      <div class="sg" id="sg-${k}">
        <div class="sgtop">
          <span class="sgn">${SN[k]}</span>
          <span class="sgv" id="sv-${k}" style="color:${s.c}">
            ${s.v.toFixed(1)}<span class="sgu">${s.u}</span>
          </span>
        </div>
        <div class="sgbg">
          <div class="sgf" id="sf-${k}" style="width:${pct}%;background:${s.c}"></div>
        </div>
        <div class="sgr sok" id="sr-${k}">RESIDUAL: +0.0 ${s.u} (0.0%)</div>
      </div>`;
  });
}

function updateSensors(lk) {
  const rs = APP.rpm / 1800;
  const ls = APP.load / 75;
  const sm = [0, 0.06, 0.14, 0.25][APP.severity];

  Object.entries(SD).forEach(([k, s]) => {
    let predictedVal = s.v * (rs * 0.3 + ls * 0.7);
    let actualVal = predictedVal;
    let res = 0;

    if (lk) {
      const def = LEAK_DEF[lk];
      if (def.sen === k) {
        actualVal = predictedVal * (1 + def.d * sm / 0.14);
        res = actualVal - predictedVal;
      }

      // Secondary effects
      if (lk === 'A') {
        if (k === 'MAP_boost' || k === 'MAP_cac') actualVal *= 0.96;
      }
      if (lk === 'B') {
        if (k === 'MAP_cac') actualVal *= 0.90;
        if (k === 'T_cac_out') actualVal += 9 * sm / 0.14;
      }
      if (lk === 'C') {
        if (k === 'MAP_cac') actualVal *= 0.87;
      }
      if (lk === 'D') {
        if (k === 'MAP_boost') actualVal *= 0.97;
        if (k === 'dP_dpf') actualVal *= 0.88;
      }
      if (lk === 'E') {
        if (k === 'dP_dpf') actualVal *= 0.64;
        if (k === 'T_exh_man') actualVal += 20 * sm / 0.14;
      }
      if (lk === 'F') {
        if (k === 'MAP_boost') actualVal *= 0.95;
      }

      if (def.sen !== k) {
        res = actualVal - predictedVal;
      }
    }

    const pct = Math.max(2, Math.min(100, ((actualVal - s.mn) / (s.mx - s.mn)) * 100));
    const rp = (predictedVal > 0 ? (res / predictedVal) * 100 : 0).toFixed(1);
    const ra = predictedVal > 0 ? Math.abs(res / predictedVal) : 0;

    const bc = ra > 0.08 ? '#FF2244' : ra > 0.03 ? '#FF6600' : s.c;
    const rc = ra > 0.08 ? 'sbc' : ra > 0.03 ? 'swc' : 'sok';
    const cc = ra > 0.08 ? 'b' : ra > 0.03 ? 'w' : '';

    const sv = document.getElementById('sv-' + k);
    const sf = document.getElementById('sf-' + k);
    const sr = document.getElementById('sr-' + k);
    const sc = document.getElementById('sg-' + k);

    if (sv) { sv.textContent = actualVal.toFixed(1); sv.style.color = bc; }
    if (sf) { sf.style.width = pct + '%'; sf.style.background = bc; }
    if (sr) { sr.textContent = `RESIDUAL: ${res >= 0 ? '+' : ''}${res.toFixed(1)} ${s.u} (${rp}%)`; sr.className = 'sgr ' + rc; }
    if (sc) sc.className = 'sg ' + cc;
  });

  const maf = SD.MAF.v * (rs * 0.3 + ls * 0.7);
  const bst = SD.MAP_boost.v * (rs * 0.3 + ls * 0.7);
  const exh = SD.T_exh_man.v * (rs * 0.3 + ls * 0.7);

  const hRpm = document.getElementById('hv-rpm');
  const hMaf = document.getElementById('hv-maf');
  const hBst = document.getElementById('hv-boost');
  const hExh = document.getElementById('hv-exh');
  const hTq = document.getElementById('hv-tq');
  const specTq = document.getElementById('spec-tq');

  if (hRpm) hRpm.textContent = APP.rpm;
  if (hMaf) hMaf.textContent = maf.toFixed(0);
  if (hBst) hBst.textContent = bst.toFixed(0);
  if (hExh) hExh.textContent = exh.toFixed(0);

  const r2 = Math.round(APP.rpm / 100) * 100;
  const tq = TQ_TABLE[Math.max(1100, Math.min(2100, r2))] || 3165;
  if (hTq) hTq.textContent = Math.round(tq * APP.load / 100);
  if (specTq) specTq.textContent = tq + ' N·m @ ' + APP.rpm;
}

// --- Energy Field 6x6 Correlation Matrix -------------------------------------
const EF_CH = ['MAF', 'Bst', 'CAC-P', 'CAC-T', 'Exh-T', 'DPF'];
const EF_H = [
  [1, .87, .78, .40, .20, .12],
  [.87, 1, .92, .50, .30, .16],
  [.78, .92, 1, .60, .28, .20],
  [.40, .50, .60, 1, .65, .25],
  [.20, .30, .28, .65, 1, .50],
  [.12, .16, .20, .25, .50, 1]
];
const EF_DISR = {
  A: [[0, 1], [0, 2], [0, 3], [1, 0], [2, 0]],
  B: [[1, 0], [1, 2], [1, 3], [2, 1]],
  C: [[2, 0], [2, 1], [2, 3], [3, 2]],
  D: [[4, 0], [4, 1], [4, 3], [4, 5]],
  E: [[5, 0], [5, 1], [5, 3], [5, 4], [4, 5]],
  F: [[1, 2], [2, 1], [0, 1]]
};

function renderEF(lk) {
  const g = document.getElementById('efg');
  const l = document.getElementById('efl');
  if (!g || !l) return;
  g.innerHTML = ''; l.innerHTML = '';
  const f = EF_H.map(r => [...r]);
  const dis = new Set();

  if (lk && EF_DISR[lk]) {
    EF_DISR[lk].forEach(([r, c]) => {
      const d = (0.3 + APP.severity * 0.18) * (0.7 + Math.random() * 0.5);
      f[r][c] = Math.max(-0.4, f[r][c] - d);
      f[c][r] = f[r][c];
      dis.add(r + ',' + c);
      dis.add(c + ',' + r);
    });
  }
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const v = f[r][c], isDis = dis.has(r + ',' + c) && lk;
      let bg;
      if (r === c) bg = 'rgba(245,197,24,.28)';
      else if (isDis) bg = `rgba(255,34,68,${(0.18 + Math.abs(v) * 0.55).toFixed(2)})`;
      else if (v >= 0) bg = `rgba(58,159,255,${(0.06 + v * 0.62).toFixed(2)})`;
      else bg = `rgba(255,80,60,${(0.06 + Math.abs(v) * 0.5).toFixed(2)})`;

      const cell = document.createElement('div');
      cell.className = 'efc';
      cell.style.background = bg;
      if (isDis) cell.style.boxShadow = '0 0 5px rgba(255,34,68,.5)';
      cell.innerHTML = `<div class="eft">${EF_CH[r]}↔${EF_CH[c]}: ${v.toFixed(2)}</div>`;
      g.appendChild(cell);
    }
    const lbl = document.createElement('div');
    lbl.className = 'efl';
    lbl.textContent = EF_CH[r];
    l.appendChild(lbl);
  }
}

// --- Simulate & Reset Controls ----------------------------------------------
let targetCamPos = null;
let targetLookAt = null;

function focusCameraOnZone(zone) {
  if (!modelRadius) return;
  const d = modelRadius * 2.1;
  const c = modelCenter.clone();

  if (zone === 1) { // Intake
    targetCamPos = new THREE.Vector3(c.x - d * 0.8, c.y + d * 0.3, c.z + d * 0.6);
    targetLookAt = new THREE.Vector3(c.x - d * 0.3, c.y, c.z);
  } else if (zone === 2) { // Charge Air
    targetCamPos = new THREE.Vector3(c.x, c.y + d * 0.7, c.z + d * 0.6);
    targetLookAt = new THREE.Vector3(c.x, c.y + d * 0.2, c.z);
  } else if (zone === 3) { // Exhaust
    targetCamPos = new THREE.Vector3(c.x + d * 0.8, c.y + d * 0.2, c.z + d * 0.5);
    targetLookAt = new THREE.Vector3(c.x + d * 0.3, c.y, c.z);
  } else if (zone === 4) { // Fuel
    targetCamPos = new THREE.Vector3(c.x - d * 0.4, c.y + d * 0.3, c.z - d * 0.7);
    targetLookAt = new THREE.Vector3(c.x, c.y, c.z);
  } else {
    // Reset view
    targetCamPos = new THREE.Vector3(initCamPos.x, initCamPos.y, initCamPos.z);
    targetLookAt = new THREE.Vector3(initCamTarget.x, initCamTarget.y, initCamTarget.z);
  }
}

function simLeak(z) {
  APP.activeLeak = z;
  APP.autoRot = false;

  document.querySelectorAll('.lkbtn').forEach(b => b.classList.remove('on'));
  const lbBtn = document.getElementById('lb-' + z);
  if (lbBtn) lbBtn.classList.add('on');

  const def = LEAK_DEF[z];
  const pos = LEAK_POS[z] || new THREE.Vector3(0, 0, 0);
  const col = z === 'F' ? 0xFFAA00 : def.zone === 3 ? 0xFF2244 : def.zone === 1 ? 0x00FFE0 : 0xFF6600;
  createLeakParticles(pos, col);

  // Go/No-Go banner
  const gng = document.getElementById('gng');
  const gngl = document.getElementById('gngl');
  const gngs = document.getElementById('gngs');
  if (gng) gng.className = 'ng';
  if (gngl) gngl.textContent = 'NO-GO';
  if (gngs) gngs.textContent = def.lbl.substring(0, 40);

  // Floating Recommendation Action
  const acv = document.getElementById('acv');
  if (acv) {
    acv.textContent = def.act;
    acv.style.color = 'var(--orange)';
  }

  // Energy field score
  const score = (0.7 + APP.severity * 0.95 + Math.random() * 0.3).toFixed(2);
  const efScore = document.getElementById('ef-score');
  const efBar = document.getElementById('ef-bar');
  const efThresh = document.getElementById('ef-thresh');

  if (efScore) { efScore.textContent = score; efScore.style.color = 'var(--red)'; }
  if (efBar) { efBar.style.width = Math.min(100, parseFloat(score) / 5 * 100) + '%'; efBar.style.background = 'var(--red)'; }
  if (efThresh) { efThresh.textContent = 'ABOVE THRESHOLD (2.50)'; efThresh.style.color = 'var(--red)'; }

  // Accent & Leak lights
  if (leakL) {
    leakL.position.copy(pos);
    leakL.color.setHex(col);
    leakL.intensity = 1.8;
  }

  // Camera focus on target zone
  focusCameraOnZone(def.zone);

  updateSensors(z);
  renderEF(z);
}

function clearLeak() {
  APP.activeLeak = null;
  APP.autoRot = true;
  clearLeakParticles();

  document.querySelectorAll('.lkbtn').forEach(b => b.classList.remove('on'));

  const gng = document.getElementById('gng');
  const gngl = document.getElementById('gngl');
  const gngs = document.getElementById('gngs');
  if (gng) gng.className = 'go';
  if (gngl) gngl.textContent = 'GO';
  if (gngs) gngs.textContent = 'All zones nominal';

  const acv = document.getElementById('acv');
  if (acv) {
    acv.textContent = 'Engine nominal. All twin residuals within ±2% tolerance.';
    acv.style.color = 'var(--teal)';
  }

  const efScore = document.getElementById('ef-score');
  const efBar = document.getElementById('ef-bar');
  const efThresh = document.getElementById('ef-thresh');
  if (efScore) { efScore.textContent = '0.14'; efScore.style.color = 'var(--gold)'; }
  if (efBar) { efBar.style.width = '5.6%'; efBar.style.background = 'var(--teal)'; }
  if (efThresh) { efThresh.textContent = 'BELOW THRESHOLD (2.50)'; efThresh.style.color = 'var(--teal)'; }

  if (leakL) leakL.intensity = 0;

  // Reset emissive intensities
  allMeshes.forEach(mesh => {
    if (mesh.material && mesh.material.emissiveIntensity !== undefined) {
      mesh.material.emissiveIntensity = 0;
    }
  });

  // Focus reset
  focusCameraOnZone(0);

  updateSensors(null);
  renderEF(null);
}

// --- Control Event Handlers --------------------------------------------------
function onSev(v) {
  APP.severity = parseInt(v);
  const sevV = document.getElementById('sev-v');
  if (sevV) sevV.textContent = ['', 'SM', 'MED', 'LGE'][v];
  if (APP.activeLeak) simLeak(APP.activeLeak);
}
function onRPM(v) {
  APP.rpm = parseInt(v);
  const rpmV = document.getElementById('rpm-v');
  if (rpmV) rpmV.textContent = v;
  updateSensors(APP.activeLeak);
}
function onLoad(v) {
  APP.load = parseInt(v);
  const loadV = document.getElementById('load-v');
  if (loadV) loadV.textContent = v + '%';
  updateSensors(APP.activeLeak);
}

// Hook up floating panel controls
const sevSl = document.getElementById('sev-sl');
const rpmSl = document.getElementById('rpm-sl');
const loadSl = document.getElementById('load-sl');
const clearSimBtn = document.getElementById('btn-clr-sim');
const clearBtn = document.getElementById('btn-clr');

if (sevSl) sevSl.addEventListener('input', (e) => onSev(e.target.value));
if (rpmSl) rpmSl.addEventListener('input', (e) => onRPM(e.target.value));
if (loadSl) loadSl.addEventListener('input', (e) => onLoad(e.target.value));
if (clearSimBtn) clearSimBtn.addEventListener('click', clearLeak);
if (clearBtn) clearBtn.addEventListener('click', clearLeak);

// Hook up leak simulation buttons
['A', 'B', 'C', 'D', 'E', 'F'].forEach(z => {
  const btn = document.getElementById('lb-' + z);
  if (btn) btn.addEventListener('click', () => simLeak(z));
});

// Hook up main action bar buttons
const btnXp = document.getElementById('btn-xp');
const btnDemo = document.getElementById('btn-demo');

if (btnXp) {
  btnXp.addEventListener('click', () => {
    APP.explode = !APP.explode;
    btnXp.classList.toggle('on', APP.explode);
    targetExplode = APP.explode ? 1.0 : 0.0;
    if (explodeSlider) explodeSlider.value = APP.explode ? '100' : '0';
    if (explodeValueEl) explodeValueEl.textContent = APP.explode ? '100%' : '0%';
    requestRender();
  });
}

// --- Auto Demo Cycle --------------------------------------------------------
const DEMO_SEQ = [
  () => { clearLeak(); },
  () => { simLeak('A'); },
  () => { clearLeak(); setTimeout(() => simLeak('B'), 400); },
  () => { clearLeak(); setTimeout(() => simLeak('C'), 400); },
  () => { clearLeak(); },
  () => { simLeak('D'); },
  () => { clearLeak(); setTimeout(() => simLeak('E'), 400); },
  () => { clearLeak(); setTimeout(() => simLeak('F'), 400); },
  () => { clearLeak(); },
];
let demoIdx = 0;
let demoInterval = null;

function toggleDemo() {
  APP.demo = !APP.demo;
  if (btnDemo) {
    btnDemo.classList.toggle('on', APP.demo);
    btnDemo.textContent = APP.demo ? 'â¹ STOP DEMO' : '▶ AUTO DEMO';
  }
  if (APP.demo) {
    demoIdx = 0;
    DEMO_SEQ[0]();
    demoInterval = setInterval(() => {
      demoIdx = (demoIdx + 1) % DEMO_SEQ.length;
      DEMO_SEQ[demoIdx]();
    }, 4500);
  } else {
    if (demoInterval) clearInterval(demoInterval);
    demoInterval = null;
    clearLeak();
  }
}
if (btnDemo) btnDemo.addEventListener('click', toggleDemo);

// --- Material Pulse on Leak --------------------------------------------------
function pulseMats(lk, t) {
  // Clear other zones' emissions first
  allMeshes.forEach(mesh => {
    if (mesh.material && mesh.material.emissiveIntensity !== undefined && !mesh.userData._origMat) {
      mesh.material.emissiveIntensity = 0;
    }
  });
  if (!lk) return;
  const def = LEAK_DEF[lk];
  if (!def) return;
  const pulse = 0.1 + 0.09 * Math.sin(t * 4.5);
  const col = lk === 'F' ? new THREE.Color(0xFFAA00) : new THREE.Color(0xFF2244);
  ZP[def.zone].forEach(mesh => {
    if (mesh.material && mesh.material.emissiveIntensity !== undefined && !mesh.userData._origMat) {
      mesh.material.emissive = col;
      mesh.material.emissiveIntensity = pulse;
    }
  });
}

// --- Keydown Actions ---------------------------------------------------------
function handleKeyDown(e) {
  if (e.target !== document.body && e.target !== canvas) return;
  if (e.key === 'Escape') { deselectPart(); return; }
  if (e.key === 'r' || e.key === 'R') { setAutoSpin(!controls.autoRotate); return; }
  if (e.key === 'ArrowLeft') { nudge(1); return; }
  if (e.key === 'ArrowRight') { nudge(-1); return; }

  if (e.code === 'Numpad1') { e.preventDefault(); setPresetView(e.ctrlKey ? 'back' : 'front'); return; }
  if (e.code === 'Numpad3') { e.preventDefault(); setPresetView(e.ctrlKey ? 'left' : 'right'); return; }
  if (e.code === 'Numpad7') { e.preventDefault(); setPresetView(e.ctrlKey ? 'bottom' : 'top'); return; }
  if (e.code === 'Numpad0') { e.preventDefault(); setPresetView('home'); return; }
  if (e.key === '.' && !e.ctrlKey && !e.altKey) { setPresetView('home'); return; }

  if (e.code === 'Numpad4') { e.preventDefault(); orbitStep(STEP, 0); return; }
  if (e.code === 'Numpad6') { e.preventDefault(); orbitStep(-STEP, 0); return; }
  if (e.code === 'Numpad8') { e.preventDefault(); orbitStep(0, -STEP); return; }
  if (e.code === 'Numpad2') { e.preventDefault(); orbitStep(0, STEP); return; }

  if (e.code === 'NumpadAdd') { e.preventDefault(); zoomStep(1 / 1.25); return; }
  if (e.code === 'NumpadSubtract') { e.preventDefault(); zoomStep(1.25); return; }
}
window.addEventListener('keydown', handleKeyDown);

// --- Orbit Presets and Helper Methods ----------------------------------------
const STEP = Math.PI / 12;
controls.autoRotate = false;
controls.autoRotateSpeed = 1.5;

function setAutoSpin(on) {
  controls.autoRotate = on;
  const rotateBtnAuto = document.getElementById('rotate-auto');
  if (rotateBtnAuto) rotateBtnAuto.classList.toggle('spinning', on);
  if (on) requestRender();
}
const rotateBtnAuto = document.getElementById('rotate-auto');
if (rotateBtnAuto) rotateBtnAuto.addEventListener('click', () => setAutoSpin(!controls.autoRotate));

function nudge(sign) {
  const angle = ((2 * Math.PI) / 60) * sign * 0.8;
  controls.object.position.sub(controls.target);
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const { x, z } = controls.object.position;
  controls.object.position.x = cos * x + sin * z;
  controls.object.position.z = -sin * x + cos * z;
  controls.object.position.add(controls.target);
  controls.object.lookAt(controls.target);
  requestRender();
}
const rotateBtnLeft = document.getElementById('rotate-left');
const rotateBtnRight = document.getElementById('rotate-right');
if (rotateBtnLeft) rotateBtnLeft.addEventListener('click', () => nudge(1));
if (rotateBtnRight) rotateBtnRight.addEventListener('click', () => nudge(-1));

function orbitStep(dTheta, dPhi) {
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
  const sph = new THREE.Spherical().setFromVector3(offset);
  sph.theta += dTheta;
  sph.phi = Math.max(0.01, Math.min(Math.PI - 0.01, sph.phi + dPhi));
  offset.setFromSpherical(sph);
  camera.position.copy(controls.target).add(offset);
  camera.lookAt(controls.target);
  controls.update();
  requestRender();
}

function zoomStep(factor) {
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
  const newLen = Math.max(controls.minDistance, Math.min(controls.maxDistance, dir.length() * factor));
  camera.position.copy(controls.target).addScaledVector(dir.normalize(), newLen);
  controls.update();
  requestRender();
}

function setPresetView(type) {
  if (!modelRadius) return;
  const d = modelRadius * 2.5;
  const c = modelCenter;
  const presets = {
    front: [c.x, c.y, c.z + d],
    back: [c.x, c.y, c.z - d],
    right: [c.x + d, c.y, c.z],
    left: [c.x - d, c.y, c.z],
    top: [c.x, c.y + d, c.z + d * 0.001],
    bottom: [c.x, c.y - d, c.z + d * 0.001],
    home: [initCamPos.x, initCamPos.y, initCamPos.z],
  };
  const p = presets[type];
  if (!p) return;
  camera.position.set(p[0], p[1], p[2]);
  controls.target.copy(type === 'home' ? initCamTarget : c);
  controls.update();
  requestRender();
}

let autoSpinWasOn = false;
controls.addEventListener('start', () => {
  autoSpinWasOn = controls.autoRotate;
  if (controls.autoRotate) setAutoSpin(false);
});
controls.addEventListener('end', () => {
  if (autoSpinWasOn) setAutoSpin(true);
});

// --- Part Interaction --------------------------------------------------------
function getTopLevelMesh(mesh) {
  let node = mesh;
  while (node.parent && !node.parent.isScene) {
    if (node.parent.name && node.parent.name.length > 2) return node.parent;
    node = node.parent;
  }
  return mesh;
}

function partDisplayName(mesh) {
  const node = getTopLevelMesh(mesh);
  return node.name || mesh.name || 'Unknown Part';
}

function setEmissive(mesh, hexColor, intensity) {
  if (!mesh.material) return;
  if (!mesh.userData._origMat) {
    mesh.userData._origMat = mesh.material;
    mesh.material = mesh.material.clone();
  }
  mesh.material.emissive = new THREE.Color(hexColor);
  mesh.material.emissiveIntensity = intensity;
}

function clearEmissive(mesh) {
  if (!mesh || !mesh.userData._origMat) return;
  mesh.material.dispose();
  mesh.material = mesh.userData._origMat;
  delete mesh.userData._origMat;
}

function setHoverMesh(mesh) {
  if (mesh === hoveredMesh) return;
  if (hoveredMesh && hoveredMesh !== selectedMesh) clearEmissive(hoveredMesh);
  hoveredMesh = mesh;
  if (mesh && mesh !== selectedMesh) setEmissive(mesh, 0xffffff, 0.06);
  requestRender();
}

function selectPart(mesh) {
  if (selectedMesh === mesh) return;
  if (selectedMesh) clearEmissive(selectedMesh);
  selectedMesh = mesh;
  if (!mesh) { hideInfoPanel(); return; }
  setEmissive(mesh, 0xffcd00, 0.18);
  showInfoPanel(mesh);
  requestRender();
}

function deselectPart() {
  if (selectedMesh) {
    clearEmissive(selectedMesh);
    selectedMesh = null;
  }
  hideInfoPanel();
  requestRender();
}

function showInfoPanel(mesh) {
  const name = partDisplayName(mesh);
  const info = getPartInfo(name);
  const zone = ZONES[info.zone] || ZONES.structure;

  if (infoBadge) {
    infoBadge.textContent = zone.label;
    infoBadge.style.background = zone.color + '22';
    infoBadge.style.borderColor = zone.color + '55';
    infoBadge.style.color = zone.color;
    infoBadge.className = 'zone-badge';
  }

  if (infoName) infoName.textContent = info.name;
  if (infoDesc) infoDesc.textContent = info.desc;

  if (infoSpecsTbody) {
    infoSpecsTbody.innerHTML = '';
    const entries = Object.entries(info.specs);
    if (entries.length) {
      for (const [k, v] of entries) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="spec-key">${k}</td><td class="spec-val">${v}</td>`;
        infoSpecsTbody.appendChild(tr);
      }
    }
  }

  if (infoPanel) infoPanel.classList.add('open');
}

// Hover overlays
function hideInfoPanel() {
  if (infoPanel) infoPanel.classList.remove('open');
}

function onPointerMove(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  if (allMeshes.length === 0) return;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(allMeshes);

  if (hits.length > 0) {
    const hit = hits[0].object;
    setHoverMesh(hit);
    const name = partDisplayName(hit);
    if (hoverLabel) {
      hoverLabel.textContent = name;
      hoverLabel.style.display = 'block';
      hoverLabel.style.left = e.clientX + 'px';
      hoverLabel.style.top = e.clientY + 'px';
    }
  } else {
    setHoverMesh(null);
    if (hoverLabel) hoverLabel.style.display = 'none';
  }
}

function onCanvasClick(e) {
  const dx = e.clientX - pointerDownX;
  const dy = e.clientY - pointerDownY;
  if (Math.sqrt(dx * dx + dy * dy) > 5) return;

  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(allMeshes);

  if (hits.length > 0) {
    selectPart(hits[0].object);
  } else {
    deselectPart();
  }
}

// --- Render Loop (On-Demand & Animating) -------------------------------------
let renderNeeded = false;
function requestRender() { renderNeeded = true; }

let turboAngle = 0;

function animate() {
  if (!isRunning) return;
  animationFrameId = requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // Pulse selected part highlight
  if (selectedMesh && selectedMesh.material && selectedMesh.userData._origMat) {
    const pulse = 0.14 + 0.08 * Math.sin(elapsed * 3.5);
    selectedMesh.material.emissiveIntensity = pulse;
    requestRender();
  }

  // Smooth camera preset lerps
  if (targetCamPos && targetLookAt) {
    camera.position.lerp(targetCamPos, 0.08);
    controls.target.lerp(targetLookAt, 0.08);
    controls.update();
    requestRender();
    if (camera.position.distanceTo(targetCamPos) < 1.0 && controls.target.distanceTo(targetLookAt) < 1.0) {
      targetCamPos = null;
      targetLookAt = null;
    }
  }

  // Explode view transitions
  const explodeDiff = targetExplode - currentExplode;
  if (Math.abs(explodeDiff) > 0.0002) {
    currentExplode += explodeDiff * Math.min(1, delta * 10);
    for (const part of explodeParts) {
      part.obj.position.copy(part.home).addScaledVector(part.dir, currentExplode * EXPLODE_SCALE);
    }
    explodeSettled = false;
    requestRender();
  } else if (!explodeSettled) {
    currentExplode = targetExplode;
    for (const part of explodeParts) {
      part.obj.position.copy(part.home).addScaledVector(part.dir, currentExplode * EXPLODE_SCALE);
    }
    renderer.shadowMap.needsUpdate = true;
    explodeSettled = true;
    requestRender();
  }

  // Continuous physics animations based on engine RPM
  if (pistonMeshes.length > 0) {
    const speed = (APP.rpm * Math.PI) / 60 * 0.08;
    pistonMeshes.forEach((p, idx) => {
      const offset = (idx * Math.PI * 2) / 6;
      p.mesh.position.y = p.homeY + Math.sin(elapsed * speed + offset) * 15;
    });
    requestRender();
  }

  if (turboMeshes.length > 0) {
    const turboSpeed = (APP.rpm / 60) * 0.02;
    turboMeshes.forEach((mesh) => {
      mesh.rotation.y += turboSpeed;
    });
    requestRender();
  }

  if (crankMeshes.length > 0) {
    const crankSpeed = (APP.rpm / 60) * 0.02;
    crankMeshes.forEach((mesh) => {
      mesh.rotation.x += crankSpeed;
    });
    requestRender();
  }

  // Handle particle system updates
  if (leakPts) {
    tickParticles();
    requestRender();
  }

  // Zone pulsing emissive light animation
  pulseMats(APP.activeLeak, elapsed);

  // Drive gizmo camera snaps
  const wasAnimating = viewHelper.animating;
  if (viewHelper.animating) {
    viewHelper.update(delta);
    requestRender();
  }
  if (wasAnimating && !viewHelper.animating) {
    controls.enabled = true;
  }

  const moved = controls.update();
  if (moved || renderNeeded) {
    viewHelper.center.copy(controls.target);
    renderer.clear();
    renderer.render(scene, camera);
    viewHelper.render(renderer);
    renderNeeded = false;
  }
}
animate();

// --- Window Resize -----------------------------------------------------------
function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  requestRender();
}
window.addEventListener('resize', handleResize);

// --- Component Cleanup Export -----------------------------------------------
export function cleanup() {
  isRunning = false;
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (demoInterval) clearInterval(demoInterval);
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('resize', handleResize);
  canvas.removeEventListener('pointermove', onPointerMove);
  canvas.removeEventListener('click', onCanvasClick);
  if (infoPanelClose) infoPanelClose.removeEventListener('click', deselectPart);

  clearLeakParticles();

  // Dispose Geometries and Materials
  allMeshes.forEach(mesh => {
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach(m => m.dispose());
      else mesh.material.dispose();
    }
  });

  ground.geometry.dispose();
  ground.material.dispose();
  grid.dispose();

  renderer.dispose();
}

