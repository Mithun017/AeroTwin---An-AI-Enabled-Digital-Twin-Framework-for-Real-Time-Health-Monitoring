
    'use strict';

    // ═══════════════════════════════════════════════
    // ALL STATE VARIABLES — DECLARED FIRST (fixes hoisting bugs)
    // ═══════════════════════════════════════════════
    const PART_COUNT = 260;
    let leakPts = null;          // leak particle system — declared before any function uses it
    let currentModel = 1;
    let modelData = null;
    let turboAngle = 0;
    let flowOffset = 0;

    const APP = {
      activeLeak: null, severity: 2, rpm: 1800, load: 75,
      activeZone: null, autoRot: true, demo: false, explode: false
    };

    // C18 torque curve from spec sheet PDF
    const TQ_TABLE = { 1100: 2848, 1200: 3120, 1300: 3609, 1400: 3656, 1500: 3564, 1600: 3446, 1700: 3315, 1800: 3165, 1900: 2998, 2000: 2848, 2100: 2713 };
    const PW_TABLE = { 1100: 328, 1200: 392, 1300: 491, 1400: 536, 1500: 560, 1600: 577, 1700: 590, 1800: 597, 1900: 597, 2000: 597, 2100: 597 };

    // ═══════════════════════════════════════════════
    // BOOT SEQUENCE
    // ═══════════════════════════════════════════════
    const BOOT_MSGS = ['Initializing WebGL renderer...', 'Loading Aero Engine geometry...', 'Calibrating digital twin zones...', 'Computing energy field baseline...', 'Validating physics model...', 'System ready.'];
    let bi = 0, bp = 0;
    const bpEl = document.getElementById('bp'), bmEl = document.getElementById('bm');
    const bootT = setInterval(() => {
      bp += 17; bpEl.style.width = Math.min(100, bp) + '%';
      bmEl.textContent = BOOT_MSGS[Math.min(bi++, BOOT_MSGS.length - 1)];
      if (bp >= 100) { clearInterval(bootT); setTimeout(() => document.getElementById('boot').classList.add('out'), 600); }
    }, 220);

    // ═══════════════════════════════════════════════
    // RENDERER SETUP
    // ═══════════════════════════════════════════════
    const cvs = document.getElementById('cv');
    const cwrap = document.getElementById('cw');
    const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(0x010203, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x010203, 0.038);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 200);
    camera.position.set(12, 7, 16);

    // Flow canvas
    const fCvs = document.getElementById('fc');
    const fctx = fCvs.getContext('2d');

    function resizeAll() {
      const W = cwrap.clientWidth, H = cwrap.clientHeight;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      fCvs.width = W; fCvs.height = H;
    }
    resizeAll();
    window.addEventListener('resize', resizeAll);

    // ═══════════════════════════════════════════════
    // LIGHTS
    // ═══════════════════════════════════════════════
    const keyL = new THREE.DirectionalLight(0xfff8f0, 2.5);
    keyL.position.set(10, 18, 8); keyL.castShadow = true;
    keyL.shadow.mapSize.set(4096, 4096);
    keyL.shadow.camera.near = 0.5; keyL.shadow.camera.far = 60;
    keyL.shadow.camera.left = keyL.shadow.camera.bottom = -14;
    keyL.shadow.camera.right = keyL.shadow.camera.top = 14;
    keyL.shadow.bias = -0.0015; scene.add(keyL);

    const fillL = new THREE.PointLight(0x2255ff, 0.9, 55); fillL.position.set(-9, 4, 8); scene.add(fillL);
    const rimL = new THREE.PointLight(0xff5500, 1.2, 30); rimL.position.set(8, 3, -10); scene.add(rimL);
    const underL = new THREE.PointLight(0x0a1535, 0.6, 22); underL.position.set(0, -5, 0); scene.add(underL);
    const hemiL = new THREE.HemisphereLight(0x112244, 0x040810, 0.45); scene.add(hemiL);
    const accentL = new THREE.PointLight(0xF5C518, 0, 18); accentL.position.set(0, 5, 2); scene.add(accentL);
    const leakL = new THREE.PointLight(0xff2244, 0, 12); scene.add(leakL);

    // ═══════════════════════════════════════════════
    // ROTAX 915 iS DIGITAL TWIN 3D ENGINE MODEL
    // Horizontally-opposed 4-cylinder turbocharged aircraft engine
    // Reduction gearbox, dual-lane EFI, dry-sump oiling, intercooler
    // ═══════════════════════════════════════════════

    const COL = {
      bg: 0x01030a,
      metal: 0x8b93a0,
      metalDark: 0x565d68,
      head: 0x6d7480,
      fin: 0x454b55,
      turbo: 0x3f4552,
      hot: 0x8a3a2a,
      cyan: 0x00FFE0,
      amber: 0xffb020,
      green: 0x3ddc84,
      red: 0xff2244,
      black: 0x0c0f14,
      brass: 0xb08a4e,
      intake: 0x2b3340
    };

    function mat(color, opts = {}) {
      return new THREE.MeshStandardMaterial({
        color: color,
        metalness: opts.metalness !== undefined ? opts.metalness : 0.65,
        roughness: opts.roughness !== undefined ? opts.roughness : 0.4,
        ...opts.extra
      });
    }

    function ms(c, r, m, o = {}) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, envMapIntensity: 0.8, ...o }); }
    function me(c, r, m, e, ei) { return new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, emissive: e, emissiveIntensity: ei, envMapIntensity: 0.6 }); }

    const MAT = {
      blk: ms(0x3c3a2e, 0.78, 0.65), blkS: ms(0x2e2c22, 0.88, 0.5),
      hd: ms(0x7a7860, 0.52, 0.75), hdF: ms(0x686852, 0.58, 0.65),
      vc: ms(0x888870, 0.44, 0.78), pst: ms(0xb0a898, 0.32, 0.82),
      rng: ms(0xb8b0a0, 0.18, 0.96), crk: ms(0x585848, 0.24, 0.90),
      op: ms(0x1a1812, 0.92, 0.25), blt: ms(0x888878, 0.26, 0.94),
      itk: me(0x1a5c3c, 0.38, 0.58, 0x0d3020, 0.1),
      bst: me(0x1a3d72, 0.28, 0.75, 0x0a1840, 0.15),
      exh: me(0x6e2a12, 0.48, 0.62, 0x3a0e05, 0.3),
      trb: ms(0x7a7060, 0.25, 0.90), tbl: ms(0xc8c0a8, 0.15, 0.97),
      ttb: ms(0xb08060, 0.22, 0.88), dpf: ms(0x2a2218, 0.88, 0.32),
      fr: me(0xc08828, 0.25, 0.94, 0x804008, 0.08),
      fl: me(0x223060, 0.55, 0.38, 0x081228, 0.05),
      inj: me(0xa06818, 0.28, 0.90, 0x603808, 0.06),
      ab: ms(0x222c1e, 0.82, 0.28), sen: ms(0xc04020, 0.32, 0.78),
      ecu: ms(0x181820, 0.75, 0.42), cl: me(0x1a3a5a, 0.5, 0.3, 0x0a1a2a, 0.05),
      hpp: ms(0x5a5848, 0.38, 0.78),
    };

    // ═══════════════════════════════════════════════
    // SCENE GROUPS & METADATA
    // ═══════════════════════════════════════════════
    const EG = new THREE.Group(); scene.add(EG);
    const ZP = { 1: [], 2: [], 3: [], 4: [] };
    const ORIG = new Map();
    const PARTS = [];

    const BX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const CY = (rt, rb, h, s = 18) => new THREE.CylinderGeometry(rt, rb, h, s);
    const SP = (r, sw = 16, sh = 12) => new THREE.SphereGeometry(r, sw, sh);
    const TR = (R, r, ts = 8, rs = 32) => new THREE.TorusGeometry(R, r, ts, rs);

    function addBoltRing(parentGroup, center, radius, count, axis = 'x', boltRadius = 0.028, boltLen = 0.09) {
      const boltMat = mat(COL.black, { roughness: 0.5, metalness: 0.6 });
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(boltRadius, boltRadius, boltLen, 6), boltMat);
        let x = center.x, y = center.y, z = center.z;
        if (axis === 'x') {
          y += Math.cos(a) * radius; z += Math.sin(a) * radius;
          bolt.rotation.z = Math.PI / 2;
        } else if (axis === 'y') {
          x += Math.cos(a) * radius; z += Math.sin(a) * radius;
        } else {
          x += Math.cos(a) * radius; y += Math.sin(a) * radius;
          bolt.rotation.x = Math.PI / 2;
        }
        bolt.position.set(x, y, z);
        parentGroup.add(bolt);
      }
    }

    function registerPart(group, name, desc, explodeDir, zone = 0) {
      group.userData.__assembledPos = group.position.clone();
      group.userData.__explodeDir = explodeDir ? explodeDir.clone() : group.position.clone().normalize();
      group.userData.__name = name;
      group.userData.__desc = desc;
      group.userData.__zone = zone;
      group.traverse(o => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.userData.__partRef = group;
        }
      });
      EG.add(group);
      ORIG.set(group, group.position.clone());
      PARTS.push(group);
      if (zone > 0 && ZP[zone]) {
        ZP[zone].push(group);
      }
      return group;
    }

    function addMesh(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, zone = 0, shadow = true) {
      const m = new THREE.Mesh(geo, mat instanceof THREE.Material ? mat.clone() : mat);
      m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
      if (shadow) { m.castShadow = true; m.receiveShadow = true; }
      EG.add(m); ORIG.set(m, m.position.clone());
      if (zone > 0 && ZP[zone]) ZP[zone].push(m);
      return m;
    }

    // ═══════════════════════════════════════════════
    // PARTICLE FUNCTIONS
    // ═══════════════════════════════════════════════
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
        positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.4;
        positions[i * 3 + 1] = pos.y + (Math.random() - 0.5) * 0.3;
        positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.4;
        vel.push({ x: (Math.random() - 0.5) * 0.058, y: Math.random() * 0.08 + 0.01, z: (Math.random() - 0.5) * 0.058 });
        life.push({ v: Math.random(), max: 0.7 + Math.random() * 1.1 });
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: new THREE.Color(hex), size: 0.11, transparent: true,
        opacity: 0.9, sizeAttenuation: true, depthWrite: false,
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
        leakPts.life[i].v -= 0.012;
        if (leakPts.life[i].v < 0) {
          leakPts.life[i].v = leakPts.life[i].max;
          arr[i * 3] = leakPts.pos.x + (Math.random() - 0.5) * 0.45;
          arr[i * 3 + 1] = leakPts.pos.y + (Math.random() - 0.5) * 0.3;
          arr[i * 3 + 2] = leakPts.pos.z + (Math.random() - 0.5) * 0.45;
        }
        arr[i * 3] += leakPts.vel[i].x;
        arr[i * 3 + 1] += leakPts.vel[i].y;
        arr[i * 3 + 2] += leakPts.vel[i].z;
        leakPts.vel[i].y *= 0.993;
      }
      leakPts.geo.attributes.position.needsUpdate = true;
      leakPts.pts.material.opacity = 0.55 + 0.35 * Math.sin(t * 3.5);
    }

    // ═══════════════════════════════════════════════
    // SCENE CLEAR
    // ═══════════════════════════════════════════════
    function clearScene() {
      clearLeakParticles();
      while (EG.children.length) {
        const c = EG.children[0];
        c.traverse(o => {
          if (o.geometry) o.geometry.dispose();
          if (o.material) {
            if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
            else o.material.dispose();
          }
        });
        EG.remove(c);
      }
      const toRem = [];
      scene.children.forEach(c => {
        if (![keyL, fillL, rimL, underL, hemiL, accentL, leakL, EG].includes(c)) toRem.push(c);
      });
      toRem.forEach(c => scene.remove(c));
      ZP[1] = []; ZP[2] = []; ZP[3] = []; ZP[4] = [];
      ORIG.clear();
      PARTS.length = 0;
    }

    // ═══════════════════════════════════════════════
    // BUILD MODEL 1 — Rotax 915 iS Full Aircraft Engine
    // ═══════════════════════════════════════════════
    function buildModel1() {
      let propGroup = null;
      let turboSpinnerGroup = null;

      // 1. Crankcase (central spine)
      {
        const g = new THREE.Group();
        const caseGeo = CY(0.62, 0.62, 2.1, 20);
        const caseMesh = new THREE.Mesh(caseGeo, mat(COL.metal, { roughness: 0.35 }));
        caseMesh.rotation.z = Math.PI / 2;
        g.add(caseMesh);
        const sumpGeo = BX(1.7, 0.55, 0.9);
        const sump = new THREE.Mesh(sumpGeo, mat(COL.metalDark, { roughness: 0.5 }));
        sump.position.set(0, -0.75, 0);
        g.add(sump);
        const pulley = new THREE.Mesh(CY(0.28, 0.28, 0.18, 24), mat(COL.black, { roughness: 0.6 }));
        pulley.rotation.z = Math.PI / 2;
        pulley.position.set(1.15, 0, 0);
        g.add(pulley);
        registerPart(g, 'Crankcase Assembly', 'Central housing for crankshaft, dry-sump oil gallery and case sensors. Structural core of Rotax 915 iS digital twin.', new THREE.Vector3(0, 0, 0), 0);
      }

      // 2. Cylinder banks (2 x 2, horizontally-opposed boxer layout)
      function buildCylinder(side, index) {
        const g = new THREE.Group();
        const dir = side === 'L' ? -1 : 1;
        const zOff = index === 0 ? -0.55 : 0.55;

        const barrel = new THREE.Mesh(CY(0.34, 0.36, 0.85, 16), mat(COL.fin, { roughness: 0.55 }));
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(dir * 1.05, 0, 0);
        g.add(barrel);

        for (let i = 0; i < 6; i++) {
          const finGeo = TR(0.4, 0.025, 6, 20);
          const fin = new THREE.Mesh(finGeo, mat(COL.fin, { roughness: 0.6, metalness: 0.5 }));
          fin.rotation.y = Math.PI / 2;
          fin.position.set(dir * (0.72 + i * 0.11), 0, 0);
          g.add(fin);
        }

        const head = new THREE.Mesh(BX(0.42, 0.62, 0.62), mat(COL.head, { roughness: 0.4 }));
        head.position.set(dir * 1.62, 0, 0);
        g.add(head);
        addBoltRing(g, { x: dir * 1.4, y: 0, z: 0 }, 0.34, 6, 'x', 0.022, 0.07);

        const baseFlange = new THREE.Mesh(CY(0.42, 0.42, 0.06, 16), mat(COL.metalDark, { roughness: 0.5 }));
        baseFlange.rotation.z = Math.PI / 2;
        baseFlange.position.set(dir * 0.5, 0, 0);
        g.add(baseFlange);
        addBoltRing(g, { x: dir * 0.5, y: 0, z: 0 }, 0.4, 5, 'x', 0.02, 0.06);

        // Dual spark plugs (redundant dual-lane ignition)
        const plug = new THREE.Mesh(CY(0.045, 0.045, 0.24, 8), mat(COL.brass, { roughness: 0.3, metalness: 0.8 }));
        plug.position.set(dir * 1.62, 0.35, 0.12);
        g.add(plug);
        const plug2 = new THREE.Mesh(CY(0.045, 0.045, 0.24, 8), mat(COL.brass, { roughness: 0.3, metalness: 0.8 }));
        plug2.position.set(dir * 1.62, 0.35, -0.12);
        g.add(plug2);

        g.position.set(0, 0.25, zOff);
        registerPart(
          g,
          `Cylinder ${side}${index + 1}`,
          `Air-cooled barrel / liquid-cooled head, boxer position ${side}${index + 1}. Instrumented for CHT, EGT, injection timing and knock/vibration monitoring.`,
          new THREE.Vector3(dir * 1.6, 0.3, zOff * 1.4),
          0
        );
      }
      buildCylinder('L', 0); buildCylinder('L', 1);
      buildCylinder('R', 0); buildCylinder('R', 1);

      // 3. Reduction Gearbox (front reduction drive)
      {
        const g = new THREE.Group();
        const box = new THREE.Mesh(CY(0.58, 0.58, 0.5, 20), mat(COL.metal, { roughness: 0.3 }));
        box.rotation.z = Math.PI / 2;
        g.add(box);
        const flange = new THREE.Mesh(CY(0.4, 0.42, 0.12, 20), mat(COL.metalDark, { roughness: 0.4 }));
        flange.rotation.z = Math.PI / 2;
        flange.position.set(0.32, 0, 0);
        g.add(flange);
        addBoltRing(g, { x: 0.32, y: 0, z: 0 }, 0.36, 8, 'x', 0.022, 0.08);
        const shaft = new THREE.Mesh(CY(0.1, 0.1, 0.55, 12), mat(COL.black, { roughness: 0.5 }));
        shaft.rotation.z = Math.PI / 2;
        shaft.position.set(0.68, 0, 0);
        g.add(shaft);
        g.position.set(-1.55, 0, 0);
        registerPart(g, 'Reduction Gearbox', 'Integrated propeller reduction drive (i=2.43). Torsional vibration and gear-mesh signature feed AI anomaly detection.', new THREE.Vector3(-2.8, 0, 0), 0);
      }

      // 4. Propeller Reduction Output & Spinner Assembly
      {
        const g = new THREE.Group();
        propGroup = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 18), mat(0xb8c0c9, { roughness: 0.2, metalness: 0.85 }));
        hub.rotation.z = -Math.PI / 2;
        propGroup.add(hub);
        const bladeMat = mat(0x2b2f36, { roughness: 0.4, metalness: 0.3 });
        for (let i = 0; i < 3; i++) {
          const blade = new THREE.Mesh(BX(0.05, 0.9, 0.14), bladeMat);
          blade.position.set(-0.05, 0.5, 0);
          const pivot = new THREE.Group();
          pivot.add(blade);
          pivot.rotation.x = (i / 3) * Math.PI * 2;
          propGroup.add(pivot);
        }
        g.add(propGroup);
        g.position.set(-2.1, 0, 0);
        registerPart(g, 'Propeller Hub Assembly', 'Output-side propeller hub driven by reduction gearbox. Rotates in real-time proportional to engine RPM.', new THREE.Vector3(-3.6, 0, 0), 0);
      }

      // 5. Turbocharger (HP & LP)
      {
        const g = new THREE.Group();
        turboSpinnerGroup = new THREE.Group();

        const housing = new THREE.Mesh(SP(0.34, 20, 16), mat(COL.turbo, { roughness: 0.4, metalness: 0.75 }));
        g.add(housing);

        // Compressor housing (Zone 2 - Boost/Charge Air)
        const compressorHousing = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.42, 16), mat(0x9aa2ad, { roughness: 0.25, metalness: 0.85 }));
        compressorHousing.rotation.z = -Math.PI / 2;
        compressorHousing.position.set(0.4, 0, 0);
        g.add(compressorHousing);

        // Turbine housing (Zone 3 - Hot Exhaust)
        const turbineHousing = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.4, 16), mat(COL.hot, { roughness: 0.5, metalness: 0.5 }));
        turbineHousing.rotation.z = Math.PI / 2;
        turbineHousing.position.set(-0.38, 0, 0);
        g.add(turbineHousing);

        // Internal spinner impellers
        for (let b = 0; b < 8; b++) {
          const imp = new THREE.Mesh(BX(0.03, 0.24, 0.05), mat(COL.cyan, { metalness: 0.9, roughness: 0.2 }));
          imp.position.set(0.35, Math.sin(b / 8 * Math.PI * 2) * 0.15, Math.cos(b / 8 * Math.PI * 2) * 0.15);
          imp.rotation.x = b / 8 * Math.PI * 2;
          turboSpinnerGroup.add(imp);
        }
        g.add(turboSpinnerGroup);

        g.position.set(0.4, -0.85, 0.75);
        registerPart(g, 'Turbocharger', 'Single turbocharger providing altitude boost compensation. Monitored for EGT, turbine pressure ratio and compressor speed.', new THREE.Vector3(0.9, -1.9, 1.7), 2);
        ZP[3].push(g); // Dual-mapped to Zone 2 (boost) & Zone 3 (exhaust)
      }

      // 6. Wastegate Actuator
      {
        const g = new THREE.Group();
        const canister = new THREE.Mesh(CY(0.1, 0.1, 0.2, 14), mat(0x6b7280, { roughness: 0.35, metalness: 0.6 }));
        canister.rotation.z = Math.PI / 2;
        g.add(canister);
        const rod = new THREE.Mesh(CY(0.012, 0.012, 0.28, 8), mat(0x8b93a0, { roughness: 0.25, metalness: 0.85 }));
        rod.rotation.z = Math.PI / 2;
        rod.position.set(-0.24, 0, 0);
        g.add(rod);
        g.position.set(0.75, -1.15, 0.35);
        registerPart(g, 'Wastegate Actuator', 'Pneumatic boost-control actuator regulating turbine exhaust bypass. Actuator drift is an early indicator for boost loss.', new THREE.Vector3(1.7, -2.35, 0.8), 3);
      }

      // 7. Intercooler (Charge-Air Cooler)
      {
        const g = new THREE.Group();
        const core = new THREE.Mesh(BX(1.3, 0.4, 0.28), mat(0x39424e, { roughness: 0.5 }));
        g.add(core);
        for (let i = -5; i <= 5; i++) {
          const fin = new THREE.Mesh(BX(0.02, 0.36, 0.26), mat(0x2b323c, { roughness: 0.6 }));
          fin.position.set(i * 0.11, 0, 0);
          g.add(fin);
        }
        const tankL = new THREE.Mesh(CY(0.15, 0.15, 0.3, 12), mat(0x4a5460, { roughness: 0.4, metalness: 0.7 }));
        tankL.position.set(-0.7, 0, 0); tankL.rotation.z = Math.PI / 2; g.add(tankL);
        const tankR = new THREE.Mesh(CY(0.15, 0.15, 0.3, 12), mat(0x4a5460, { roughness: 0.4, metalness: 0.7 }));
        tankR.position.set(0.7, 0, 0); tankR.rotation.z = Math.PI / 2; g.add(tankR);

        g.position.set(0, 0.95, 0.85);
        registerPart(g, 'Intercooler (CAC)', 'Charge-air cooling core; efficiency loss appears directly as CAC outlet temperature and manifold pressure anomalies.', new THREE.Vector3(0, 2.1, 1.9), 2);
      }

      // 8. Electronic Throttle Body
      {
        const g = new THREE.Group();
        const bore = new THREE.Mesh(CY(0.16, 0.16, 0.24, 16), mat(0x707880, { roughness: 0.3, metalness: 0.8 }));
        bore.rotation.z = Math.PI / 2;
        g.add(bore);
        const butterfly = new THREE.Mesh(CY(0.14, 0.14, 0.015, 16), mat(0x2b323c, { roughness: 0.4, metalness: 0.6 }));
        butterfly.rotation.x = Math.PI / 5;
        g.add(butterfly);
        const actuator = new THREE.Mesh(BX(0.14, 0.12, 0.1), mat(0x23282f, { roughness: 0.5 }));
        actuator.position.set(0, 0.18, 0);
        g.add(actuator);
        g.position.set(0, 0.78, 0.55);
        registerPart(g, 'Electronic Throttle Body', 'Drive-by-wire throttle metering charge air to intake plenum. Monitored for TPS divergence and rapid transients.', new THREE.Vector3(0, 1.75, 1.3), 2);
      }

      // 9. Intake Plenum & Runners
      {
        const g = new THREE.Group();
        const plenum = new THREE.Mesh(CY(0.22, 0.28, 1.5, 14), mat(COL.intake, { roughness: 0.4 }));
        plenum.rotation.z = Math.PI / 2;
        g.add(plenum);
        [-0.55, 0.55].forEach(z => {
          [-0.7, 0.7].forEach(x => {
            const runner = new THREE.Mesh(CY(0.07, 0.07, 0.65, 8), mat(COL.intake, { roughness: 0.45 }));
            runner.position.set(x, -0.22, z);
            runner.rotation.z = x < 0 ? Math.PI / 4 : -Math.PI / 4;
            g.add(runner);
          });
        });
        g.position.set(0, 0.62, -0.85);
        registerPart(g, 'Intake Plenum & Runners', 'Distributes pressurized charge air to all four boxer cylinder heads; instrumented with MAP / MAT digital twin channels.', new THREE.Vector3(0, 1.5, -1.9), 2);
      }

      // 10. Air Intake Scoop & Airflow Meter (Zone 1 - Intake)
      {
        const g = new THREE.Group();
        const scoop = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 16, 1, true), mat(0x2b3340, { roughness: 0.55, metalness: 0.3, extra: { side: THREE.DoubleSide } }));
        scoop.rotation.z = Math.PI / 2;
        g.add(scoop);
        const filterElement = new THREE.Mesh(CY(0.22, 0.22, 0.16, 16), mat(0x8a6a3a, { roughness: 0.7 }));
        filterElement.rotation.z = Math.PI / 2;
        filterElement.position.set(0.28, 0, 0);
        g.add(filterElement);
        const mafHousing = new THREE.Mesh(CY(0.18, 0.18, 0.32, 12), mat(0x222c1e, { roughness: 0.6 }));
        mafHousing.rotation.z = Math.PI / 2;
        mafHousing.position.set(-0.35, 0, 0);
        g.add(mafHousing);
        const mafSensor = new THREE.Mesh(SP(0.08, 10, 8), mat(COL.red, { roughness: 0.3, metalness: 0.8 }));
        mafSensor.position.set(-0.35, 0.2, 0);
        g.add(mafSensor);
        const duct = new THREE.Mesh(CY(0.14, 0.14, 0.75, 10), mat(0x1a2218, { roughness: 0.65 }));
        duct.position.set(0.2, -0.35, 0.6);
        duct.rotation.x = Math.PI / 4;
        g.add(duct);

        g.position.set(0, 0.62, -1.35);
        registerPart(g, 'Air Intake Scoop & MAF Filter', 'Ram-air intake scoop with pleated element and mass airflow (MAF) meter feeding turbo compressor. Zone 1 leak detection target.', new THREE.Vector3(0, 1.5, -2.9), 1);
      }

      // 11. Exhaust Manifold (Zone 3 - Exhaust)
      {
        const g = new THREE.Group();
        const pts = [
          new THREE.Vector3(-1.4, 0.15, -0.55),
          new THREE.Vector3(-0.8, -0.35, -0.3),
          new THREE.Vector3(0.0, -0.65, 0.2),
          new THREE.Vector3(0.4, -0.85, 0.75)
        ];
        const curve = new THREE.CatmullRomCurve3(pts);
        const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.095, 10, false);
        const tube = new THREE.Mesh(tubeGeo, mat(COL.hot, { roughness: 0.6, metalness: 0.4 }));
        g.add(tube);

        const ptsR = [
          new THREE.Vector3(1.4, 0.15, 0.55),
          new THREE.Vector3(0.9, -0.35, 0.5),
          new THREE.Vector3(0.4, -0.85, 0.75)
        ];
        const curveR = new THREE.CatmullRomCurve3(ptsR);
        const tubeR = new THREE.Mesh(new THREE.TubeGeometry(curveR, 24, 0.09, 8, false), mat(COL.hot, { roughness: 0.6, metalness: 0.4 }));
        g.add(tubeR);

        registerPart(g, 'Exhaust Manifold', 'Thermal-resistant stainless manifold collecting hot combustion gas from all 4 cylinders to turbo turbine. Zone 3 leak monitoring.', new THREE.Vector3(0.4, -1.7, 1.0), 3);
      }

      // 12. Exhaust Muffler / Tailpipe Outlet (Zone 3)
      {
        const g = new THREE.Group();
        const body = new THREE.Mesh(CY(0.16, 0.16, 0.65, 16), mat(0x4a4038, { roughness: 0.6, metalness: 0.5 }));
        body.rotation.z = Math.PI / 2;
        g.add(body);
        const tip = new THREE.Mesh(CY(0.11, 0.13, 0.28, 14), mat(0x8b93a0, { roughness: 0.25, metalness: 0.8 }));
        tip.rotation.z = Math.PI / 2;
        tip.position.set(0.44, 0, 0);
        g.add(tip);
        g.position.set(1.15, -1.0, 1.35);
        registerPart(g, 'Exhaust Outlet & Muffler', 'Post-turbine exhaust silencer and tailpipe. Monitored for backpressure and aftertreatment thermal profile.', new THREE.Vector3(2.3, -1.9, 2.6), 3);
      }

      // 13. Dry-Sump Oil Tank
      {
        const g = new THREE.Group();
        const tank = new THREE.Mesh(CY(0.24, 0.24, 0.6, 16), mat(0x556270, { roughness: 0.45 }));
        g.add(tank);
        const cap = new THREE.Mesh(CY(0.12, 0.12, 0.05, 12), mat(COL.amber, { roughness: 0.3 }));
        cap.position.set(0, 0.32, 0);
        g.add(cap);
        g.position.set(-0.95, 0.55, -0.85);
        registerPart(g, 'Dry-Sump Oil Tank', 'External oil reservoir for dry-sump lubrication. Oil pressure and temperature trends feed lubrication health index.', new THREE.Vector3(-2.0, 1.3, -1.7), 0);
      }

      // 14. Oil Cooler
      {
        const g = new THREE.Group();
        const core = new THREE.Mesh(BX(0.7, 0.34, 0.22), mat(0x3d4550, { roughness: 0.5 }));
        g.add(core);
        for (let i = -6; i <= 6; i++) {
          const fin = new THREE.Mesh(BX(0.014, 0.3, 0.2), mat(0x2b323c, { roughness: 0.6 }));
          fin.position.set(i * 0.05, 0, 0);
          g.add(fin);
        }
        g.position.set(-0.75, 0.95, 0.9);
        registerPart(g, 'Oil Cooler', 'Air-cooled heat exchanger in dry-sump circuit. Cooling degradation triggers predictive lubrication alerts.', new THREE.Vector3(-1.7, 2.05, 1.95), 0);
      }

      // 15. Oil Filter Canister
      {
        const g = new THREE.Group();
        const canister = new THREE.Mesh(CY(0.13, 0.13, 0.34, 16), mat(0x8a4a2e, { roughness: 0.4, metalness: 0.5 }));
        g.add(canister);
        const cap = new THREE.Mesh(CY(0.14, 0.14, 0.04, 16), mat(0x2b323c, { roughness: 0.5 }));
        cap.position.set(0, 0.19, 0);
        g.add(cap);
        g.position.set(-0.85, -0.35, -0.75);
        registerPart(g, 'Oil Filter Canister', 'Full-flow spin-on oil filter. Differential pressure bypass monitored as a lubrication indicator.', new THREE.Vector3(-1.85, -0.75, -1.6), 0);
      }

      // 16. Fuel Pump & Injector Rail (Zone 4 - Fuel System)
      {
        const g = new THREE.Group();
        const pump = new THREE.Mesh(CY(0.11, 0.11, 0.26, 12), mat(0x4a5460, { roughness: 0.4, metalness: 0.7 }));
        pump.rotation.z = Math.PI / 2;
        pump.position.set(-0.6, 0, 0);
        g.add(pump);
        const rail = new THREE.Mesh(CY(0.035, 0.035, 1.5, 10), mat(COL.brass, { roughness: 0.25, metalness: 0.9 }));
        rail.rotation.z = Math.PI / 2;
        g.add(rail);
        for (let i = -1; i <= 1; i += 2) {
          const inj = new THREE.Mesh(CY(0.03, 0.03, 0.16, 8), mat(COL.brass, { roughness: 0.3, metalness: 0.8 }));
          inj.position.set(i * 0.55, -0.1, 0);
          g.add(inj);
        }
        const fps = new THREE.Mesh(SP(0.06, 8, 8), mat(COL.red, { roughness: 0.3, metalness: 0.8 }));
        fps.position.set(0.65, 0.1, 0);
        g.add(fps);

        g.position.set(0, 0.55, 0.42);
        registerPart(g, 'Fuel Pump & Injector Rail', 'Redundant dual-lane electronic fuel injection supply rail. Fuel rail leak is a critical fire hazard alert (Zone F).', new THREE.Vector3(0, 1.35, 1.05), 4);
      }

      // 17. Fuel Filter (Zone 4)
      {
        const g = new THREE.Group();
        const body = new THREE.Mesh(CY(0.08, 0.08, 0.22, 12), mat(0x4a5460, { roughness: 0.35, metalness: 0.7 }));
        body.rotation.z = Math.PI / 2;
        g.add(body);
        g.position.set(-0.35, 0.55, 0.65);
        registerPart(g, 'Fuel Filter', 'Inline fuel filter upstream of injector rail. Restriction contributes to fuel-flow anomalies.', new THREE.Vector3(-0.7, 1.3, 1.5), 4);
      }

      // 18. Coolant Expansion Tank (Zone 2)
      {
        const g = new THREE.Group();
        const tank = new THREE.Mesh(CY(0.16, 0.16, 0.4, 14), mat(0x445264, { roughness: 0.4, metalness: 0.4 }));
        g.add(tank);
        const cap = new THREE.Mesh(CY(0.09, 0.09, 0.06, 12), mat(0x2b323c, { roughness: 0.5 }));
        cap.position.set(0, 0.23, 0);
        g.add(cap);
        g.position.set(0.75, 0.95, -0.55);
        registerPart(g, 'Coolant Expansion Tank', 'Header tank for liquid-cooled heads. Coolant temp/level monitored for overheating risk.', new THREE.Vector3(1.7, 2.0, -1.3), 2);
      }

      // 19. Alternator / Generator
      {
        const g = new THREE.Group();
        const alt = new THREE.Mesh(CY(0.2, 0.2, 0.32, 14), mat(0x3d4550, { roughness: 0.4, metalness: 0.7 }));
        alt.rotation.z = Math.PI / 2;
        g.add(alt);
        g.position.set(-1.05, -0.55, 0.7);
        registerPart(g, 'Alternator / Generator', 'Dual-lane internal generator supplying power to FADEC, ignition and onboard avionics.', new THREE.Vector3(-2.1, -1.35, 1.5), 0);
      }

      // 20. Electric Starter Motor
      {
        const g = new THREE.Group();
        const body = new THREE.Mesh(CY(0.17, 0.17, 0.34, 14), mat(0x3a4048, { roughness: 0.45, metalness: 0.7 }));
        body.rotation.x = Math.PI / 2;
        g.add(body);
        const nose = new THREE.Mesh(CY(0.09, 0.12, 0.14, 12), mat(COL.metalDark, { roughness: 0.4 }));
        nose.rotation.x = Math.PI / 2;
        nose.position.set(0, 0, -0.24);
        g.add(nose);
        g.position.set(-0.55, -0.72, -0.55);
        registerPart(g, 'Electric Starter Motor', 'Engages starter ring gear for automated engine start sequencing.', new THREE.Vector3(-1.3, -1.7, -1.3), 0);
      }

      // 21. Dual-Lane CDI / Ignition Module
      {
        const g = new THREE.Group();
        for (let i = 0; i < 2; i++) {
          const box = new THREE.Mesh(BX(0.3, 0.16, 0.22), mat(0x2b3038, { roughness: 0.5 }));
          box.position.set(0, i * 0.2, 0);
          g.add(box);
          const led = new THREE.Mesh(SP(0.018, 8, 8), new THREE.MeshBasicMaterial({ color: i === 0 ? COL.green : COL.cyan }));
          led.position.set(0.12, i * 0.2 + 0.06, 0.12);
          g.add(led);
        }
        g.position.set(-0.15, 0.7, -0.45);
        registerPart(g, 'Dual-Lane CDI Ignition', 'Redundant capacitor-discharge ignition lanes (A/B) for fault-tolerant spark timing.', new THREE.Vector3(-0.35, 1.75, -1.15), 0);
      }

      // 22. ECU / FADEC Node
      {
        const g = new THREE.Group();
        const box = new THREE.Mesh(BX(0.42, 0.28, 0.32), mat(0x23282f, { roughness: 0.5 }));
        g.add(box);
        const led = new THREE.Mesh(SP(0.025, 8, 8), new THREE.MeshBasicMaterial({ color: COL.green }));
        led.position.set(0.18, 0.1, 0.17);
        g.add(led);
        g.position.set(0.15, 0.78, 0.15);
        registerPart(g, 'ECU / FADEC Node', 'Full-authority digital engine control node and CAN-bus telemetry interface feeding AeroTwin AI layer.', new THREE.Vector3(0.2, 1.9, 0.3), 0);
      }

      // 23. Vibration / Knock Sensor Array
      {
        const g = new THREE.Group();
        [-0.5, 0.5].forEach(z => {
          const pod = new THREE.Mesh(CY(0.055, 0.055, 0.12, 10), mat(0x22262c, { roughness: 0.4, metalness: 0.6 }));
          pod.position.set(0, -0.42, z);
          g.add(pod);
          const cable = new THREE.Mesh(CY(0.012, 0.012, 0.18, 6), mat(0x14171b, { roughness: 0.6 }));
          cable.rotation.z = Math.PI / 4;
          cable.position.set(0.08, -0.34, z);
          g.add(cable);
        });
        registerPart(g, 'Vibration / Knock Sensor Array', 'Crankcase-mounted piezoelectric sensors feeding real-time FFT and vibration diagnostics.', new THREE.Vector3(0, -1.55, 0), 0);
      }

      // 24. Flywheel / Starter Ring Gear
      {
        const g = new THREE.Group();
        const disc = new THREE.Mesh(CY(0.5, 0.5, 0.09, 28), mat(0x6b7280, { roughness: 0.35, metalness: 0.75 }));
        disc.rotation.z = Math.PI / 2;
        g.add(disc);
        const ringGearMesh = new THREE.Mesh(TR(0.5, 0.035, 8, 40), mat(0x3a3f47, { roughness: 0.5, metalness: 0.6 }));
        ringGearMesh.rotation.y = Math.PI / 2;
        g.add(ringGearMesh);
        g.position.set(-1.35, 0, 0);
        registerPart(g, 'Flywheel / Ring Gear', 'Rotational inertia mass and starter ring gear anchoring crank-angle reference.', new THREE.Vector3(-2.7, 0, -0.6), 0);
      }

      // 25. Crank Position Sensor
      {
        const g = new THREE.Group();
        const pod = new THREE.Mesh(BX(0.12, 0.1, 0.16), mat(0x23282f, { roughness: 0.45 }));
        g.add(pod);
        const tip = new THREE.Mesh(CY(0.025, 0.025, 0.1, 8), mat(COL.brass, { roughness: 0.3, metalness: 0.8 }));
        tip.rotation.z = Math.PI / 2;
        tip.position.set(-0.1, 0, 0);
        g.add(tip);
        g.position.set(-1.1, -0.35, 0.35);
        registerPart(g, 'Crank Position Sensor', 'Reads timing teeth for precise engine angle; signal dropout modelled for misfire detection.', new THREE.Vector3(-2.1, -0.85, 0.85), 0);
      }

      // 26. Engine Mount Brackets (L/R)
      [-1, 1].forEach(side => {
        const g = new THREE.Group();
        const bracket = new THREE.Mesh(BX(0.16, 0.5, 0.3), mat(0x565d68, { roughness: 0.55, metalness: 0.5 }));
        g.add(bracket);
        addBoltRing(g, { x: 0, y: 0.15, z: 0 }, 0.09, 4, 'x', 0.018, 0.05);
        g.position.set(side * 0.85, -0.95, side * 0.55);
        registerPart(g, `Engine Mount Bracket ${side < 0 ? 'L' : 'R'}`, 'Structural isolation mount transmitting thrust and torque to airframe firewall.', new THREE.Vector3(side * 1.9, -2.1, side * 1.3), 0);
      });

      // 27. Wiring Harness Loom
      {
        const g = new THREE.Group();
        const loomMat = mat(0x1e2228, { roughness: 0.6 });
        for (let i = 0; i < 5; i++) {
          const wire = new THREE.Mesh(TR(0.18 + i * 0.012, 0.012, 6, 16, Math.PI * 1.3), loomMat);
          wire.rotation.set(Math.PI / 2, i * 0.15, 0);
          g.add(wire);
        }
        g.position.set(0.35, 0.55, -0.15);
        registerPart(g, 'Wiring Harness Loom', 'Shielded CAN-bus and transducer harness linking sensors, injectors and FADEC.', new THREE.Vector3(0.85, 1.25, -0.35), 0);
      }

      // 28. Lifting Eye & Data Plate
      {
        const g = new THREE.Group();
        const eyeTorus = new THREE.Mesh(TR(0.09, 0.02, 8, 20), mat(0x8b93a0, { roughness: 0.3, metalness: 0.8 }));
        eyeTorus.position.set(0, 0.1, 0);
        g.add(eyeTorus);
        const post = new THREE.Mesh(CY(0.03, 0.03, 0.12, 8), mat(COL.metalDark, { roughness: 0.4 }));
        g.add(post);
        const plate = new THREE.Mesh(BX(0.24, 0.14, 0.01), mat(0xc8ccd2, { roughness: 0.3, metalness: 0.5 }));
        plate.position.set(0, -0.3, 0.32);
        g.add(plate);
        g.position.set(0, 0.68, 0);
        registerPart(g, 'Lifting Eye & Data Plate', 'Engine serial plate and maintenance lifting point linking physical asset to digital twin.', new THREE.Vector3(0, 1.7, -0.05), 0);
      }

      // Scale and position engine group
      EG.scale.set(1.5, 1.5, 1.5);
      EG.position.set(0, 0.2, 0);

      addGround();
      return { propeller: propGroup, turbo: turboSpinnerGroup };
    }

    // ═══════════════════════════════════════════════
    // BUILD MODEL 2 — Rotax 915 iS Cutaway / Internal Inspection View
    // ═══════════════════════════════════════════════
    function buildModel2() {
      let propGroup = null;
      let turboSpinnerGroup = null;
      const pistons = [];

      // 1. Cutaway Crankcase
      {
        const g = new THREE.Group();
        const caseGeo = CY(0.62, 0.62, 2.1, 20, 1, false, 0, Math.PI * 1.35);
        const caseMesh = new THREE.Mesh(caseGeo, mat(COL.metal, { roughness: 0.35, extra: { side: THREE.DoubleSide } }));
        caseMesh.rotation.z = Math.PI / 2;
        g.add(caseMesh);

        const crankShaft = new THREE.Mesh(CY(0.16, 0.16, 1.9, 16), mat(COL.brass, { roughness: 0.25, metalness: 0.9 }));
        crankShaft.rotation.z = Math.PI / 2;
        g.add(crankShaft);

        const sumpGeo = BX(1.7, 0.55, 0.9);
        const sump = new THREE.Mesh(sumpGeo, mat(COL.metalDark, { roughness: 0.5 }));
        sump.position.set(0, -0.75, 0);
        g.add(sump);

        const pulley = new THREE.Mesh(CY(0.28, 0.28, 0.18, 24), mat(COL.black, { roughness: 0.6 }));
        pulley.rotation.z = Math.PI / 2;
        pulley.position.set(1.15, 0, 0);
        g.add(pulley);
        registerPart(g, 'Crankcase Assembly (Cutaway)', 'Exposed crankshaft and oil passages for internal twin inspection.', new THREE.Vector3(0, 0, 0), 0);
      }

      // 2. Boxer Cylinders with Visible Horizontally-Opposed Pistons
      function buildCutawayCylinder(side, index) {
        const g = new THREE.Group();
        const dir = side === 'L' ? -1 : 1;
        const zOff = index === 0 ? -0.55 : 0.55;

        const barrelMat = new THREE.MeshStandardMaterial({
          color: 0x5a6578, roughness: 0.2, metalness: 0.8,
          transparent: true, opacity: 0.38, side: THREE.DoubleSide
        });
        const barrel = new THREE.Mesh(CY(0.34, 0.36, 0.85, 16), barrelMat);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(dir * 1.05, 0, 0);
        g.add(barrel);

        for (let i = 0; i < 4; i++) {
          const finGeo = TR(0.4, 0.02, 6, 16, Math.PI * 1.4);
          const fin = new THREE.Mesh(finGeo, mat(COL.fin, { roughness: 0.6, metalness: 0.5 }));
          fin.rotation.y = Math.PI / 2;
          fin.position.set(dir * (0.78 + i * 0.13), 0, 0);
          g.add(fin);
        }

        const head = new THREE.Mesh(BX(0.42, 0.62, 0.62), mat(COL.head, { roughness: 0.4 }));
        head.position.set(dir * 1.62, 0, 0);
        g.add(head);

        const chamberLight = new THREE.Mesh(SP(0.15, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.6 }));
        chamberLight.position.set(dir * 1.45, 0, 0);
        g.add(chamberLight);

        // PISTON + CONNECTING ROD
        const pg = new THREE.Group();
        pg.position.set(dir * 1.15, 0, 0);
        const crown = new THREE.Mesh(CY(0.30, 0.30, 0.24, 16), mat(COL.metal, { roughness: 0.3, metalness: 0.85 }));
        crown.rotation.z = Math.PI / 2;
        pg.add(crown);
        for (let r = 0; r < 2; r++) {
          const rg = new THREE.Mesh(TR(0.30, 0.016, 6, 16), mat(COL.brass, { metalness: 0.9, roughness: 0.2 }));
          rg.rotation.y = Math.PI / 2;
          rg.position.x = dir * (0.04 - r * 0.07);
          pg.add(rg);
        }
        const rod = new THREE.Mesh(CY(0.045, 0.045, 0.85, 8), mat(COL.metalDark, { roughness: 0.4, metalness: 0.8 }));
        rod.rotation.z = Math.PI / 2;
        rod.position.x = -dir * 0.48;
        pg.add(rod);

        g.add(pg);
        ORIG.set(pg, pg.position.clone());
        pistons.push({ g: pg, dir: dir, offset: index === 0 ? 0 : Math.PI });

        g.position.set(0, 0.25, zOff);
        registerPart(
          g,
          `Cylinder ${side}${index + 1} (Cutaway)`,
          `Internal boxer piston and combustion chamber. Pistons stroke horizontally opposed with engine RPM.`,
          new THREE.Vector3(dir * 1.6, 0.3, zOff * 1.4),
          0
        );
      }
      buildCutawayCylinder('L', 0); buildCutawayCylinder('L', 1);
      buildCutawayCylinder('R', 0); buildCutawayCylinder('R', 1);

      // 3. Gearbox
      {
        const g = new THREE.Group();
        const box = new THREE.Mesh(CY(0.58, 0.58, 0.5, 20), mat(COL.metal, { roughness: 0.3 }));
        box.rotation.z = Math.PI / 2;
        g.add(box);
        const shaft = new THREE.Mesh(CY(0.1, 0.1, 0.55, 12), mat(COL.black, { roughness: 0.5 }));
        shaft.rotation.z = Math.PI / 2;
        shaft.position.set(0.68, 0, 0);
        g.add(shaft);
        g.position.set(-1.55, 0, 0);
        registerPart(g, 'Reduction Gearbox', 'Propeller reduction drive.', new THREE.Vector3(-2.8, 0, 0), 0);
      }

      // 4. Propeller Hub
      {
        const g = new THREE.Group();
        propGroup = new THREE.Group();
        const hub = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 18), mat(0xb8c0c9, { roughness: 0.2, metalness: 0.85 }));
        hub.rotation.z = -Math.PI / 2;
        propGroup.add(hub);
        const bladeMat = mat(0x2b2f36, { roughness: 0.4, metalness: 0.3 });
        for (let i = 0; i < 3; i++) {
          const blade = new THREE.Mesh(BX(0.05, 0.9, 0.14), bladeMat);
          blade.position.set(-0.05, 0.5, 0);
          const pivot = new THREE.Group();
          pivot.add(blade);
          pivot.rotation.x = (i / 3) * Math.PI * 2;
          propGroup.add(pivot);
        }
        g.add(propGroup);
        g.position.set(-2.1, 0, 0);
        registerPart(g, 'Propeller Hub Assembly', 'Output-side propeller hub.', new THREE.Vector3(-3.6, 0, 0), 0);
      }

      // 5. Cutaway Turbocharger
      {
        const g = new THREE.Group();
        turboSpinnerGroup = new THREE.Group();
        const housing = new THREE.Mesh(SP(0.34, 16, 12, 0, Math.PI * 1.5), mat(COL.turbo, { roughness: 0.4, metalness: 0.75, extra: { side: THREE.DoubleSide } }));
        g.add(housing);

        for (let b = 0; b < 10; b++) {
          const imp = new THREE.Mesh(BX(0.03, 0.24, 0.05), mat(COL.cyan, { metalness: 0.95, roughness: 0.15 }));
          imp.position.set(0.35, Math.sin(b / 10 * Math.PI * 2) * 0.15, Math.cos(b / 10 * Math.PI * 2) * 0.15);
          imp.rotation.x = b / 10 * Math.PI * 2;
          turboSpinnerGroup.add(imp);
        }
        g.add(turboSpinnerGroup);

        g.position.set(0.4, -0.85, 0.75);
        registerPart(g, 'Turbocharger (Cutaway)', 'Exposed compressor and turbine impeller wheels spinning with RPM.', new THREE.Vector3(0.9, -1.9, 1.7), 2);
        ZP[3].push(g);
      }

      // 6. Wastegate Actuator
      {
        const g = new THREE.Group();
        const canister = new THREE.Mesh(CY(0.1, 0.1, 0.2, 14), mat(0x6b7280, { roughness: 0.35, metalness: 0.6 }));
        canister.rotation.z = Math.PI / 2;
        g.add(canister);
        g.position.set(0.75, -1.15, 0.35);
        registerPart(g, 'Wastegate Actuator', 'Pneumatic boost-control bypass actuator.', new THREE.Vector3(1.7, -2.35, 0.8), 3);
      }

      // 7. Intercooler
      {
        const g = new THREE.Group();
        const core = new THREE.Mesh(BX(1.3, 0.4, 0.28), mat(0x39424e, { roughness: 0.5 }));
        g.add(core);
        for (let i = -5; i <= 5; i++) {
          const fin = new THREE.Mesh(BX(0.02, 0.36, 0.26), mat(0x2b323c, { roughness: 0.6 }));
          fin.position.set(i * 0.11, 0, 0);
          g.add(fin);
        }
        g.position.set(0, 0.95, 0.85);
        registerPart(g, 'Intercooler (CAC)', 'Charge-air cooler core.', new THREE.Vector3(0, 2.1, 1.9), 2);
      }

      // 8. Electronic Throttle Body
      {
        const g = new THREE.Group();
        const bore = new THREE.Mesh(CY(0.16, 0.16, 0.24, 16), mat(0x707880, { roughness: 0.3, metalness: 0.8 }));
        bore.rotation.z = Math.PI / 2;
        g.add(bore);
        g.position.set(0, 0.78, 0.55);
        registerPart(g, 'Electronic Throttle Body', 'Throttle body and position sensor.', new THREE.Vector3(0, 1.75, 1.3), 2);
      }

      // 9. Intake Plenum
      {
        const g = new THREE.Group();
        const plenum = new THREE.Mesh(CY(0.22, 0.28, 1.5, 14), mat(COL.intake, { roughness: 0.4 }));
        plenum.rotation.z = Math.PI / 2;
        g.add(plenum);
        g.position.set(0, 0.62, -0.85);
        registerPart(g, 'Intake Plenum', 'Charge air distribution plenum.', new THREE.Vector3(0, 1.5, -1.9), 2);
      }

      // 10. Air Intake Scoop & Filter (Zone 1)
      {
        const g = new THREE.Group();
        const scoop = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.5, 16, 1, true), mat(0x2b3340, { roughness: 0.55, metalness: 0.3, extra: { side: THREE.DoubleSide } }));
        scoop.rotation.z = Math.PI / 2;
        g.add(scoop);
        const filterElement = new THREE.Mesh(CY(0.22, 0.22, 0.16, 16), mat(0x8a6a3a, { roughness: 0.7 }));
        filterElement.rotation.z = Math.PI / 2;
        filterElement.position.set(0.28, 0, 0);
        g.add(filterElement);
        g.position.set(0, 0.62, -1.35);
        registerPart(g, 'Air Intake Scoop & Filter', 'Ram-air scoop and MAF flow meter.', new THREE.Vector3(0, 1.5, -2.9), 1);
      }

      // 11. Exhaust Manifold (Zone 3)
      {
        const g = new THREE.Group();
        const pts = [
          new THREE.Vector3(-1.4, 0.15, -0.55),
          new THREE.Vector3(-0.8, -0.35, -0.3),
          new THREE.Vector3(0.0, -0.65, 0.2),
          new THREE.Vector3(0.4, -0.85, 0.75)
        ];
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.095, 10, false), mat(COL.hot, { roughness: 0.6, metalness: 0.4 }));
        g.add(tube);
        registerPart(g, 'Exhaust Manifold', 'Exhaust headers connecting to turbine.', new THREE.Vector3(0.4, -1.7, 1.0), 3);
      }

      // 12. Exhaust Muffler (Zone 3)
      {
        const g = new THREE.Group();
        const body = new THREE.Mesh(CY(0.16, 0.16, 0.65, 16), mat(0x4a4038, { roughness: 0.6, metalness: 0.5 }));
        body.rotation.z = Math.PI / 2;
        g.add(body);
        g.position.set(1.15, -1.0, 1.35);
        registerPart(g, 'Exhaust Outlet & Muffler', 'Exhaust silencer.', new THREE.Vector3(2.3, -1.9, 2.6), 3);
      }

      // 13. Fuel Pump & Injector Rail (Zone 4)
      {
        const g = new THREE.Group();
        const pump = new THREE.Mesh(CY(0.11, 0.11, 0.26, 12), mat(0x4a5460, { roughness: 0.4, metalness: 0.7 }));
        pump.rotation.z = Math.PI / 2;
        pump.position.set(-0.6, 0, 0);
        g.add(pump);
        const rail = new THREE.Mesh(CY(0.035, 0.035, 1.5, 10), mat(COL.brass, { roughness: 0.25, metalness: 0.9 }));
        rail.rotation.z = Math.PI / 2;
        g.add(rail);
        g.position.set(0, 0.55, 0.42);
        registerPart(g, 'Fuel Pump & Injector Rail', 'EFI fuel rail.', new THREE.Vector3(0, 1.35, 1.05), 4);
      }

      // 14. Remaining accessories
      {
        const g = new THREE.Group();
        const tank = new THREE.Mesh(CY(0.24, 0.24, 0.6, 16), mat(0x556270, { roughness: 0.45 }));
        g.add(tank);
        g.position.set(-0.95, 0.55, -0.85);
        registerPart(g, 'Dry-Sump Oil Tank', 'Oil tank reservoir.', new THREE.Vector3(-2.0, 1.3, -1.7), 0);
      }
      {
        const g = new THREE.Group();
        const box = new THREE.Mesh(BX(0.42, 0.28, 0.32), mat(0x23282f, { roughness: 0.5 }));
        g.add(box);
        g.position.set(0.15, 0.78, 0.15);
        registerPart(g, 'ECU / FADEC Node', 'Engine control unit.', new THREE.Vector3(0.2, 1.9, 0.3), 0);
      }

      EG.scale.set(1.5, 1.5, 1.5);
      EG.position.set(0, 0.2, 0);

      addGround();
      return { propeller: propGroup, turbo: turboSpinnerGroup, pistons };
    }

    function addGround() {
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(28, 28), new THREE.ShadowMaterial({ opacity: 0.55 }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -2.35;
      shadow.receiveShadow = true;
      scene.add(shadow);
      const grid = new THREE.GridHelper(28, 56, 0x00FFE0, 0x081525);
      grid.position.y = -2.35;
      grid.material.transparent = true;
      grid.material.opacity = 0.25;
      scene.add(grid);

      const ringGeo = new THREE.RingGeometry(6.6, 6.66, 72);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00FFE0, transparent: true, opacity: 0.16, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -2.34;
      scene.add(ring);
    }

    // ═══════════════════════════════════════════════
    // MODEL LOAD
    // ═══════════════════════════════════════════════
    function loadModel(n) {
      const mso = document.getElementById('mso');
      document.getElementById('msot').textContent = n === 1 ? 'LOADING ROTAX 915 iS ENGINE...' : 'LOADING ROTAX 915 iS CUTAWAY...';
      mso.classList.add('v');
      clearLeakParticles();
      clearScene();
      setTimeout(() => {
        modelData = n === 1 ? buildModel1() : buildModel2();
        document.getElementById('h-model').textContent = n === 1 ? 'ROTAX 915 iS FULL' : 'ROTAX 915 iS CUTAWAY';
        document.getElementById('mt1').classList.toggle('on', n === 1);
        document.getElementById('mt2').classList.toggle('on', n === 2);
        mso.classList.remove('v');
        if (n === 1 && !window._introRun) { window._introRun = true; setTimeout(runIntroSequence, 600); }
      }, 380);
    }

    function switchModel(n) {
      if (currentModel === n) return;
      currentModel = n;
      clearLeak();
      loadModel(n);
    }

// ═══════════════════════════════════════════════
    // FLOW LINES (Mapped to Rotax 915 iS engine paths)
    // ═══════════════════════════════════════════════
    const FLOW_PATHS = {
      intake: {
        pts: [
          new THREE.Vector3(0, 1.25, -2.4),
          new THREE.Vector3(0, 1.25, -1.9),
          new THREE.Vector3(0.3, 0.4, -0.6),
          new THREE.Vector3(0.5, -0.4, 0.4),
          new THREE.Vector3(0.66, -1.05, 1.15)
        ],
        col: [0, 255, 224], w: 3.5, spd: 1.2, dash: [8, 12]
      },
      boost: {
        pts: [
          new THREE.Vector3(0.66, -1.05, 1.15),
          new THREE.Vector3(0.7, -0.3, 1.25),
          new THREE.Vector3(0.5, 0.6, 1.35),
          new THREE.Vector3(0.2, 1.7, 1.35)
        ],
        col: [58, 159, 255], w: 3, spd: .9, dash: [7, 13]
      },
      cac: {
        pts: [
          new THREE.Vector3(0.2, 1.7, 1.35),
          new THREE.Vector3(-0.2, 1.7, 1.35),
          new THREE.Vector3(0, 1.45, 0.9),
          new THREE.Vector3(0, 1.2, -0.4),
          new THREE.Vector3(0, 1.2, -1.3),
          new THREE.Vector3(-1.3, 0.65, -0.8)
        ],
        col: [100, 200, 255], w: 2.5, spd: .8, dash: [6, 14]
      },
      exhaust: {
        pts: [
          new THREE.Vector3(-1.5, 0.4, -0.6),
          new THREE.Vector3(-0.6, -0.3, 0.0),
          new THREE.Vector3(0.1, -0.9, 0.9),
          new THREE.Vector3(0.66, -1.05, 1.15),
          new THREE.Vector3(1.2, -1.2, 1.6),
          new THREE.Vector3(1.85, -1.3, 2.15)
        ],
        col: [255, 102, 0], w: 3, spd: 1.4, dash: [10, 10]
      },
      fuel: {
        pts: [
          new THREE.Vector3(-0.6, 1.1, 1.05),
          new THREE.Vector3(-0.8, 1.0, 0.7),
          new THREE.Vector3(0, 1.1, 0.65),
          new THREE.Vector3(0.85, 0.85, 0.65)
        ],
        col: [255, 179, 0], w: 2, spd: .5, dash: [5, 15]
      },
    };

    function projPt(v) {
      const w = v.clone().project(camera);
      return { x: (w.x + 1) / 2 * fCvs.width, y: (-w.y + 1) / 2 * fCvs.height, z: w.z };
    }

    function drawOnePath(pts, col, w, spd, dash, leakAlpha) {
      if (pts.length < 2) return;
      const P = pts.map(p => projPt(p));
      if (P.some(p => p.z >= 1)) return;
      const [r, g, b] = col;
      fctx.save();
      fctx.strokeStyle = `rgba(${r},${g},${b},0.06)`;
      fctx.lineWidth = w * 3.5; fctx.setLineDash([]); fctx.lineCap = 'round'; fctx.lineJoin = 'round';
      fctx.shadowColor = `rgba(${r},${g},${b},.8)`; fctx.shadowBlur = 20;
      fctx.beginPath(); P.forEach((p, i) => i ? fctx.lineTo(p.x, p.y) : fctx.moveTo(p.x, p.y)); fctx.stroke();

      fctx.strokeStyle = `rgba(${r},${g},${b},${(0.28 * leakAlpha).toFixed(3)})`;
      fctx.lineWidth = w * 1.4; fctx.shadowBlur = 8;
      fctx.beginPath(); P.forEach((p, i) => i ? fctx.lineTo(p.x, p.y) : fctx.moveTo(p.x, p.y)); fctx.stroke();

      fctx.strokeStyle = `rgba(${r},${g},${b},${(0.88 * leakAlpha).toFixed(3)})`;
      fctx.lineWidth = w * 0.9; fctx.shadowColor = `rgba(${r},${g},${b},1)`; fctx.shadowBlur = 12;
      fctx.setLineDash(dash); fctx.lineDashOffset = -flowOffset * spd;
      fctx.beginPath(); P.forEach((p, i) => i ? fctx.lineTo(p.x, p.y) : fctx.moveTo(p.x, p.y)); fctx.stroke();

      fctx.setLineDash([]); fctx.shadowBlur = 0;
      if (P.length >= 2) {
        const mid = Math.floor(P.length / 2); const pm = P[mid], pn = P[Math.min(mid + 1, P.length - 1)];
        const angle = Math.atan2(pn.y - pm.y, pn.x - pm.x);
        fctx.save(); fctx.translate(pm.x, pm.y); fctx.rotate(angle);
        fctx.fillStyle = `rgba(${r},${g},${b},${(0.9 * leakAlpha).toFixed(3)})`;
        fctx.beginPath(); fctx.moveTo(9, 0); fctx.lineTo(-5, 5); fctx.lineTo(-5, -5); fctx.closePath(); fctx.fill();
        fctx.restore();
      }
      fctx.restore();
    }

    function drawFlows() {
      fctx.clearRect(0, 0, fCvs.width, fCvs.height);
      const la = APP.activeLeak ? 0.3 : 1.0;
      Object.values(FLOW_PATHS).forEach(({ pts, col, w, spd, dash }) => drawOnePath(pts, col, w, spd, dash, la));
    }

// ═══════════════════════════════════════════════
    // ORBIT CONTROLS (smooth lerp)
    // ═══════════════════════════════════════════════
    let drag = false, prevM = { x: 0, y: 0 };
    const sph = { theta: 0.55, phi: 0.36, r: 16 }, sTgt = { theta: 0.55, phi: 0.36, r: 16 };
    const cTgt = new THREE.Vector3(0, 0.6, 0), cLerp = new THREE.Vector3(0, 0.6, 0);

    cvs.addEventListener('mousedown', e => { drag = true; prevM = { x: e.clientX, y: e.clientY }; APP.autoRot = false; });
    window.addEventListener('mouseup', () => drag = false);
    cvs.addEventListener('mousemove', e => { if (drag) { sTgt.theta -= (e.clientX - prevM.x) * 0.007; sTgt.phi = Math.max(0.05, Math.min(Math.PI / 2.05, sTgt.phi + (e.clientY - prevM.y) * 0.006)); prevM = { x: e.clientX, y: e.clientY }; } onHov(e.clientX, e.clientY); });
    cvs.addEventListener('wheel', e => { sTgt.r = Math.max(4, Math.min(30, sTgt.r + e.deltaY * 0.013)); document.getElementById('zoom-sl').value = sTgt.r; }, { passive: true });
    cvs.addEventListener('touchstart', e => { if (e.touches.length === 1) { drag = true; prevM = { x: e.touches[0].clientX, y: e.touches[0].clientY }; APP.autoRot = false; } }, { passive: true });
    window.addEventListener('touchend', () => drag = false);
    cvs.addEventListener('touchmove', e => { if (drag && e.touches.length === 1) { sTgt.theta -= (e.touches[0].clientX - prevM.x) * 0.007; sTgt.phi = Math.max(0.05, Math.min(Math.PI / 2.05, sTgt.phi + (e.touches[0].clientY - prevM.y) * 0.006)); prevM = { x: e.touches[0].clientX, y: e.touches[0].clientY }; } }, { passive: true });
    cvs.addEventListener('click', e => onClk(e.clientX, e.clientY));

    function updateCamera() {
      sph.theta += (sTgt.theta - sph.theta) * 0.1;
      sph.phi += (sTgt.phi - sph.phi) * 0.1;
      sph.r += (sTgt.r - sph.r) * 0.1;
      camera.position.set(sph.r * Math.sin(sph.phi) * Math.sin(sph.theta), sph.r * Math.cos(sph.phi), sph.r * Math.sin(sph.phi) * Math.cos(sph.theta));
      cLerp.lerp(cTgt, 0.07);
      camera.lookAt(cLerp);
    }

    const CAM_PRESETS = {
      iso: { t: 0.55, p: 0.36, r: 16, tx: 0, ty: 0.6 }, front: { t: Math.PI + 0.1, p: 0.33, r: 15, tx: 0, ty: 0.6 },
      side: { t: Math.PI / 2 + 0.1, p: 0.30, r: 14, tx: 0, ty: 0.6 }, top: { t: 0.55, p: 0.07, r: 17, tx: 0, ty: 0 },
      rear: { t: 0.15, p: 0.33, r: 14, tx: 0, ty: 0.6 }, q45: { t: 0.95, p: 0.42, r: 13, tx: 0, ty: 0.6 },
    };
    let camAnim = { on: false, from: {}, to: {}, t: 0 };

    function setCam(n) {
      const p = CAM_PRESETS[n]; if (!p) return;
      camAnim = { on: true, from: { ...sph }, to: { theta: p.t, phi: p.p, r: p.r }, t: 0 };
      cTgt.set(p.tx || 0, p.ty || 0.6, 0);
      document.querySelectorAll('.cambtn').forEach(b => b.classList.remove('on'));
      const btn = document.getElementById('cb-' + n); if (btn) btn.classList.add('on');
    }
    function tickCamAnim() {
      if (!camAnim.on) return;
      camAnim.t = Math.min(1, camAnim.t + 0.04);
      const e = 1 - Math.pow(1 - camAnim.t, 4);
      sTgt.theta = camAnim.from.theta + (camAnim.to.theta - camAnim.from.theta) * e;
      sTgt.phi = camAnim.from.phi + (camAnim.to.phi - camAnim.from.phi) * e;
      sTgt.r = camAnim.from.r + (camAnim.to.r - camAnim.from.r) * e;
      if (camAnim.t >= 1) camAnim.on = false;
    }
    setCam('iso');

    // ═══════════════════════════════════════════════
    // EXPLODE
    // ═══════════════════════════════════════════════
    let explodeT = 0, explodeTgt = 0;
    function toggleExplode() {
      explodeTgt = explodeTgt === 0 ? 1 : 0;
      document.getElementById('btn-xp').classList.toggle('on', explodeTgt === 1);
    }
    function tickExplode() {
      explodeT += (explodeTgt - explodeT) * 0.045;
      EG.children.forEach(c => {
        if (!ORIG.has(c)) return;
        const orig = ORIG.get(c);
        const expDir = c.userData.__explodeDir || orig.clone().normalize();
        const d = expDir.length();
        if (d < 0.01) return;
        const offset = expDir.clone().multiplyScalar(explodeT * 1.35);
        c.position.lerpVectors(orig, orig.clone().add(offset), explodeT);
      });
    }

    // ═══════════════════════════════════════════════
    // RAYCASTING
    // ═══════════════════════════════════════════════
    const raycaster = new THREE.Raycaster();
    const mouse2d = new THREE.Vector2();
    const tipEl = document.getElementById('tip');

    function getZoneName(obj) {
      const names = {
        1: 'Subsystem 1 — Air Intake & MAF Sensor (Zone 1)',
        2: 'Subsystem 2 — Turbocharger & Charge-Air Cooler (Zone 2)',
        3: 'Subsystem 3 — Exhaust Manifold & Turbine (Zone 3)',
        4: 'Subsystem 4 — Fuel Injection System (Zone F - Critical Safety)'
      };
      const partRef = obj.userData.__partRef || obj;
      const partName = partRef.userData.__name || (obj.parent && obj.parent.userData.__name);
      for (const [z, parts] of Object.entries(ZP)) {
        if (parts.some(p => p === obj || p === partRef || (p.children && p.children.includes(obj)))) {
          return partName ? `${partName} · ${names[z]}` : names[z];
        }
      }
      return partName ? `Rotax 915 iS · ${partName}` : 'Rotax 915 iS Core Digital Twin';
    }
    function onHov(cx, cy) {
      const r = cvs.getBoundingClientRect();
      mouse2d.x = ((cx - r.left) / r.width) * 2 - 1;
      mouse2d.y = -((cy - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(mouse2d, camera);
      const hits = raycaster.intersectObjects(EG.children, true);
      if (hits.length) { tipEl.style.display = 'block'; tipEl.style.left = cx + 'px'; tipEl.style.top = cy + 'px'; tipEl.textContent = getZoneName(hits[0].object); cvs.style.cursor = 'pointer'; }
      else { tipEl.style.display = 'none'; cvs.style.cursor = 'default'; }
    }
    function onClk(cx, cy) {
      const r = cvs.getBoundingClientRect();
      mouse2d.x = ((cx - r.left) / r.width) * 2 - 1;
      mouse2d.y = -((cy - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(mouse2d, camera);
      const hits = raycaster.intersectObjects(EG.children, true);
      if (hits.length) {
        const obj = hits[0].object;
        for (const [z, parts] of Object.entries(ZP)) {
          if (parts.some(p => p === obj || (p.children && p.children.includes(obj)))) { focusZone(parseInt(z)); break; }
        }
      }
    }

    // ═══════════════════════════════════════════════
    // SENSOR DATA + UI
    // ═══════════════════════════════════════════════
    const SD = {
      MAF: { v: 842, u: 'kg/h', mn: 350, mx: 1200, c: '#00FFE0' },
      MAP_boost: { v: 218, u: 'kPa', mn: 100, mx: 330, c: '#3a9fff' },
      MAP_cac: { v: 213, u: 'kPa', mn: 100, mx: 325, c: '#3a9fff' },
      T_cac_out: { v: 52, u: '°C', mn: 20, mx: 140, c: '#CC88FF' },
      T_exh_man: { v: 512, u: '°C', mn: 280, mx: 800, c: '#FF6600' },
      dP_dpf: { v: 4.2, u: 'kPa', mn: 0, mx: 22, c: '#FF9944' },
    };
    const SN = { MAF: 'Mass Air Flow (MAF)', MAP_boost: 'Boost Pressure (MAP)', MAP_cac: 'CAC Manifold Press', T_cac_out: 'Charge-Air Temp (MAT)', T_exh_man: 'Exhaust Gas Temp (EGT)', dP_dpf: 'Turbine Delta-P (ΔP)' };

    const LEAK_DEF = {
      A: { zone: 1, sen: 'MAF', d: -.15, lbl: 'Zone 1 — Air Intake & MAF Sensor Drift', act: 'Inspect MAF sensor connector, intake filter element, and ducting. Recalibrate intake air-density model.' },
      B: { zone: 2, sen: 'MAP_boost', d: -.17, lbl: 'Zone 2 — Turbo Compressor Boost Pressure Loss', act: 'Inspect turbocharger compressor housing, V-band clamp, and boost ducting. Check compressor wheel tip clearance.' },
      C: { zone: 2, sen: 'MAP_cac', d: -.14, lbl: 'Zone 2 — Intercooler (CAC) Thermal Inefficiency', act: 'Inspect CAC heat exchanger core. Check for cooling fin blockage, thermal heat soak, or end-tank pressure loss.' },
      D: { zone: 3, sen: 'T_exh_man', d: -.12, lbl: 'Zone 3 — Exhaust Manifold Thermal Blowby', act: 'Inspect cylinder exhaust manifold gasket interfaces. Check stud torque (65 Nm) and monitor EGT cylinder imbalance.' },
      E: { zone: 3, sen: 'dP_dpf', d: -.23, lbl: 'Zone 3 — Wastegate Actuator Drift & Turbine ΔP', act: 'Inspect pneumatic wastegate actuator linkage and turbine bypass valve. Check for actuator diaphragm fatigue or carbon binding.' },
      F: { zone: 4, sen: 'MAP_boost', d: -.05, lbl: '⚠ CRITICAL FAULT — Fuel Rail Pressure Loss', act: 'CRITICAL SAFETY ALERT: Fuel rail pressure loss detected — Fire/starvation risk. Inspect dual-lane HP pump and injector seals.' },
    };

    const LEAK_POS = {
      A: { x: 0.0, y: 1.3, z: -2.1 },
      B: { x: 0.66, y: -0.4, z: 1.25 },
      C: { x: 0.0, y: 1.6, z: 0.95 },
      D: { x: 1.35, y: 0.4, z: 0.6 },
      E: { x: 1.85, y: -1.3, z: 2.15 },
      F: { x: 0.0, y: 1.1, z: 0.65 },
    };

    function buildSensorsUI() {
      const sw = document.getElementById('sw'); sw.innerHTML = '';
      Object.entries(SD).forEach(([k, s]) => {
        const pct = ((s.v - s.mn) / (s.mx - s.mn) * 100).toFixed(1);
        sw.innerHTML += `<div class="sg" id="sg-${k}"><div class="sgtop"><span class="sgn">${SN[k]}</span><span class="sgv" id="sv-${k}" style="color:${s.c}">${s.v.toFixed(1)}<span class="sgu">${s.u}</span></span></div><div class="sgbg"><div class="sgf" id="sf-${k}" style="width:${pct}%;background:${s.c}"></div></div><div class="sgr sok" id="sr-${k}">RESIDUAL: +0.0 ${s.u} (0.0%)</div></div>`;
      });
    }

    function updateSensors(lk) {
      const rs = APP.rpm / 1800, ls = APP.load / 75, sm = [0, 0.06, 0.14, 0.25][APP.severity];
      Object.entries(SD).forEach(([k, s]) => {
        let v = s.v * rs * 0.3 + s.v * ls * 0.7, res = 0;
        if (lk) {
          const def = LEAK_DEF[lk];
          if (def.sen === k) { v = v * (1 + def.d * sm / 0.14); res = v - (s.v * rs * 0.3 + s.v * ls * 0.7); }
          if (lk === 'A' && (k === 'MAP_boost' || k === 'MAP_cac')) v *= 0.96;
          if (lk === 'B' && k === 'MAP_cac') v *= 0.90;
          if (lk === 'B' && k === 'T_cac_out') v += 9 * sm / 0.14;
          if (lk === 'C' && k === 'MAP_cac') v *= 0.87;
          if (lk === 'D' && k === 'MAP_boost') v *= 0.97;
          if (lk === 'D' && k === 'dP_dpf') v *= 0.88;
          if (lk === 'E' && k === 'dP_dpf') v *= 0.64;
          if (lk === 'E' && k === 'T_exh_man') v += 20 * sm / 0.14;
          if (k !== LEAK_DEF[lk].sen) res = v - (s.v * rs * 0.3 + s.v * ls * 0.7);
        }
        const pct = Math.max(2, Math.min(100, (v - s.mn) / (s.mx - s.mn) * 100));
        const rp = (res / Math.max(0.01, s.v) * 100).toFixed(1);
        const ra = Math.abs(res / Math.max(0.01, s.v));
        const bc = ra > 0.08 ? '#FF2244' : ra > 0.03 ? '#FF6600' : s.c;
        const rc = ra > 0.08 ? 'sbc' : ra > 0.03 ? 'swc' : 'sok';
        const cc = ra > 0.08 ? 'b' : ra > 0.03 ? 'w' : '';
        const sv = document.getElementById('sv-' + k), sf = document.getElementById('sf-' + k), sr = document.getElementById('sr-' + k), sc = document.getElementById('sg-' + k);
        if (sv) { sv.textContent = v.toFixed(1); sv.style.color = bc; }
        if (sf) { sf.style.width = pct + '%'; sf.style.background = bc; }
        if (sr) { sr.textContent = `RESIDUAL: ${res >= 0 ? '+' : ''}${res.toFixed(1)} ${s.u} (${rp}%)`; sr.className = 'sgr ' + rc; }
        if (sc) sc.className = 'sg ' + cc;
      });
      const maf = SD.MAF.v * rs * 0.3 + SD.MAF.v * ls * 0.7;
      const bst = SD.MAP_boost.v * rs * 0.3 + SD.MAP_boost.v * ls * 0.7;
      const exh = SD.T_exh_man.v * rs * 0.3 + SD.T_exh_man.v * ls * 0.7;
      document.getElementById('hv-rpm').textContent = APP.rpm;
      document.getElementById('hv-maf').textContent = maf.toFixed(0);
      document.getElementById('hv-boost').textContent = bst.toFixed(0);
      document.getElementById('hv-exh').textContent = exh.toFixed(0);
      const r2 = Math.round(APP.rpm / 100) * 100;
      const tq = TQ_TABLE[Math.max(1100, Math.min(2100, r2))] || 3165;
      document.getElementById('hv-tq').textContent = Math.round(tq * APP.load / 100);
      document.getElementById('spec-tq').textContent = tq + ' N·m @ ' + APP.rpm;
    }

    // Energy field
    const EF_CH = ['MAF', 'Bst', 'CAC-P', 'CAC-T', 'Exh-T', 'DPF'];
    const EF_H = [[1, .87, .78, .40, .20, .12], [.87, 1, .92, .50, .30, .16], [.78, .92, 1, .60, .28, .20], [.40, .50, .60, 1, .65, .25], [.20, .30, .28, .65, 1, .50], [.12, .16, .20, .25, .50, 1]];
    const EF_DISR = { A: [[0, 1], [0, 2], [0, 3], [1, 0], [2, 0]], B: [[1, 0], [1, 2], [1, 3], [2, 1]], C: [[2, 0], [2, 1], [2, 3], [3, 2]], D: [[4, 0], [4, 1], [4, 3], [4, 5]], E: [[5, 0], [5, 1], [5, 3], [5, 4], [4, 5]], F: [[1, 2], [2, 1], [0, 1]] };

    function renderEF(lk) {
      const g = document.getElementById('efg'), l = document.getElementById('efl');
      g.innerHTML = ''; l.innerHTML = '';
      const f = EF_H.map(r => [...r]); const dis = new Set();
      if (lk && EF_DISR[lk]) {
        EF_DISR[lk].forEach(([r, c]) => { const d = (0.3 + APP.severity * 0.18) * (0.7 + Math.random() * 0.5); f[r][c] = Math.max(-0.4, f[r][c] - d); f[c][r] = f[r][c]; dis.add(r + ',' + c); dis.add(c + ',' + r); });
      }
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          const v = f[r][c], isDis = dis.has(r + ',' + c) && lk;
          let bg;
          if (r === c) bg = 'rgba(245,197,24,.28)';
          else if (isDis) bg = `rgba(255,34,68,${(0.18 + Math.abs(v) * 0.55).toFixed(2)})`;
          else if (v >= 0) bg = `rgba(58,159,255,${(0.06 + v * 0.62).toFixed(2)})`;
          else bg = `rgba(255,80,60,${(0.06 + Math.abs(v) * 0.5).toFixed(2)})`;
          const cell = document.createElement('div'); cell.className = 'efc'; cell.style.background = bg;
          if (isDis) cell.style.boxShadow = '0 0 5px rgba(255,34,68,.5)';
          cell.innerHTML = `<div class="eft">${EF_CH[r]}↔${EF_CH[c]}: ${v.toFixed(2)}</div>`;
          g.appendChild(cell);
        }
        const lbl = document.createElement('div'); lbl.className = 'efl'; lbl.textContent = EF_CH[r]; l.appendChild(lbl);
      }
    }

    // ═══════════════════════════════════════════════
    // LEAK + CLEAR
    // ═══════════════════════════════════════════════
    function simLeak(z) {
      APP.activeLeak = z; APP.autoRot = false;
      document.querySelectorAll('.lkbtn').forEach(b => b.classList.remove('on'));
      document.getElementById('lb-' + z).classList.add('on');

      const def = LEAK_DEF[z];
      const pos = LEAK_POS[z] || { x: 0, y: 2, z: 0 };
      const col = z === 'F' ? 0xFFAA00 : def.zone === 3 ? 0xFF2244 : def.zone === 1 ? 0x00FFE0 : 0xFF6600;
      createLeakParticles(pos, col);

      // Zone statuses
      ['zs1', 'zs2', 'zs3', 'zsf'].forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = '■ NOMINAL'; el.className = 'zst'; } });
      const sid = ['zs1', 'zs2', 'zs3', 'zsf'][def.zone - 1];
      document.getElementById(sid).textContent = z === 'F' ? '■ CRITICAL FAULT' : '■ ANOMALY DETECTED'; document.getElementById(sid).className = 'zst bad';

      // Go/No-Go
      document.getElementById('gng').className = 'ng';
      document.getElementById('gngl').textContent = 'NO-GO';
      document.getElementById('gngs').textContent = def.lbl.substring(0, 40);
      document.getElementById('sbadge').className = 'sbad';
      document.getElementById('stxt').textContent = z === 'F' ? 'CRITICAL FAULT' : 'ANOMALY DETECTED';

      const conf = 72 + APP.severity * 9 + Math.round(Math.random() * 5);
      const sev = ['', 'Small (2%)', 'Medium (8%)', 'Large (15%)'][APP.severity];
      const flow = [0, 2, 8, 15][APP.severity];
      document.getElementById('hv-conf').textContent = conf + '%'; document.getElementById('hv-conf').style.color = 'var(--red)';
      document.getElementById('al-z').textContent = def.lbl;
      document.getElementById('al-c').textContent = `Confidence: ${conf}% · Severity: ${sev} · Est. RUL Impact: -${flow * 4} hrs`;
      document.getElementById('alert').style.display = 'block';

      document.getElementById('ac').className = 'ac w';
      document.getElementById('acv').textContent = def.act; document.getElementById('acv').style.color = 'var(--orange)';

      const score = (0.7 + APP.severity * 0.95 + Math.random() * 0.3).toFixed(2);
      document.getElementById('ef-score').textContent = score; document.getElementById('ef-score').style.color = 'var(--red)';
      document.getElementById('ef-bar').style.width = Math.min(100, parseFloat(score) / 5 * 100) + '%'; document.getElementById('ef-bar').style.background = 'var(--red)';
      document.getElementById('ef-thresh').textContent = 'ABOVE THRESHOLD (2.50)'; document.getElementById('ef-thresh').style.color = 'var(--red)';
      document.getElementById('h-ef').textContent = score; document.getElementById('h-cos').textContent = (0.99 - parseFloat(score) * 0.065).toFixed(3);

      leakL.position.set(pos.x, pos.y, pos.z); leakL.color.setHex(col); leakL.intensity = 1.4;

      // Camera focus
      if (def.zone === 1) { cTgt.set(0, 1.2, -1.8); sTgt.theta = Math.PI + 0.8; sTgt.phi = 0.33; sTgt.r = 11; }
      else if (def.zone === 2) { cTgt.set(0.4, 1.1, 0.9); sTgt.theta = 0.45; sTgt.phi = 0.30; sTgt.r = 11; }
      else if (def.zone === 3) { cTgt.set(1.4, -0.8, 1.4); sTgt.theta = 0.18; sTgt.phi = 0.35; sTgt.r = 11; }
      else { cTgt.set(0, 1.1, 0.65); sTgt.theta = Math.PI + 0.5; sTgt.phi = 0.28; sTgt.r = 10; }

      updateSensors(z); renderEF(z);
    }

    function clearLeak() {
      APP.activeLeak = null; APP.autoRot = true;
      clearLeakParticles();
      document.querySelectorAll('.lkbtn').forEach(b => b.classList.remove('on'));
      ['zs1', 'zs2', 'zs3', 'zsf'].forEach(id => { const el = document.getElementById(id); if (el) { el.textContent = '■ NOMINAL'; el.className = 'zst'; } });
      document.getElementById('gng').className = 'go';
      document.getElementById('gngl').textContent = 'GO'; document.getElementById('gngs').textContent = 'All subsystems nominal · Health Index: 98.6%';
      document.getElementById('sbadge').className = 'sbok'; document.getElementById('stxt').textContent = 'ENGINE HEALTHY';
      document.getElementById('hv-conf').textContent = '—'; document.getElementById('hv-conf').style.color = 'var(--muted)';
      document.getElementById('alert').style.display = 'none';
      document.getElementById('ac').className = 'ac'; document.getElementById('acv').textContent = 'Engine nominal. All physics residuals within ±2% baseline tolerance. RUL > 1,200 hrs.'; document.getElementById('acv').style.color = 'var(--teal)';
      document.getElementById('ef-score').textContent = '0.14'; document.getElementById('ef-score').style.color = 'var(--gold)';
      document.getElementById('ef-bar').style.width = '5.6%'; document.getElementById('ef-bar').style.background = 'var(--teal)';
      document.getElementById('ef-thresh').textContent = 'BELOW THRESHOLD (2.50)'; document.getElementById('ef-thresh').style.color = 'var(--teal)';
      document.getElementById('h-ef').textContent = '0.14'; document.getElementById('h-cos').textContent = '0.998';
      leakL.intensity = 0;
      [1, 2, 3, 4].forEach(z => ZP[z].forEach(p => { const apply = m => { if (m.material && m.material.emissiveIntensity !== undefined) m.material.emissiveIntensity = 0; }; if (p.isGroup) p.children.forEach(apply); else apply(p); }));
      updateSensors(null); renderEF(null); cTgt.set(0, 0.6, 0);
    }

    function focusZone(z) {
      APP.activeZone = APP.activeZone === z ? null : z;
      document.querySelectorAll('.zcard').forEach(c => c.classList.remove('on'));
      if (APP.activeZone) {
        const ids = ['zc1', 'zc2', 'zc3', 'zcf']; document.getElementById(ids[z - 1]).classList.add('on');
        if (z === 1) { cTgt.set(0, 1.2, -1.8); sTgt.theta = Math.PI + 0.7; sTgt.phi = 0.32; sTgt.r = 11; }
        else if (z === 2) { cTgt.set(0.4, 1.1, 0.9); sTgt.theta = 0.45; sTgt.phi = 0.28; sTgt.r = 11; }
        else if (z === 3) { cTgt.set(1.4, -0.8, 1.4); sTgt.theta = 0.15; sTgt.phi = 0.33; sTgt.r = 11; }
        else { cTgt.set(0, 1.1, 0.65); sTgt.theta = Math.PI + 0.4; sTgt.phi = 0.25; sTgt.r = 10; }
      } else { cTgt.set(0, 0.6, 0); }
    }

    // Controls
    function onSev(v) { APP.severity = parseInt(v); document.getElementById('sev-v').textContent = ['', 'SM', 'MED', 'LGE'][v]; if (APP.activeLeak) simLeak(APP.activeLeak); }
    function onRPM(v) { APP.rpm = parseInt(v); document.getElementById('rpm-v').textContent = v; if (!APP.activeLeak) updateSensors(null); }
    function onLoad(v) { APP.load = parseInt(v); document.getElementById('load-v').textContent = v + '%'; if (!APP.activeLeak) updateSensors(null); }
    function onZoom(v) { sTgt.r = parseFloat(v); }
    function onOpacity(v) { const op = parseInt(v) / 100; document.getElementById('opac-v').textContent = v + '%'; EG.traverse(c => { if (c.isMesh && c.material) { c.material.transparent = op < 1; c.material.opacity = op; } }); }

    // Zone material pulse
    function pulseMats(lk, t) {
      [1, 2, 3, 4].forEach(z => ZP[z].forEach(p => {
        const apply = m => {
          if (m.isMesh && m.material) {
            if (Array.isArray(m.material)) {
              m.material.forEach(mat => { if (mat.emissiveIntensity !== undefined) mat.emissiveIntensity = 0; });
            } else if (m.material.emissiveIntensity !== undefined) {
              m.material.emissiveIntensity = 0;
            }
          }
        };
        if (p.isGroup) p.traverse(apply);
        else apply(p);
      }));
      if (!lk) return;
      const def = LEAK_DEF[lk]; if (!def) return;
      const pulse = 0.14 + 0.12 * Math.sin(t * 5.0);
      const col = lk === 'F' ? new THREE.Color(0xFFAA00) : new THREE.Color(0xFF2244);
      ZP[def.zone].forEach(p => {
        const apply = m => {
          if (m.isMesh && m.material) {
            if (Array.isArray(m.material)) {
              m.material.forEach(mat => {
                if (mat.emissiveIntensity !== undefined) { mat.emissive = col; mat.emissiveIntensity = pulse; }
              });
            } else if (m.material.emissiveIntensity !== undefined) {
              m.material.emissive = col;
              m.material.emissiveIntensity = pulse;
            }
          }
        };
        if (p.isGroup) p.traverse(apply);
        else apply(p);
      });
    }

    // Demo
    const DEMO_SEQ = [
      () => { clearLeak(); setCam('iso'); },
      () => { switchModel(1); },
      () => simLeak('A'),
      () => { clearLeak(); setTimeout(() => simLeak('B'), 350); },
      () => { clearLeak(); setTimeout(() => simLeak('C'), 350); },
      () => { clearLeak(); setCam('side'); },
      () => switchModel(2),
      () => simLeak('D'),
      () => { clearLeak(); setTimeout(() => simLeak('E'), 350); },
      () => { clearLeak(); setTimeout(() => simLeak('F'), 350); },
      () => { clearLeak(); switchModel(1); setCam('iso'); },
    ];
    let demoIdx = 0, demoInterval = null;
    function toggleDemo() {
      APP.demo = !APP.demo;
      const btn = document.getElementById('btn-demo');
      btn.classList.toggle('on', APP.demo);
      btn.textContent = APP.demo ? '⏹ STOP DEMO' : '▶ AUTO DEMO';
      if (APP.demo) {
        demoIdx = 0; DEMO_SEQ[0]();
        demoInterval = setInterval(() => { demoIdx = (demoIdx + 1) % DEMO_SEQ.length; DEMO_SEQ[demoIdx](); }, 4200);
      } else {
        clearInterval(demoInterval); demoInterval = null; clearLeak();
      }
    }

    // Keyboard
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyE') toggleExplode();
      if (e.code === 'KeyC') clearLeak();
      if (e.code === 'KeyD') toggleDemo();
      if (e.code === 'Digit1') setCam('iso');
      if (e.code === 'Digit2') setCam('front');
      if (e.code === 'Digit3') setCam('side');
      if (e.code === 'Digit4') setCam('top');
    });

    // ═══════════════════════════════════════════════
    // RENDER LOOP
    // ═══════════════════════════════════════════════
    const clock = new THREE.Clock();
    const sessionStart = Date.now();

    function tick() {
      requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      // Animate boxer pistons (horizontal opposed movement)
      if (modelData && modelData.pistons) {
        const rRad = (APP.rpm * Math.PI) / 30;
        modelData.pistons.forEach(({ g, dir, offset }) => {
          if (!ORIG.has(g)) return;
          const orig = ORIG.get(g);
          g.position.x = orig.x + dir * Math.sin(t * rRad * 0.12 + offset) * 0.22;
        });
      }

      // Propeller reduction rotation (i=2.43)
      if (modelData && modelData.propeller) {
        modelData.propeller.rotation.x += (APP.rpm / 60) * Math.PI * 2 * (1 / 60) * 0.41;
      }

      // Turbo spin
      if (modelData && modelData.turbo) {
        modelData.turbo.rotation.z += (APP.rpm / 60) * Math.PI * 2 * (1 / 60) * 2.8;
      }

      // Auto-rotate
      if (APP.autoRot && !drag && !camAnim.on) sTgt.theta += 0.0005;

      tickCamAnim();
      tickExplode();
      updateCamera();
      pulseMats(APP.activeLeak, t);

      // Lights
      if (APP.activeLeak) {
        accentL.color.setHex(APP.activeLeak === 'F' ? 0xFFAA00 : 0xFF2244);
        accentL.intensity = 0.6 + 0.4 * Math.sin(t * 5);
        leakL.intensity = 0.85 + 0.5 * Math.sin(t * 4.2);
      } else {
        accentL.intensity = 0.08 + 0.05 * Math.sin(t * 0.7);
        accentL.color.setHex(0xF5C518);
        leakL.intensity = 0;
      }
      fillL.position.x = -9 + Math.sin(t * 0.28) * 1.8;
      fillL.position.z = 8 + Math.cos(t * 0.35) * 1.8;

      tickParticles();
      flowOffset += 0.45;
      drawFlows();

      // Timer
      const el = Math.floor((Date.now() - sessionStart) / 1000);
      const tm = String(Math.floor(el / 60)).padStart(2, '0') + ':' + String(el % 60).padStart(2, '0');
      const hTimer = document.getElementById('h-timer'); if (hTimer) hTimer.textContent = tm;

      renderer.render(scene, camera);
      drawAxisRing();
    }

    // ═══════════════════════════════════════════════
    // INIT — loadModel called AFTER all functions defined
    // ═══════════════════════════════════════════════
    buildSensorsUI();
    updateSensors(null);
    renderEF(null);
    loadModel(1);   // safe — clearLeakParticles and clearScene are both defined above this point
    tick();

    // ═══════════════════════════════════════════════
    // BLENDER-STYLE NAV BAR FUNCTIONS
    // ═══════════════════════════════════════════════
    function navSpin(delta) {
      sTgt.theta += delta;
      APP.autoRot = false;
    }
    function navTilt(delta) {
      sTgt.phi = Math.max(0.05, Math.min(Math.PI / 2.05, sTgt.phi + delta));
    }
    function navZoom(delta) {
      sTgt.r = Math.max(4, Math.min(30, sTgt.r + delta));
      document.getElementById('zoom-sl').value = sTgt.r;
    }
    function navPitch(delta) {
      sTgt.phi = Math.max(0.05, Math.min(Math.PI / 2.05, sTgt.phi + delta));
    }
    function navReset() {
      setCam('iso');
      APP.autoRot = true;
    }
    function navFit() {
      sTgt.r = 16;
      document.getElementById('zoom-sl').value = 16;
    }
    let isOrtho = false;
    function toggleOrtho() {
      isOrtho = !isOrtho;
      const btn = document.getElementById('nb-ortho');
      if (isOrtho) {
        // Switch to ortho-like (very long focal length)
        camera.fov = 12;
        sTgt.r = Math.min(30, sTgt.r * 2.8);
        btn.textContent = 'O';
        btn.title = 'Perspective mode';
      } else {
        camera.fov = 42;
        sTgt.r = Math.max(4, sTgt.r / 2.8);
        btn.textContent = 'P';
        btn.title = 'Orthographic mode';
      }
      camera.updateProjectionMatrix();
    }
    let rollAngle = 0;
    function navRoll() {
      rollAngle += 0.15;
      camera.up.set(Math.sin(rollAngle) * 0.3, Math.cos(rollAngle), 0).normalize();
    }

    // ═══════════════════════════════════════════════
    // INTRO CINEMATIC SEQUENCE
    // ═══════════════════════════════════════════════
    function runIntroSequence() {
      const overlay = document.getElementById('intro-overlay');
      const cw = document.getElementById('cw');
      // After 2.4s, fade out intro overlay
      setTimeout(() => {
        overlay.classList.add('done');
        // Remove after animation completes
        setTimeout(() => {
          overlay.style.display = 'none';
        }, 800);
      }, 2400);
    }

    // Axis ring mini display (draws XYZ axes)
    function drawAxisRing() {
      const canvas = document.getElementById('axis-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.width, H = canvas.height;
      const cx = W / 2, cy = H / 2, r = W * 0.38;
      ctx.clearRect(0, 0, W, H);

      // Get camera direction to project axes
      const axes = [
        { dir: new THREE.Vector3(1, 0, 0), col: '#FF4444', lbl: 'X' },
        { dir: new THREE.Vector3(0, 1, 0), col: '#44FF88', lbl: 'Y' },
        { dir: new THREE.Vector3(0, 0, 1), col: '#4488FF', lbl: 'Z' },
      ];

      axes.forEach(({ dir, col, lbl }) => {
        const v = dir.clone().applyQuaternion(camera.quaternion).project(camera);
        // Just use the view-space dot products
        const camRight = new THREE.Vector3(); const camUp = new THREE.Vector3(); const camFwd = new THREE.Vector3();
        camera.matrix.extractBasis(camRight, camUp, camFwd);
        const ex = dir.dot(camRight);
        const ey = -dir.dot(camUp);
        const ex2 = cx + ex * r, ey2 = cy + ey * r;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex2, ey2);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = col; ctx.font = 'bold 8px Share Tech Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(lbl, ex2 + (ex2 - cx) * 0.22, ey2 + (ey2 - cy) * 0.22);
        // Dot at center
        ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(245,197,24,.8)'; ctx.fill();
      });
    }

  