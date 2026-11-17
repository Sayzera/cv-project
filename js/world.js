/* CV world (three.js r149). One tower house per CV section along a boulevard, a medieval kit
 * (Quaternius, CC0) for the buildings, a countryside of hamlets / fields / windmills around it,
 * and an animated character (Quaternius Universal Animation Library, CC0).
 * WASD / arrows walk relative to the camera, Shift runs, 1 toggles sprint (glowing ring + sparkles),
 * Space jumps, E at a door reads the section large. Stepping onto a plot opens its section.
 * Mouse drag orbits, wheel zooms; on touch the finger is a joystick and a tap jumps.
 * Content comes from js/cv-data.js (window.CV). */
(() => {
  const CV = window.CV || { sections: [] };
  const sections = Array.isArray(CV.sections) ? CV.sections : [];
  const host = document.querySelector("[data-world]");
  if (!host) return;
  const stage = host.querySelector("[data-stage]");
  const panel = host.querySelector("[data-panel]");
  const navEl = host.querySelector("[data-nav]");
  const loadingEl = host.querySelector("[data-loading]");
  const helpEl = host.querySelector("[data-help]");
  const cvEl = host.querySelector("[data-cv]");
  const introEl = host.querySelector("[data-intro]");
  const ASSETS = {
    kit: "models/village-kit.glb",
    country: "models/village-mv.glb",
    character: "models/character.glb",
  };

  /* ── helpers ─────────────────────────────────────────────────────────── */
  function esc(text) {
    return String(text == null ? "" : text).replace(/[&<>"']/g, (ch) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }
  function safeHref(href) {
    const h = String(href || "").trim();
    return /^(https?:|mailto:|tel:|#|\/|\.\/|[\w-]+[./])/i.test(h) ? h : "#";
  }
  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }
  function hashOf(text) {
    let h = 2166136261;
    const s = String(text || "");
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed || 1;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── CV markup (panel + classic view) ───────────────────────────────── */
  function sectionBody(sec) {
    let html = "";
    if (sec.text) html += `<p class="cv-text">${esc(sec.text)}</p>`;
    if (Array.isArray(sec.facts) && sec.facts.length) {
      html += `<dl class="cv-facts">${sec.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${f.href ? `<a href="${esc(safeHref(f.href))}" target="_blank" rel="noopener noreferrer">${esc(f.value)}</a>` : esc(f.value)}</dd></div>`).join("")}</dl>`;
    }
    if (Array.isArray(sec.items) && sec.items.length) {
      html += `<div class="cv-items">${sec.items.map((it) => `<article class="cv-item">
          <header>
            <h3>${it.link ? `<a href="${esc(safeHref(it.link))}" target="_blank" rel="noopener noreferrer">${esc(it.heading)}</a>` : esc(it.heading)}</h3>
            ${it.date ? `<time>${esc(it.date)}</time>` : ""}
          </header>
          ${it.sub ? `<p class="cv-item__sub">${esc(it.sub)}</p>` : ""}
          ${it.text ? `<p>${esc(it.text)}</p>` : ""}
          ${Array.isArray(it.bullets) && it.bullets.length ? `<ul class="cv-bullets">${it.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
          ${Array.isArray(it.links) && it.links.length ? `<p class="cv-item__links">${it.links.map((l) => `<a href="${esc(safeHref(l.href))}" target="_blank" rel="noopener noreferrer">${esc(l.label)} ↗</a>`).join("")}</p>` : ""}
          ${Array.isArray(it.tags) && it.tags.length ? `<ul class="cv-tags">${it.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        </article>`).join("")}</div>`;
    }
    if (Array.isArray(sec.tags) && sec.tags.length) {
      html += `<ul class="cv-tags is-big">${sec.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
    }
    if (Array.isArray(sec.links) && sec.links.length) {
      html += `<ul class="cv-links">${sec.links.map((l) => (l.download
        ? `<li><a class="is-download" href="${esc(safeHref(l.href))}" download>${esc(l.label)}</a></li>`
        : `<li><a href="${esc(safeHref(l.href))}" target="_blank" rel="noopener noreferrer">${esc(l.label)} →</a></li>`)).join("")}</ul>`;
    }
    return html;
  }

  host.querySelector("[data-cv-name]").textContent = CV.name || "";
  host.querySelector("[data-cv-title]").textContent = CV.title || "";
  const pdfHref = CV.pdf ? safeHref(CV.pdf) : "";
  const pdfBtn = host.querySelector("[data-cv-pdf]");
  if (pdfBtn && pdfHref) {
    pdfBtn.href = pdfHref;
    pdfBtn.hidden = false;
  }
  host.querySelector("[data-cv-body]").innerHTML = `<header class="cv-head"><h1>${esc(CV.name)}</h1><p>${esc(CV.title)}</p>
      ${pdfHref ? `<a class="hud__btn is-download" href="${esc(pdfHref)}" download>⬇ PDF olarak indir</a>` : ""}</header>
    ${sections.map((sec) => `<section class="cv-sec" style="--c:${esc(sec.color || "#f0b63d")}">
      <h2><span aria-hidden="true">${esc(sec.icon || "")}</span> ${esc(sec.title)}</h2>${sectionBody(sec)}</section>`).join("")}`;

  /* overlays: help + classic CV */
  function overlayOpen(el) {
    return Boolean(el && !el.hidden);
  }
  function anyOverlay() {
    return overlayOpen(helpEl) || overlayOpen(cvEl) || overlayOpen(introEl);
  }
  function openOverlay(el) {
    if (!el) return;
    keys.clear();
    el.hidden = false;
    const btn = el.querySelector("button");
    if (btn) btn.focus({ preventScroll: true });
  }
  function closeOverlay(el) {
    if (!el || el.hidden) return;
    el.hidden = true;
    host.focus({ preventScroll: true });
  }
  const keys = new Set();
  host.querySelector("[data-help-open]").addEventListener("click", () => openOverlay(helpEl));
  host.querySelector("[data-help-close]").addEventListener("click", () => closeOverlay(helpEl));
  host.querySelector("[data-cv-open]").addEventListener("click", () => openOverlay(cvEl));
  host.querySelector("[data-cv-close]").addEventListener("click", () => closeOverlay(cvEl));
  [helpEl, cvEl].forEach((el) => el.addEventListener("click", (event) => {
    if (event.target === el) closeOverlay(el);
  }));

  const THREE = window.THREE;
  const hasWebGL = (() => {
    try {
      const c = document.createElement("canvas");
      return Boolean(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (_err) {
      return false;
    }
  })();
  if (!THREE || !hasWebGL || !sections.length || !stage) {
    /* no 3D: the classic CV is the page */
    host.classList.add("is-flat");
    if (loadingEl) loadingEl.hidden = true;
    cvEl.hidden = false;
    return;
  }

  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  const SPACING = 20;
  const PLOT_W = 15;
  const PLOT_D = 15;
  const PLOT_Z = -6;
  const STREET_Z = 7.5;
  const FLOOR_H = 1.1;
  const maxX = (sections.length - 1) * SPACING;
  const WORLD_MIN_X = -210;
  const WORLD_MAX_X = maxX + 210;
  const WORLD_MID_X = (WORLD_MIN_X + WORLD_MAX_X) / 2;
  /* how far the character may go: the boulevard plus the countryside round it */
  const FIELD_PAD_X = 60;
  const MIN_X = -SPACING - FIELD_PAD_X;
  const MAX_X = maxX + SPACING + FIELD_PAD_X;
  const WALK_Z_MIN = PLOT_Z - PLOT_D / 2 - 52;
  const WALK_Z_MAX = STREET_Z + 78;
  const QUARTER = Math.PI / 2;

  const mats = new Map();
  function mat(color, opts) {
    const key = `${color}|${JSON.stringify(opts || {})}`;
    if (!mats.has(key)) mats.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...(opts || {}) }));
    return mats.get(key);
  }
  function glow(color, intensity) {
    return mat(color, { emissive: color, emissiveIntensity: intensity || 1.4 });
  }
  function box(w, h, d, material, x, y, z, noShadow) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = !noShadow;
    mesh.receiveShadow = true;
    return mesh;
  }
  function colorOf(hex, fallback) {
    try {
      return new THREE.Color(hex || fallback);
    } catch (_err) {
      return new THREE.Color(fallback);
    }
  }

  /* ── medieval village kit (Quaternius "Medieval Village MegaKit", CC0) ──
   * One node per modular piece (walls are 2 units wide and 3 tall, facing +z). Pieces are placed
   * as instances, grouped into chunks so whole chunks can be skipped when off screen. */
  const TINTABLE = new Set(["MI_RoundTiles"]);
  const WHITE = new THREE.Color(0xffffff);
  const _pm = new THREE.Matrix4();
  function pieceMatrix(ox, oy, oz, scale, rot, px, py, pz) {
    const m = new THREE.Matrix4().makeTranslation(ox, oy, oz);
    m.multiply(_pm.makeRotationY(rot || 0));
    m.multiply(_pm.makeScale(scale, scale, scale));
    m.multiply(_pm.makeTranslation(px || 0, py || 0, pz || 0));
    return m;
  }
  function createKit(gltf) {
    const parts = new Map();
    const materials = new Map();
    gltf.scene.children.forEach((node) => {
      const list = [];
      node.traverse((obj) => {
        if (!obj.isMesh) return;
        list.push(obj);
        materials.set(obj.material.name, obj.material);
      });
      parts.set(node.name, list);
    });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const chunks = new Map();
    const frustum = new THREE.Frustum();
    const pv = new THREE.Matrix4();
    const entries = new Map();
    function chunkOf(id) {
      if (!chunks.has(id)) {
        const group = new THREE.Group();
        scene.add(group);
        chunks.set(id, { group, box: new THREE.Box3() });
      }
      return chunks.get(id);
    }
    return {
      has: (name) => parts.has(name),
      material: (name) => materials.get(name) || null,
      chunkBox: (id) => chunkOf(id).box,
      place(name, matrix, opts) {
        if (!parts.has(name)) return;
        const o = opts || {};
        const chunk = o.chunk || 0;
        const key = `${chunk}|${name}`;
        let entry = entries.get(key);
        if (!entry) {
          entry = { name, chunk, matrices: [], tints: [], glass: [] };
          entries.set(key, entry);
        }
        entry.matrices.push(matrix);
        entry.tints.push(o.tint != null ? new THREE.Color(o.tint) : null);
        entry.glass.push(new THREE.Color(o.glass != null ? o.glass : 0x141a26));
      },
      build() {
        entries.forEach((entry) => {
          const group = chunkOf(entry.chunk).group;
          const n = entry.matrices.length;
          const tinted = entry.tints.some(Boolean);
          parts.get(entry.name).forEach((src) => {
            const glass = src.material.name === "MI_WindowGlass";
            const mesh = new THREE.InstancedMesh(src.geometry, glass ? glassMat : src.material, n);
            for (let i = 0; i < n; i += 1) mesh.setMatrixAt(i, entry.matrices[i]);
            if (glass) {
              for (let i = 0; i < n; i += 1) mesh.setColorAt(i, entry.glass[i]);
            } else if (tinted && TINTABLE.has(src.material.name)) {
              for (let i = 0; i < n; i += 1) mesh.setColorAt(i, entry.tints[i] || WHITE);
            }
            mesh.castShadow = !glass;
            mesh.receiveShadow = true;
            /* r149 culls instanced meshes by the base geometry's bounds; groups are culled below */
            mesh.frustumCulled = false;
            group.add(mesh);
          });
        });
      },
      /* free-moving instances (wagons): one InstancedMesh per primitive, matrices set by the caller */
      instanced(name, count) {
        return (parts.get(name) || []).map((src) => {
          const mesh = new THREE.InstancedMesh(src.geometry, src.material, count);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
          scene.add(mesh);
          return mesh;
        });
      },
      cull(cam) {
        cam.updateMatrixWorld();
        pv.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
        frustum.setFromProjectionMatrix(pv);
        chunks.forEach((c) => {
          c.group.visible = c.box.isEmpty() || frustum.intersectsBox(c.box);
        });
      },
    };
  }
  function loadGltf(url) {
    return new Promise((resolve) => {
      if (!THREE.GLTFLoader) {
        resolve(null);
        return;
      }
      new THREE.GLTFLoader().load(url, resolve, undefined, () => resolve(null));
    });
  }

  /* street lamps run on a SPACING/2 grid along the boulevard */
  const LAMP_X0 = -SPACING;
  const LAMP_X1 = maxX + SPACING;

  /* ── renderer / scene ────────────────────────────────────────────────── */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  {
    const sky = document.createElement("canvas");
    sky.width = 4;
    sky.height = 512;
    const ctx = sky.getContext("2d");
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#050817");
    grad.addColorStop(0.5, "#161a3a");
    grad.addColorStop(0.78, "#3d2448");
    grad.addColorStop(0.92, "#8a3b3a");
    grad.addColorStop(1, "#eb5e22");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 512);
    const tex = new THREE.CanvasTexture(sky);
    tex.encoding = THREE.sRGBEncoding;
    scene.background = tex;
  }
  scene.fog = new THREE.Fog(0x1b1a3a, 80, 220);

  const camera = new THREE.PerspectiveCamera(38, 2, 0.5, 700);

  scene.add(new THREE.HemisphereLight(0x8fa8ff, 0x2a1d16, 0.5));
  const moon = new THREE.DirectionalLight(0xffd8b0, 0.9);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 260;
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.02;
  scene.add(moon);
  scene.add(moon.target);
  let shadowSpan = 0;
  function fitShadow(span) {
    const s = Math.round(clamp(span, 40, 140) / 10) * 10;
    if (s === shadowSpan) return;
    shadowSpan = s;
    const cam = moon.shadow.camera;
    cam.left = -s;
    cam.right = s;
    cam.top = s;
    cam.bottom = -s;
    cam.updateProjectionMatrix();
  }

  /* moon disc + stars */
  {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
    g.addColorStop(0, "rgba(255,244,214,1)");
    g.addColorStop(0.35, "rgba(255,226,170,0.9)");
    g.addColorStop(1, "rgba(255,200,140,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, fog: false, depthWrite: false, transparent: true }));
    disc.scale.set(26, 26, 1);
    disc.position.set(maxX * 0.3 - 40, 80, -170);
    scene.add(disc);

    const r = rng(7);
    const pos = [];
    for (let i = 0; i < 1200; i += 1) {
      pos.push(WORLD_MIN_X - 50 + r() * (WORLD_MAX_X - WORLD_MIN_X + 100), 40 + r() * 140, -120 - r() * 120);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, transparent: true, opacity: 0.85, fog: false })));
  }

  /* ground, boulevard, sidewalks, lane marks, lamps, trees */
  const span = WORLD_MAX_X - WORLD_MIN_X;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(span, 420), mat(0x14182a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD_MID_X, 0, -60);
  ground.receiveShadow = true;
  scene.add(ground);

  const road = new THREE.Mesh(new THREE.PlaneGeometry(span, 8), mat(0x22262f, { roughness: 0.55, metalness: 0.15 }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(WORLD_MID_X, 0.02, STREET_Z);
  road.receiveShadow = true;
  scene.add(road);
  const sidewalks = [
    box(span, 0.25, 2, mat(0x3a3f4d), WORLD_MID_X, 0.12, STREET_Z - 5, true),
    box(span, 0.25, 2, mat(0x3a3f4d), WORLD_MID_X, 0.12, STREET_Z + 5, true),
  ];
  sidewalks.forEach((s) => scene.add(s));
  /* neon edges + lane dashes: modern street dressing, hidden once the medieval kit is in */
  const roadDecor = [
    box(span, 0.3, 0.12, glow(0x6ec6ff, 0.6), WORLD_MID_X, 0.16, STREET_Z - 4, true),
    box(span, 0.3, 0.12, glow(0x6ec6ff, 0.6), WORLD_MID_X, 0.16, STREET_Z + 4, true),
  ];
  {
    const count = Math.ceil(span / 5);
    const dash = new THREE.InstancedMesh(new THREE.BoxGeometry(2, 0.03, 0.18), glow(0xf0b63d, 1), count);
    const m = new THREE.Matrix4();
    for (let i = 0; i < count; i += 1) {
      m.makeTranslation(WORLD_MIN_X + i * 5, 0.04, STREET_Z);
      dash.setMatrixAt(i, m);
    }
    roadDecor.push(dash);
  }
  roadDecor.forEach((o) => scene.add(o));
  {
    const lampMat = mat(0x50566a, { metalness: 0.5, roughness: 0.4 });
    const r = rng(11);
    for (let x = LAMP_X0; x <= LAMP_X1; x += SPACING / 2) {
      scene.add(box(0.18, 4.2, 0.18, lampMat, x, 2.1, STREET_Z - 4.6));
      scene.add(box(1.1, 0.12, 0.18, lampMat, x + 0.45, 4.2, STREET_Z - 4.6));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), glow(0xffe2a8, 2));
      bulb.position.set(x + 0.95, 4.05, STREET_Z - 4.6);
      scene.add(bulb);
      const pool = new THREE.Mesh(
        new THREE.CircleGeometry(2.6, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.12, depthWrite: false }),
      );
      pool.rotation.x = -Math.PI / 2;
      pool.position.set(x + 0.95, 0.05, STREET_Z - 3.2);
      scene.add(pool);
      if (r() > 0.35) {
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), mat(0x2b7a4b));
        t.position.set(x + SPACING / 4, 2, STREET_Z + 5.2);
        t.castShadow = true;
        scene.add(t);
        scene.add(box(0.18, 1.4, 0.18, mat(0x5b3d24), x + SPACING / 4, 0.8, STREET_Z + 5.2));
      }
    }
  }

  /* background skyline (without the kit) */
  function skylineTexture(seed) {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#171b2c";
    ctx.fillRect(0, 0, 64, 256);
    const r = rng(seed);
    for (let y = 0; y < 256; y += 10) {
      for (let x = 0; x < 64; x += 10) {
        const v = r();
        ctx.fillStyle = v > 0.82 ? "#ffcf73" : v > 0.78 ? "#9fd3ff" : "#0d101b";
        ctx.fillRect(x + 3, y + 3, 5, 6);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }
  function buildSkyline() {
    const skyMats = [1, 2, 3].map((seed) => {
      const tex = skylineTexture(seed * 97);
      return new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.9 });
    });
    const r = rng(23);
    const unit = new THREE.BoxGeometry(1, 1, 1);
    for (let x = -200; x < maxX + 200; x += 4 + r() * 5) {
      const rows = r() > 0.5 ? 2 : 1;
      for (let k = 0; k < rows; k += 1) {
        const w = 4 + r() * 6;
        const h = 8 + r() * 34 + k * 12;
        const mesh = new THREE.Mesh(unit, skyMats[Math.floor(r() * skyMats.length)]);
        mesh.scale.set(w, h, w);
        mesh.position.set(x + r() * 3, h / 2, WALK_Z_MIN - 8 - k * 22 - r() * 14);
        scene.add(mesh);
      }
    }
  }

  /* village backdrop: rows of dark pines and low hills */
  function buildForest() {
    const r = rng(23);
    const pines = [];
    for (let x = WORLD_MIN_X + 10; x < WORLD_MAX_X - 10; x += 2.2 + r() * 2.4) {
      const rows = 1 + Math.floor(r() * 3);
      for (let k = 0; k < rows; k += 1) {
        pines.push([x + r() * 2, WALK_Z_MIN - 6 - k * 9 - r() * 8, 4 + r() * 6 + k * 2]);
        pines.push([x + r() * 2, WALK_Z_MAX + 6 + k * 9 + r() * 8, 4 + r() * 6 + k * 2]);
      }
    }
    const cone = new THREE.ConeGeometry(1, 1, 7);
    cone.translate(0, 0.5, 0);
    const foliage = new THREE.InstancedMesh(cone, mat(0x0f2219, { roughness: 1 }), pines.length);
    const trunk = new THREE.BoxGeometry(1, 1, 1);
    trunk.translate(0, 0.5, 0);
    const trunks = new THREE.InstancedMesh(trunk, mat(0x3b2a1c), pines.length);
    const m = new THREE.Matrix4();
    pines.forEach(([x, z, h], i) => {
      m.makeScale(h * 0.32, h, h * 0.32).setPosition(x, h * 0.18, z);
      foliage.setMatrixAt(i, m);
      m.makeScale(0.35, h * 0.25, 0.35).setPosition(x, 0, z);
      trunks.setMatrixAt(i, m);
    });
    [foliage, trunks].forEach((o) => {
      o.castShadow = true;
      o.frustumCulled = false;
      scene.add(o);
    });
    const hillMat = mat(0x0d1c14, { roughness: 1 });
    for (let x = WORLD_MIN_X - 50; x < WORLD_MAX_X + 50; x += 50 + r() * 40) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillMat);
      hill.scale.set(45 + r() * 40, 14 + r() * 22, 30);
      hill.position.set(x, 0, WALK_Z_MIN - 45 - r() * 30);
      scene.add(hill);
    }
  }

  /* ── section plots ───────────────────────────────────────────────────── */
  const pickables = [];
  const plots = [];
  const labels = [];
  const rings = [];
  /* solid footprints (world AABBs; h = how high you must jump to clear it) and tower doors */
  const colliders = [];
  const doors = [];
  function solid(cx, cz, hx, hz, h) {
    colliders.push({ x0: cx - hx, x1: cx + hx, z0: cz - hz, z1: cz + hz, h: h == null ? Infinity : h });
  }

  function windowTexture(cols, rows, lit, seed) {
    const cell = 16;
    const canvas = document.createElement("canvas");
    canvas.width = cols * cell;
    canvas.height = Math.max(1, rows) * cell;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#2a3040";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const r = rng(seed);
    for (let i = 0; i < cols * rows; i += 1) {
      const cx = (i % cols) * cell;
      const cy = Math.floor(i / cols) * cell;
      ctx.fillStyle = r() < lit ? (r() > 0.25 ? "#ffd66b" : "#fff1c2") : "#10141f";
      ctx.fillRect(cx + 3, cy + 3, cell - 6, cell - 5);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }

  function labelSprite(sec) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 168;
    const ctx = canvas.getContext("2d");
    const rr = 30;
    ctx.fillStyle = "rgba(10, 12, 24, 0.82)";
    ctx.beginPath();
    ctx.moveTo(rr, 8);
    ctx.arcTo(632, 8, 632, 140, rr);
    ctx.arcTo(632, 140, 8, 140, rr);
    ctx.arcTo(8, 140, 8, 8, rr);
    ctx.arcTo(8, 8, 632, 8, rr);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(300, 140);
    ctx.lineTo(320, 164);
    ctx.lineTo(340, 140);
    ctx.fill();
    ctx.fillStyle = sec.color || "#f0b63d";
    ctx.fillRect(30, 118, 580, 8);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 56px system-ui, -apple-system, Segoe UI, sans-serif";
    let name = `${sec.icon || ""} ${sec.title || ""}`.trim();
    while (ctx.measureText(name).width > 580 && name.length > 4) name = `${name.slice(0, -2)}…`;
    ctx.fillText(name, 320, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true, fog: false }));
    sprite.scale.set(10, 2.625, 1);
    sprite.renderOrder = 10;
    return sprite;
  }

  function house(x, z, wall, roof, r, size) {
    const g = new THREE.Group();
    const w = size || 1.6 + r() * 0.6;
    const h = size ? size * 0.9 : 1.2 + r() * 0.6;
    g.add(box(w, h, w, mat(wall), 0, h / 2, 0));
    const cone = new THREE.Mesh(new THREE.ConeGeometry(w * 0.82, 1, 4), mat(roof));
    cone.position.y = h + 0.5;
    cone.rotation.y = Math.PI / 4;
    cone.castShadow = true;
    g.add(cone);
    const win = glow(0xffd66b);
    g.add(box(0.4, 0.4, 0.05, win, -w * 0.22, h * 0.55, w / 2 + 0.01, true));
    g.add(box(0.4, 0.4, 0.05, win, w * 0.22, h * 0.55, w / 2 + 0.01, true));
    g.position.set(x, 0.3, z);
    return g;
  }
  function tree(x, z, r) {
    const g = new THREE.Group();
    g.add(box(0.2, 0.8, 0.2, mat(0x6b4a2b), 0, 0.4, 0));
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.7 + r() * 0.3, 1.8 + r() * 0.6, 7), mat(0x2f9e5b));
    c.position.y = 1.7;
    c.castShadow = true;
    g.add(c);
    g.position.set(x, 0.3, z);
    return g;
  }

  /* kit scales: the tower footprint is 3×3 wall modules (6 units → 5.4), cottages 2×2 modules */
  const TOWER_S = 0.9;
  const KIT_FLOOR_H = 3 * TOWER_S;
  const COTTAGE_S = 0.36;

  let kit = null;
  let countryKit = null;

  function buildCity() {
    for (let x = LAMP_X0; x <= LAMP_X1; x += SPACING / 2) solid(x, STREET_Z - 4.6, 0.15, 0.15);
    if (kit) buildForest();
    else buildSkyline();
    sections.forEach((sec, index) => {
      const bx = index * SPACING;
      const r = rng(hashOf(sec.id || sec.title || index));
      const tint = colorOf(sec.color, "#f0b63d");
      const group = new THREE.Group();
      group.position.set(bx, 0, PLOT_Z);
      scene.add(group);

      const chunk = Math.floor(index / 3);
      const K = (name, ox, oy, oz, s, rot, px, py, pz, opts) => (
        kit ? kit.place(name, pieceMatrix(bx + ox, oy, PLOT_Z + oz, s, rot, px, py, pz), { chunk, ...(opts || {}) }) : null
      );
      if (kit) {
        kit.chunkBox(chunk).union(new THREE.Box3(
          new THREE.Vector3(bx - PLOT_W / 2 - 12, 0, PLOT_Z - PLOT_D / 2 - 12),
          new THREE.Vector3(bx + PLOT_W / 2 + 12, 40, PLOT_Z + PLOT_D / 2 + 12),
        ));
      }

      const plotMat = new THREE.MeshStandardMaterial({ color: 0x1f5a3f, roughness: 0.9, emissive: tint, emissiveIntensity: 0 });
      const plot = box(PLOT_W, 0.3, PLOT_D, plotMat, 0, 0.15, 0);
      plot.userData.index = index;
      group.add(plot);
      pickables.push(plot);
      plots.push(plotMat);

      const ringMat = new THREE.LineBasicMaterial({ color: tint, transparent: true, opacity: 0 });
      const ring = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PLOT_W + 0.5, 0.34, PLOT_D + 0.5)), ringMat);
      ring.position.y = 0.17;
      group.add(ring);
      rings.push(ringMat);

      const floors = Math.round(clamp(Number(sec.floors) || 3, 1, 8));
      const W = 5.4;
      let y = 0.3;
      let top;
      solid(bx, PLOT_Z - 1, W / 2 + 0.4, W / 2 + 0.4);
      doors.push({ index, x: bx, z: PLOT_Z - 1 + W / 2 + 0.9 });

      if (kit) {
        /* stone plinth, then the tower house: brick ground floor with the door to the street,
         * timber-and-plaster floors above, one window per wall module (mostly lit) */
        const brick = kit.material("MI_Brick");
        group.add(box(W + 0.8, 0.3, W + 0.8, brick || mat(0x4a4f5e), 0, y + 0.15, -1));
        y += 0.3;
        const oy = y;
        for (let f = 0; f < floors; f += 1) {
          for (let side = 0; side < 4; side += 1) {
            const a = side * QUARTER;
            for (let k = -1; k <= 1; k += 1) {
              const px = k * 2;
              const py = f * 3;
              if (f === 0 && side === 0 && k === 0) {
                K("Wall_UnevenBrick_Door_Round", 0, oy, -1, TOWER_S, a, px, py, 3);
                K("Door_4_Round", 0, oy, -1, TOWER_S, a, px - 0.53, py, 3);
                continue;
              }
              const lit = r() < 0.78;
              const color = lit ? new THREE.Color(r() > 0.25 ? 0xffb43c : 0xffd27a).multiplyScalar(1.1) : new THREE.Color(0x141a26);
              K(f === 0 ? "Wall_UnevenBrick_Window_Wide_Round" : "Wall_Plaster_Window_Wide_Flat", 0, oy, -1, TOWER_S, a, px, py, 3);
              K(f === 0 ? "Window_Wide_Round1" : "Window_Wide_Flat1", 0, oy, -1, TOWER_S, a, px, py, 3, { glass: color });
              if (!lit) K("WindowShutters_Wide_Flat_Closed", 0, oy, -1, TOWER_S, a, px, py, 3);
            }
            K("Corner_Exterior_Wood", 0, oy, -1, TOWER_S, a, 3, f * 3, 3);
          }
        }
        const h = floors * KIT_FLOOR_H;
        const hit = new THREE.Mesh(new THREE.BoxGeometry(W, h, W), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.set(0, oy + h / 2, -1);
        hit.userData.index = index;
        group.add(hit);
        pickables.push(hit);
        const roofTint = new THREE.Color(0xffffff).lerp(tint, 0.45);
        K("Roof_RoundTiles_6x6", 0, oy, -1, TOWER_S, 0, 0, floors * 3, 0, { tint: roofTint });
        K("Roof_Front_Brick6", 0, oy, -1, TOWER_S, 0, 0, floors * 3, 3);
        K("Roof_Front_Brick6", 0, oy, -1, TOWER_S, Math.PI, 0, floors * 3, 3);
        K("Prop_Chimney", 0, oy, -1, TOWER_S, 0, 1.5, floors * 3 + 1, 0);
        top = oy + h + 4.9 * TOWER_S;
      } else {
        const cols = 4;
        const tex = windowTexture(cols, floors, 0.78, hashOf(sec.id) + 3);
        const side = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1, roughness: 0.35, metalness: 0.35 });
        const roof = mat(tint.getHex(), { metalness: 0.3, roughness: 0.5 });
        const h = floors * FLOOR_H * 2;
        group.add(box(W + 0.8, 0.5, W + 0.8, mat(0x4a4f5e), 0, y + 0.25, -1));
        y += 0.5;
        const tower = new THREE.Mesh(new THREE.BoxGeometry(W, h, W), [side, side, roof, roof, side, side]);
        tower.position.set(0, y + h / 2, -1);
        tower.castShadow = true;
        tower.receiveShadow = true;
        tower.userData.index = index;
        group.add(tower);
        pickables.push(tower);
        y += h;
        group.add(box(W + 0.3, 0.25, W + 0.3, roof, 0, y + 0.12, -1));
        top = y + 0.25;
      }

      /* flag in the section colour */
      group.add(box(0.1, 2.4, 0.1, mat(0xcfd3dc), 0, top + 1.2, -1));
      group.add(box(1.4, 0.8, 0.05, glow(tint.getHex()), 0.75, top + 2, -1));
      top += 2.6;

      /* a cottage on each front corner, trees at the back */
      [-1, 1].forEach((sx) => {
        const hx = sx * (PLOT_W / 2 - 1.8);
        const hz = PLOT_D / 2 - 1.8;
        solid(bx + hx, PLOT_Z + hz, 0.45, 0.45, 2.4);
        if (kit) cottage(K, hx, hz, sx > 0 ? roofTint2(tint) : null, COTTAGE_S);
        else group.add(house(hx, hz, 0xe9c46a, tint.getHex(), r));
      });
      for (let i = 0; i < 3; i += 1) {
        const tx = -PLOT_W / 2 + 1.4 + r() * 1.5;
        const tz = -PLOT_D / 2 + 1.4 + i * 2;
        group.add(tree(tx, tz, r));
        group.add(tree(-tx, tz + r(), r));
        solid(bx + tx, PLOT_Z + tz, 0.2, 0.2);
        solid(bx - tx, PLOT_Z + tz, 0.2, 0.2);
      }

      const label = labelSprite(sec);
      label.position.set(0, top + 2.8, -1);
      group.add(label);
      labels.push({ sprite: label, baseY: top + 2.8 });
    });

    if (kit) {
      kit.build();
      /* cobbled street and brick sidewalks from the kit's textures */
      const tiled = (tex, rx, ry) => {
        if (!tex) return null;
        const t = tex.clone();
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(rx, ry);
        t.needsUpdate = true;
        return t;
      };
      const cobble = kit.material("MI_UnevenBrick");
      if (cobble && cobble.map) {
        road.material = new THREE.MeshStandardMaterial({
          map: tiled(cobble.map, span / 3, 8 / 3),
          normalMap: tiled(cobble.normalMap, span / 3, 8 / 3),
          color: 0x8d8f9c,
          roughness: 0.95,
        });
      }
      const brick = kit.material("MI_Brick");
      if (brick && brick.map) {
        const walk = new THREE.MeshStandardMaterial({ map: tiled(brick.map, span / 2, 1), color: 0x9a96a0, roughness: 0.9 });
        sidewalks.forEach((s) => { s.material = walk; });
      }
      roadDecor.forEach((o) => { o.visible = false; });
      ground.material = mat(0x16211b);
    }
    buildCountryside(countryKit);
    buildMapLayer();
  }
  function roofTint2(tint) {
    return new THREE.Color(0xffffff).lerp(tint, 0.25);
  }

  /* Cottage: 2×2 wall modules, door to the street, windows on three sides, tiled roof. */
  function cottage(K, x, z, roofTint, s) {
    for (let side = 0; side < 4; side += 1) {
      const a = side * QUARTER;
      for (let k = -1; k <= 1; k += 2) {
        if (side === 0 && k === -1) {
          K("Wall_Plaster_Door_Round", x, 0.3, z, s, a, k, 0, 2);
          K("Door_4_Round", x, 0.3, z, s, a, k - 0.53, 0, 2);
        } else if (side === 2) {
          K("Wall_Plaster_Straight", x, 0.3, z, s, a, k, 0, 2);
        } else {
          K("Wall_Plaster_Window_Wide_Flat", x, 0.3, z, s, a, k, 0, 2);
          K("Window_Wide_Flat1", x, 0.3, z, s, a, k, 0, 2, { glass: new THREE.Color(0xffb43c) });
        }
      }
      K("Corner_Exterior_Wood", x, 0.3, z, s, a, 2, 0, 2);
    }
    K("Roof_RoundTiles_4x4", x, 0.3, z, s, 0, 0, 3, 0, roofTint != null ? { tint: roofTint } : null);
    K("Roof_Front_Brick4", x, 0.3, z, s, 0, 0, 3, 2);
    K("Roof_Front_Brick4", x, 0.3, z, s, Math.PI, 0, 3, 2);
  }

  /* ── townsfolk: clones of the character mannequin in muted colours ──
   * A handful of them roam the whole world: each picks somewhere to go (a hamlet square, a CV
   * house door, the boulevard, open grass), finds a way round houses / trees / fences with A* on a
   * 0.75 m grid, walks (now and then jogs) there, waits a while (knocks at doors, rarely dances),
   * then picks the next place. Far ones keep walking but are hidden and not animated. */
  const npcs = [];
  const NPC_COUNT = 10;
  const NPC_COLORS = ["#c96f4a", "#5f8fb5", "#8aa65a", "#b58a4a", "#9a6fb0", "#c9b07a", "#6f9a8f", "#b5565a", "#d0d0c8", "#7a7f99"];
  const NPC_NEAR = 75;
  const NPC_JOG = 3.8;

  /* walk grid: 1 = blocked (colliders grown by a body radius) */
  const NAV = 0.75;
  const NAV_W = Math.ceil((MAX_X - MIN_X) / NAV) + 1;
  const NAV_H = Math.ceil((WALK_Z_MAX - WALK_Z_MIN) / NAV) + 1;
  const NAV_N = NAV_W * NAV_H;
  let navGrid = null;
  let navG = null;
  let navFrom = null;
  let navSeen = null;
  let navShut = null;
  let navStamp = 0;
  const navIx = (x) => Math.round((x - MIN_X) / NAV);
  const navIz = (z) => Math.round((z - WALK_Z_MIN) / NAV);
  const navCell = (x, z) => {
    const i = navIx(x);
    const j = navIz(z);
    return i < 0 || j < 0 || i >= NAV_W || j >= NAV_H ? -1 : j * NAV_W + i;
  };
  function buildNav() {
    navGrid = new Uint8Array(NAV_N);
    navG = new Float32Array(NAV_N);
    navFrom = new Int32Array(NAV_N);
    navSeen = new Uint32Array(NAV_N);
    navShut = new Uint32Array(NAV_N);
    const pad = 0.3;
    colliders.forEach((c) => {
      const i0 = Math.max(0, Math.floor((c.x0 - pad - MIN_X) / NAV));
      const i1 = Math.min(NAV_W - 1, Math.ceil((c.x1 + pad - MIN_X) / NAV));
      const j0 = Math.max(0, Math.floor((c.z0 - pad - WALK_Z_MIN) / NAV));
      const j1 = Math.min(NAV_H - 1, Math.ceil((c.z1 + pad - WALK_Z_MIN) / NAV));
      for (let j = j0; j <= j1; j += 1) {
        for (let i = i0; i <= i1; i += 1) navGrid[j * NAV_W + i] = 1;
      }
    });
    /* the outer rim stays shut */
    for (let i = 0; i < NAV_W; i += 1) {
      navGrid[i] = 1;
      navGrid[(NAV_H - 1) * NAV_W + i] = 1;
    }
    for (let j = 0; j < NAV_H; j += 1) {
      navGrid[j * NAV_W] = 1;
      navGrid[j * NAV_W + NAV_W - 1] = 1;
    }
  }
  function navNearestFree(cell) {
    if (cell < 0) return -1;
    if (!navGrid[cell]) return cell;
    const ci = cell % NAV_W;
    const cj = Math.floor(cell / NAV_W);
    for (let r = 1; r < 8; r += 1) {
      for (let dj = -r; dj <= r; dj += 1) {
        for (let di = -r; di <= r; di += 1) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
          const i = ci + di;
          const j = cj + dj;
          if (i > 0 && j > 0 && i < NAV_W - 1 && j < NAV_H - 1 && !navGrid[j * NAV_W + i]) return j * NAV_W + i;
        }
      }
    }
    return -1;
  }
  /* straight line through free cells only? */
  function navClear(a, b) {
    const ax = a % NAV_W;
    const az = Math.floor(a / NAV_W);
    const bx = b % NAV_W;
    const bz = Math.floor(b / NAV_W);
    const steps = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(bz - az)) * 2);
    for (let k = 1; k < steps; k += 1) {
      const i = Math.round(ax + ((bx - ax) * k) / steps);
      const j = Math.round(az + ((bz - az) * k) / steps);
      if (navGrid[j * NAV_W + i]) return false;
    }
    return true;
  }
  const NB_DI = [1, -1, 0, 0, 1, 1, -1, -1];
  const NB_DJ = [0, 0, 1, -1, 1, -1, 1, -1];
  const NB_COST = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];
  /* A* from world point to world point; returns [{x, z}, …] (string-pulled) or null */
  function navPath(sx, sz, tx, tz) {
    if (!navGrid) return null;
    const start = navNearestFree(navCell(sx, sz));
    const goalCell = navNearestFree(navCell(tx, tz));
    if (start < 0 || goalCell < 0) return null;
    navStamp += 1;
    const stamp = navStamp;
    const gi = goalCell % NAV_W;
    const gj = Math.floor(goalCell / NAV_W);
    const heur = (c) => {
      const di = Math.abs((c % NAV_W) - gi);
      const dj = Math.abs(Math.floor(c / NAV_W) - gj);
      return Math.max(di, dj) + (Math.SQRT2 - 1) * Math.min(di, dj);
    };
    /* binary heap of cells keyed by f */
    const heap = [];
    const fOf = [];
    const push = (c, f) => {
      heap.push(c);
      fOf.push(f);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (fOf[p] <= fOf[k]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        [fOf[p], fOf[k]] = [fOf[k], fOf[p]];
        k = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const lastC = heap.pop();
      const lastF = fOf.pop();
      if (heap.length) {
        heap[0] = lastC;
        fOf[0] = lastF;
        let k = 0;
        for (;;) {
          const l = k * 2 + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && fOf[l] < fOf[m]) m = l;
          if (r < heap.length && fOf[r] < fOf[m]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          [fOf[m], fOf[k]] = [fOf[k], fOf[m]];
          k = m;
        }
      }
      return top;
    };
    navSeen[start] = stamp;
    navG[start] = 0;
    navFrom[start] = -1;
    push(start, heur(start));
    let found = false;
    let budget = 60000;
    while (heap.length && budget > 0) {
      budget -= 1;
      const c = pop();
      if (navShut[c] === stamp) continue;
      navShut[c] = stamp;
      if (c === goalCell) {
        found = true;
        break;
      }
      const ci = c % NAV_W;
      const cj = Math.floor(c / NAV_W);
      for (let k = 0; k < 8; k += 1) {
        const i = ci + NB_DI[k];
        const j = cj + NB_DJ[k];
        const n = j * NAV_W + i;
        if (navGrid[n] || navShut[n] === stamp) continue;
        /* no corner cutting */
        if (k >= 4 && (navGrid[cj * NAV_W + i] || navGrid[j * NAV_W + ci])) continue;
        const g = navG[c] + NB_COST[k];
        if (navSeen[n] === stamp && g >= navG[n]) continue;
        navSeen[n] = stamp;
        navG[n] = g;
        navFrom[n] = c;
        push(n, g + heur(n));
      }
    }
    if (!found) return null;
    const cells = [];
    for (let c = goalCell; c !== -1; c = navFrom[c]) cells.push(c);
    cells.reverse();
    /* string pulling: keep only the corners */
    const keep = [cells[0]];
    let anchor = 0;
    for (let k = 2; k < cells.length; k += 1) {
      if (!navClear(cells[anchor], cells[k])) {
        anchor = k - 1;
        keep.push(cells[anchor]);
      }
    }
    if (cells.length > 1) keep.push(cells[cells.length - 1]);
    const pts = keep.slice(1).map((c) => ({ x: MIN_X + (c % NAV_W) * NAV, z: WALK_Z_MIN + Math.floor(c / NAV_W) * NAV }));
    /* end exactly on the target when it is reachable in a straight line from the last corner */
    if (pts.length && !navGrid[navCell(tx, tz)] && Math.hypot(pts[pts.length - 1].x - tx, pts[pts.length - 1].z - tz) < 1.2) {
      pts[pts.length - 1] = { x: tx, z: tz };
    }
    return pts;
  }

  /* somewhere worth walking to */
  function npcDestination() {
    const roll = Math.random();
    if (roll < 0.38 && hamlets.length) {
      const H = hamlets[Math.floor(Math.random() * hamlets.length)];
      const a = Math.random() * Math.PI * 2;
      return { x: H.x + Math.cos(a) * 2.6, z: H.z + Math.sin(a) * 2.6, face: { x: H.x, z: H.z } };
    }
    if (roll < 0.62 && doors.length) {
      const d = doors[Math.floor(Math.random() * doors.length)];
      return { x: d.x + (Math.random() - 0.5) * 1.2, z: d.z + 0.5, face: { x: d.x, z: d.z - 2 }, act: "Interact" };
    }
    if (roll < 0.85) {
      const lanes = [STREET_Z - 5.4, STREET_Z + 4.6, STREET_Z - 1.6, STREET_Z + 1.6];
      return { x: LAMP_X0 - 15 + Math.random() * (LAMP_X1 - LAMP_X0 + 30), z: lanes[Math.floor(Math.random() * lanes.length)] };
    }
    return { x: MIN_X + 10 + Math.random() * (MAX_X - MIN_X - 20), z: WALK_Z_MIN + 8 + Math.random() * (WALK_Z_MAX - WALK_Z_MIN - 16) };
  }

  function makeNpc(color) {
    const body = cloneSkinned(charTpl.scene);
    const tint = new THREE.Color(color).convertSRGBToLinear();
    body.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      if (o.material.name === "M_Joints") o.material.color.setHex(0x2a2d36);
      else o.material.color.copy(tint);
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
    });
    body.scale.setScalar(0.9 + Math.random() * 0.18);
    const mixer = new THREE.AnimationMixer(body);
    const actions = {};
    charTpl.clips.forEach((clip) => {
      const a = mixer.clipAction(clip);
      if (!/_Loop$/.test(clip.name)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      actions[clip.name] = a;
    });
    scene.add(body);
    return {
      body, mixer, actions, current: "", x: 0, z: 0, h: Math.random() * Math.PI * 2,
      walkSpeed: 1.2 + Math.random() * 0.7, speed: 1.5, jog: false, path: null, wait: Math.random() * 4, idle: "Idle_Loop", face: null,
    };
  }
  function npcPlay(n, name, fade) {
    const next = n.actions[name];
    if (!next || name === n.current) return;
    next.reset();
    next.setEffectiveWeight(1);
    next.fadeIn(fade).play();
    if (n.current) n.actions[n.current].fadeOut(fade);
    n.current = name;
  }

  function spawnNpcs() {
    if (!charTpl || npcs.length) return;
    buildNav();
    for (let k = 0; k < NPC_COUNT; k += 1) {
      const n = makeNpc(NPC_COLORS[k % NPC_COLORS.length]);
      /* start at a random reachable spot */
      const d = npcDestination();
      const cell = navNearestFree(navCell(d.x, d.z));
      if (cell < 0) {
        scene.remove(n.body);
        continue;
      }
      n.x = MIN_X + (cell % NAV_W) * NAV;
      n.z = WALK_Z_MIN + Math.floor(cell / NAV_W) * NAV;
      npcs.push(n);
    }
  }

  let npcPlanTurn = 0;
  function updateNpcs(dt) {
    if (!npcs.length) return;
    const px = walker ? walker.s.x : view.x;
    const pz = walker ? walker.s.z : view.z;
    let planned = false;
    npcs.forEach((n, idx) => {
      let anim = n.idle;
      let target = n.h;
      if (n.path && n.path.length) {
        const p = n.path[0];
        const dx = p.x - n.x;
        const dz = p.z - n.z;
        const d = Math.hypot(dx, dz);
        const step = n.speed * dt;
        if (d <= step || d < 0.05) {
          n.x = p.x;
          n.z = p.z;
          n.path.shift();
          if (!n.path.length) {
            /* arrived: wait (knock at a door, look at the well, sometimes dance) */
            n.path = null;
            n.wait = n.act ? 2.5 + Math.random() * 2 : 3 + Math.random() * 8;
            n.idle = n.act || (Math.random() < 0.12 ? "Dance_Loop" : "Idle_Loop");
          }
        } else {
          n.x += (dx / d) * step;
          n.z += (dz / d) * step;
          target = Math.atan2(dx, dz);
        }
        if (n.path) anim = n.jog ? "Jog_Fwd_Loop" : "Walk_Loop";
      } else {
        if (n.face) target = Math.atan2(n.face.x - n.x, n.face.z - n.z);
        n.wait -= dt;
        /* one route per frame at most, taking turns */
        if (n.wait <= 0 && !planned && npcPlanTurn % npcs.length === idx) {
          planned = true;
          const dest = npcDestination();
          const path = navPath(n.x, n.z, dest.x, dest.z);
          if (path && path.length) {
            n.path = path;
            n.face = dest.face || null;
            n.act = dest.act || "";
            const far = Math.hypot(dest.x - n.x, dest.z - n.z);
            n.jog = far > 40 && Math.random() < 0.3;
            n.speed = n.jog ? NPC_JOG : n.walkSpeed;
            if (n.actions.Walk_Loop) n.actions.Walk_Loop.timeScale = n.walkSpeed / WALK_SPEED;
            if (n.actions.Jog_Fwd_Loop) n.actions.Jog_Fwd_Loop.timeScale = NPC_JOG / RUN_SPEED;
            anim = n.jog ? "Jog_Fwd_Loop" : "Walk_Loop";
          } else n.wait = 1 + Math.random() * 2;
        }
      }
      n.h = turnToward(n.h, target, dt * 8);
      const near = Math.abs(n.x - px) < NPC_NEAR && Math.abs(n.z - pz) < NPC_NEAR;
      n.body.visible = near;
      if (!near) return;
      n.body.position.set(n.x, groundAt(n.x, n.z), n.z);
      n.body.rotation.y = n.h;
      npcPlay(n, anim, 0.3);
      n.mixer.update(dt);
    });
    npcPlanTurn += 1;
  }

  /* ── countryside: hamlets from the "Modular Village" kit (models/village-mv.glb) ──
   * Grass round the boulevard with hamlets: a cobbled square with a well and lanterns, 4–6 houses
   * facing it, barrels / crates / hay / carts, some with a turning windmill or a pond and a
   * waterwheel, a dirt road to the boulevard, fenced fields and round trees between them. Houses
   * are assembled from the kit's 1 m pieces. Everything is seeded: same land on every visit. */
  const hamlets = [];
  const fields = [];
  const countryTrees = [];
  const spinners = []; /* windmill sails, waterwheels */
  const ponds = [];
  let roads = []; /* dirt strips [ax, az, bx, bz, width], for the map */

  /* One house from the kit's pieces; place(name, matrix) per piece. Door on local +Z. */
  function mvHouse(h, place) {
    const M = THREE.Matrix4;
    const base = new M().makeTranslation(h.x, 0, h.z).multiply(new M().makeRotationY(h.turn * QUARTER));
    const tmp = new M();
    const w = h.w;
    const d = h.d;
    const top = h.floors * 2;
    const cx = (i) => i - (w - 1) / 2;
    const cz = (j) => j - (d - 1) / 2;
    /* outward normal (nx, nz) → rotation that turns local +X onto it */
    const face = (nx, nz) => Math.atan2(-nz, nx);
    const put = (name, lx, ly, lz, rot) => {
      place(name, base.clone().multiply(tmp.makeTranslation(lx, ly, lz)).multiply(new M().makeRotationY(rot || 0)));
    };
    const doorI = Math.floor((w - 1) / 2);
    for (let f = 0; f < h.floors; f += 1) {
      const y = f * 2;
      for (let i = 0; i < w; i += 1) {
        for (let j = 0; j < d; j += 1) {
          const edgeX = i === 0 ? -1 : i === w - 1 ? 1 : 0;
          const edgeZ = j === 0 ? -1 : j === d - 1 ? 1 : 0;
          if (!edgeX && !edgeZ) continue;
          const x = cx(i);
          const z = cz(j);
          if (edgeX && edgeZ) {
            put("Stucco_Block", x, y, z);
            put("Stucco_Block", x, y + 1, z);
            if (f === 0 && h.stone) {
              put(h.stoneWall, x + edgeX, 0, z, face(edgeX, 0));
              put(h.stoneWall, x, 0, z + edgeZ, face(0, edgeZ));
            }
            continue;
          }
          const rot = face(edgeX, edgeZ);
          const along = edgeZ ? i : j;
          if (f === 0 && edgeZ === 1 && i === doorI) {
            put("Stucco_Doorway_Narrow_Tall", x, y, z, rot);
            put(h.doorProp, x, y, z, rot);
            put("Wall_Prop_Lamp", x + 1, 1.05, z + 1, rot);
          } else if (along % 2 === 1 && (edgeZ || d > 4)) {
            put(h.win, x, y, z, rot);
          } else {
            put("Stucco_Block", x, y, z);
            put("Stucco_Block", x, y + 1, z);
            if (f === 0 && h.stone) put(h.stoneWall, x + edgeX, 0, z + edgeZ, rot);
          }
          if (f > 0) put("Stucco_Prop_Support_Beam_1", x + edgeX, y, z + edgeZ, rot);
        }
      }
    }
    /* gable roof, ridge along local x; every row is an eave piece so its overhang covers the joint */
    for (let k = 0; k < d / 2; k += 1) {
      for (let i = 0; i < w; i += 1) {
        put("Roof_Straight_Side_Eave", cx(i), top + k * 1.2, cz(k), face(0, -1));
        put("Roof_Straight_Side_Eave", cx(i), top + k * 1.2, cz(d - 1 - k), face(0, 1));
      }
    }
    /* gable ends: fill under the upper rows */
    for (let j = 1; j < d - 1; j += 1) {
      const k = Math.min(j, d - 1 - j);
      [0, w - 1].forEach((i) => {
        place("Stucco_Block", base.clone().multiply(tmp.makeTranslation(cx(i), top, cz(j))).multiply(new M().makeScale(1, k * 1.2, 1)));
      });
    }
    const peak = top + (d / 2) * 1.2;
    for (let i = 0; i < w; i += 1) put("Roof_Accent_Ridge", cx(i), peak - 0.15, cz(d / 2 - 1), 0);
    if (h.chimney) put("Roof_Prop_Chimney_Stone", cx(w - 2), top + 1, cz(1), 0);
    return { base, top, peak };
  }

  function mvHouseSpec(r, x, z, turn) {
    const wins = ["Stucco_Window_Single_Narrow_Tall", "Stucco_Window_Double_Narrow_Tall", "Stucco_Window_Rounded_Narrow_Tall"];
    return {
      x, z, turn,
      w: 4 + Math.floor(r() * 3),
      d: r() < 0.7 ? 4 : 6,
      floors: r() < 0.45 ? 2 : 1,
      win: wins[Math.floor(r() * wins.length)],
      stone: r() < 0.6,
      stoneWall: `Stone_Wall_${1 + Math.floor(r() * 5)}`,
      doorProp: r() < 0.5 ? "Wall_Prop_Door_Simple" : "Wall_Prop_Door_Ornate",
      chimney: r() < 0.6,
    };
  }

  function buildCountryside(src) {
    if (!src) return;
    const parts = new Map();
    src.children.forEach((node) => {
      const list = [];
      node.traverse((o) => { if (o.isMesh) list.push(o); });
      parts.set(node.name, list);
    });
    /* night: lit windows, burning lanterns */
    parts.forEach((list) => list.forEach((m) => {
      const mt = m.material;
      if (mt.name === "Window") {
        mt.emissive.setHex(0xffb35c);
        mt.emissiveIntensity = 0.6;
      } else if (mt.name === "Candlelight") {
        mt.emissive.setHex(0xffcf70);
        mt.emissiveIntensity = 2.4;
      } else if (mt.name === "Water") {
        mt.emissive.setHex(0x0b2a44);
        mt.roughness = 0.25;
      }
    }));
    const batch = new Map();
    const place = (name, m) => {
      if (!parts.has(name)) return;
      if (!batch.has(name)) batch.set(name, []);
      batch.get(name).push(m);
    };
    const M = THREE.Matrix4;
    const at = (x, y, z, rot) => new M().makeTranslation(x, y, z).multiply(new M().makeRotationY(rot || 0));
    const r = rng(hashOf(`countryside:${sections.length}`));
    const boxes = [];
    const free = (x0, x1, z0, z1) => !boxes.some((b) => x0 < b.x1 && x1 > b.x0 && z0 < b.z1 && z1 > b.z0)
      && !colliders.some((c) => x0 < c.x1 && x1 > c.x0 && z0 < c.z1 && z1 > c.z0);
    const claim = (x0, x1, z0, z1) => boxes.push({ x0, x1, z0, z1 });
    const inWorld = (x, z, m) => x > MIN_X + m && x < MAX_X - m && z > WALK_Z_MIN + m && z < WALK_Z_MAX - m;
    /* the boulevard strip stays clear */
    const core = { x0: -SPACING - 4, x1: maxX + SPACING + 4, z0: PLOT_Z - PLOT_D / 2 - 8, z1: STREET_Z + 24.5 };
    const inCore = (x, z, m) => x > core.x0 - m && x < core.x1 + m && z > core.z0 - m && z < core.z1 + m;

    ground.material = mat(0x3b6a30, { roughness: 1 });

    const dirtMat = mat(0x8a7454, { roughness: 1 });
    const soilMat = mat(0x5a4330, { roughness: 1 });
    const dirt = [];
    const strip = (ax, az, bx, bz, wd) => dirt.push([ax, az, bx, bz, wd]);

    /* hamlet sites */
    const sites = [];
    for (let x = MIN_X + 14; x <= MAX_X - 14; x += 6) {
      for (let z = WALK_Z_MIN + 14; z <= WALK_Z_MAX - 14; z += 6) {
        if (inCore(x, z, 13)) continue;
        sites.push({ x: x + (r() - 0.5) * 4, z: z + (r() - 0.5) * 4 });
      }
    }
    for (let i = sites.length - 1; i > 0; i -= 1) {
      const j = Math.floor(r() * (i + 1));
      [sites[i], sites[j]] = [sites[j], sites[i]];
    }
    sites.forEach((s) => {
      if (hamlets.length >= 18) return;
      if (hamlets.some((h) => Math.hypot(h.x - s.x, h.z - s.z) < 40)) return;
      if (!free(s.x - 12, s.x + 12, s.z - 12, s.z + 12)) return;
      hamlets.push({ x: s.x, z: s.z });
    });

    hamlets.forEach((H, hi) => {
      const hx = H.x;
      const hz = H.z;
      claim(hx - 4.5, hx + 4.5, hz - 4.5, hz + 4.5);
      for (let i = 0; i < 4; i += 1) {
        for (let j = 0; j < 4; j += 1) place("Cobblestone_Floor_1", at(hx - 3 + i * 2 + 0.5, 0.02, hz - 3 + j * 2 - 0.5));
      }
      place("Prop_Well_1", at(hx, 0, hz, r() * Math.PI * 2));
      solid(hx, hz, 0.8, 0.8);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz], k) => {
        if (k % 2 && r() < 0.5) return;
        place("Prop_Lamp_Street", at(hx + sx * 3.7, 0, hz + sz * 3.7, Math.atan2(sz, -sx)));
        solid(hx + sx * 3.7, hz + sz * 3.7, 0.15, 0.15);
      });
      /* houses round the square, doors facing it */
      const sides = [
        { turn: 0, dx: 0, dz: -1 }, { turn: 2, dx: 0, dz: 1 }, { turn: 3, dx: 1, dz: 0 }, { turn: 1, dx: -1, dz: 0 },
      ];
      sides.forEach((side) => {
        const count = side.dz && r() < 0.55 ? 2 : r() < 0.85 ? 1 : 0;
        for (let n = 0; n < count; n += 1) {
          const spec = mvHouseSpec(r, 0, 0, side.turn);
          if (count === 2) spec.w = 4;
          const depthOut = spec.d / 2;
          const halfAlong = spec.w / 2;
          const along = count === 2 ? (n ? 1 : -1) * (halfAlong + 0.8) : (r() - 0.5) * 3;
          const dist = 4.5 + 1.8 + depthOut;
          spec.x = hx + side.dx * dist + (side.dz ? along : 0);
          spec.z = hz + side.dz * dist + (side.dx ? along : 0);
          const hxw = side.dz ? halfAlong : depthOut;
          const hzw = side.dz ? depthOut : halfAlong;
          if (!inWorld(spec.x, spec.z, hxw + 1) || inCore(spec.x, spec.z, Math.max(hxw, hzw) + 1)) continue;
          if (!free(spec.x - hxw - 0.6, spec.x + hxw + 0.6, spec.z - hzw - 0.6, spec.z + hzw + 0.6)) continue;
          const built = mvHouse(spec, place);
          claim(spec.x - hxw - 0.6, spec.x + hxw + 0.6, spec.z - hzw - 0.6, spec.z + hzw + 0.6);
          solid(spec.x, spec.z, hxw + 0.15, hzw + 0.15);
          /* things by the front wall */
          const px = spec.x - side.dx * (depthOut + 0.7);
          const pz = spec.z - side.dz * (depthOut + 0.7);
          const sideX = side.dz ? 1 : 0;
          const sideZ = side.dx ? 1 : 0;
          const props = ["Prop_Barrel_1", "Prop_Barrel_2", "Prop_Crate_1", "Prop_Hay_1", "Prop_Barrel_1_Open", "Prop_Crate_1_Open"];
          for (let k = 0; k < 2; k += 1) {
            if (r() < 0.35) continue;
            const off = (k ? 1 : -1) * (halfAlong - 0.6);
            const name = props[Math.floor(r() * props.length)];
            const ox = px + sideX * off;
            const oz = pz + sideZ * off;
            place(name, at(ox, 0, oz, r() * Math.PI * 2));
            const big = name.startsWith("Prop_Crate");
            solid(ox, oz, big ? 0.5 : 0.28, big ? 0.5 : 0.28, big ? 1 : 0.55);
          }
          /* a windmill on one gable now and then */
          if (!H.mill && spec.floors === 2 && r() < 0.6 && parts.has("Wall_Prop_Windmill_1")) {
            H.mill = true;
            const holder = new THREE.Group();
            holder.matrixAutoUpdate = false;
            holder.matrix.copy(built.base).multiply(new M().makeTranslation(spec.w / 2 + 0.25, built.top + 1.1, 0));
            const sail = new THREE.Group();
            parts.get("Wall_Prop_Windmill_1").forEach((m) => {
              const c = new THREE.Mesh(m.geometry, m.material);
              c.castShadow = true;
              sail.add(c);
            });
            holder.add(sail);
            scene.add(holder);
            spinners.push({ obj: sail, axis: "x", speed: 0.5 + r() * 0.3 });
          }
        }
      });
      /* a cart on the square's edge */
      if (r() < 0.7) {
        const carts = ["Prop_Cart_1", "Prop_Cart_1_Hay", "Prop_Cart_1_Barrels"];
        const a = Math.floor(r() * 4) * QUARTER;
        const cxp = hx + Math.sin(a + 0.6) * 3.1;
        const czp = hz + Math.cos(a + 0.6) * 3.1;
        place(carts[Math.floor(r() * carts.length)], at(cxp, 0, czp, a + QUARTER));
        solid(cxp, czp, 1.1, 1.1, 1.3);
      }
      /* pond with a waterwheel behind some hamlets */
      if (hi % 3 === 1 && parts.has("Waterwheel_1")) {
        const ang = r() * Math.PI * 2;
        const px = hx + Math.sin(ang) * 15;
        const pz = hz + Math.cos(ang) * 15;
        if (inWorld(px, pz, 5) && !inCore(px, pz, 5) && free(px - 4, px + 4, pz - 4, pz + 4)) {
          claim(px - 4, px + 4, pz - 4, pz + 4);
          const pond = new THREE.Mesh(new THREE.CircleGeometry(3.6, 28), mat(0x2f6f9a, { roughness: 0.15, metalness: 0.2, emissive: 0x0a2236 }));
          pond.rotation.x = -Math.PI / 2;
          pond.position.set(px, 0.03, pz);
          pond.receiveShadow = true;
          scene.add(pond);
          const wheel = new THREE.Group();
          wheel.position.set(px + 3.4, 1.6, pz);
          parts.get("Waterwheel_1").forEach((m) => {
            const c = new THREE.Mesh(m.geometry, m.material);
            c.castShadow = true;
            wheel.add(c);
          });
          scene.add(wheel);
          spinners.push({ obj: wheel, axis: "x", speed: -0.6 });
          solid(px, pz, 3.4, 3.4, 0.4);
          solid(px + 3.4, pz, 0.8, 2.2);
          ponds.push({ x: px, z: pz, r: 3.6 });
        }
      }
      /* dirt round the square and a road to the boulevard */
      const toStreet = hz > STREET_Z ? -1 : 1;
      const streetEdge = STREET_Z + (toStreet > 0 ? -6 : 6);
      if (hx > core.x0 && hx < core.x1) {
        /* north of the plots: go round them through the nearest gap */
        const edge = toStreet > 0 ? core.z0 - 1 : core.z1 + 1;
        const gap = toStreet > 0 ? Math.round((hx - SPACING / 2) / SPACING) * SPACING + SPACING / 2 : hx;
        strip(hx, hz + toStreet * 4.5, hx, edge, 2.6);
        strip(hx, edge, gap, edge, 2.6);
        strip(gap, edge, gap, streetEdge, 2.6);
      } else {
        strip(hx, hz + toStreet * 4.5, hx, streetEdge, 2.6);
      }
      H.ring = 11;
    });

    /* fields: dark soil, hay, a fence round them */
    for (let k = 0; k < 140 && fields.length < 22; k += 1) {
      const x = MIN_X + 10 + r() * (MAX_X - MIN_X - 20);
      const z = WALK_Z_MIN + 8 + r() * (WALK_Z_MAX - WALK_Z_MIN - 16);
      const w = 8 + Math.floor(r() * 4) * 2;
      const d = 6 + Math.floor(r() * 3) * 2;
      if (inCore(x, z, Math.max(w, d) / 2 + 2) || !inWorld(x, z, Math.max(w, d) / 2 + 2)) continue;
      if (hamlets.some((h) => Math.hypot(h.x - x, h.z - z) < 18)) continue;
      if (!free(x - w / 2 - 1, x + w / 2 + 1, z - d / 2 - 1, z + d / 2 + 1)) continue;
      claim(x - w / 2 - 1, x + w / 2 + 1, z - d / 2 - 1, z + d / 2 + 1);
      fields.push({ x, z, w, d });
      const soil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), soilMat);
      soil.rotation.x = -Math.PI / 2;
      soil.position.set(x, 0.01, z);
      soil.receiveShadow = true;
      scene.add(soil);
      for (let i = 0; i < w; i += 1) {
        const fx = x - w / 2 + i + 0.5;
        place("Wood_Rope_Straight", at(fx, 0, z - d / 2 - 0.5, 0));
        if (i !== Math.floor(w / 2)) place("Wood_Rope_Straight", at(fx, 0, z + d / 2 + 0.5, Math.PI));
      }
      for (let j = 0; j < d; j += 1) {
        const fz = z - d / 2 + j + 0.5;
        place("Wood_Rope_Straight", at(x - w / 2 - 0.5, 0, fz, -QUARTER));
        place("Wood_Rope_Straight", at(x + w / 2 + 0.5, 0, fz, QUARTER));
      }
      for (let n = 0; n < 3 + Math.floor(r() * 4); n += 1) {
        const bx = x + (r() - 0.5) * (w - 2);
        const bz = z + (r() - 0.5) * (d - 2);
        place("Prop_Hay_1", at(bx, 0, bz, r() * Math.PI));
        solid(bx, bz, 0.4, 0.4, 0.55);
      }
      solid(x, z - d / 2, w / 2, 0.08, 0.7);
      solid(x, z + d / 2, w / 2, 0.08, 0.7);
      solid(x - w / 2, z, 0.08, d / 2, 0.7);
      solid(x + w / 2, z, 0.08, d / 2, 0.7);
    }

    /* round trees on the open grass */
    for (let k = 0; k < 2200 && countryTrees.length < 420; k += 1) {
      const x = MIN_X + 3 + r() * (MAX_X - MIN_X - 6);
      const z = WALK_Z_MIN + 3 + r() * (WALK_Z_MAX - WALK_Z_MIN - 6);
      if (inCore(x, z, 2)) continue;
      if (hamlets.some((h) => Math.hypot(h.x - x, h.z - z) < 14)) continue;
      if (!free(x - 1.2, x + 1.2, z - 1.2, z + 1.2)) continue;
      if (dirt.some(([ax, az, bx, bz]) => {
        const k2 = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / (((bx - ax) ** 2 + (bz - az) ** 2) || 1), 0, 1);
        return Math.hypot(x - (ax + (bx - ax) * k2), z - (az + (bz - az) * k2)) < 2.6;
      })) continue;
      countryTrees.push([x, z, 0.8 + r() * 0.7]);
      solid(x, z, 0.25, 0.25);
    }
    if (countryTrees.length) {
      const crown = new THREE.IcosahedronGeometry(1, 1);
      const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1, 6);
      trunk.translate(0, 0.5, 0);
      const leaves = new THREE.InstancedMesh(crown, mat(0x3f7f3a, { roughness: 1, flatShading: true }), countryTrees.length);
      const wood = new THREE.InstancedMesh(trunk, mat(0x6b4a2e, { roughness: 1 }), countryTrees.length);
      const tint = new THREE.Color();
      countryTrees.forEach(([x, z, s], i) => {
        leaves.setMatrixAt(i, new M().makeTranslation(x, 1.7 * s + 0.9 * s, z).multiply(new M().makeScale(1.25 * s, 1.1 * s, 1.25 * s)));
        tint.setHSL(0.27 + (i % 7) * 0.012, 0.45, 0.32 + (i % 5) * 0.03);
        leaves.setColorAt(i, tint);
        wood.setMatrixAt(i, new M().makeTranslation(x, 0, z).multiply(new M().makeScale(s, 1.8 * s, s)));
      });
      [leaves, wood].forEach((o) => {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        scene.add(o);
      });
    }

    roads = dirt;
    /* dirt: hamlet grounds and roads */
    {
      const geos = [];
      hamlets.forEach((H) => {
        const g = new THREE.CircleGeometry(H.ring, 32);
        g.rotateX(-Math.PI / 2);
        g.translate(H.x, 0.008, H.z);
        geos.push(g);
      });
      dirt.forEach(([ax, az, bx, bz, wd]) => {
        const len = Math.hypot(bx - ax, bz - az);
        if (len < 0.1) return;
        const g = new THREE.PlaneGeometry(wd, len + wd);
        g.rotateX(-Math.PI / 2);
        g.rotateY(Math.atan2(bx - ax, bz - az));
        g.translate((ax + bx) / 2, 0.012, (az + bz) / 2);
        geos.push(g);
      });
      geos.forEach((g) => {
        const m = new THREE.Mesh(g, dirtMat);
        m.receiveShadow = true;
        scene.add(m);
      });
    }

    /* every piece kind: one InstancedMesh per material */
    batch.forEach((list, name) => {
      parts.get(name).forEach((srcMesh) => {
        const im = new THREE.InstancedMesh(srcMesh.geometry, srcMesh.material, list.length);
        list.forEach((m, i) => im.setMatrixAt(i, m));
        im.castShadow = true;
        im.receiveShadow = true;
        im.frustumCulled = false;
        scene.add(im);
      });
    });
  }

  /* ── map: a static top-down layer drawn once, then a corner minimap around the character and a
   * full map on M. North (−z) is up. On the full map a click on a house goes to that section, a
   * click on open ground teleports there. ── */
  const MAP_PX = 4; /* layer pixels per world unit */
  const MAP_W = Math.ceil((MAX_X - MIN_X) * MAP_PX);
  const MAP_H = Math.ceil((WALK_Z_MAX - WALK_Z_MIN) * MAP_PX);
  let mapLayer = null;
  const mapX = (x) => (x - MIN_X) * MAP_PX;
  const mapZ = (z) => (z - WALK_Z_MIN) * MAP_PX;

  function buildMapLayer() {
    const c = document.createElement("canvas");
    c.width = MAP_W;
    c.height = MAP_H;
    const ctx = c.getContext("2d");
    /* parchment-green ground with a soft vignette */
    ctx.fillStyle = "#4f7a3c";
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    const vg = ctx.createRadialGradient(MAP_W / 2, MAP_H / 2, MAP_H * 0.2, MAP_W / 2, MAP_H / 2, MAP_W * 0.7);
    vg.addColorStop(0, "rgba(255,255,220,0.08)");
    vg.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, MAP_W, MAP_H);
    /* fields */
    fields.forEach((f) => {
      ctx.fillStyle = "#7a5a3a";
      ctx.fillRect(mapX(f.x - f.w / 2), mapZ(f.z - f.d / 2), f.w * MAP_PX, f.d * MAP_PX);
      ctx.strokeStyle = "rgba(60,40,20,.55)";
      ctx.lineWidth = 1;
      for (let i = 1; i < f.d; i += 1) {
        ctx.beginPath();
        ctx.moveTo(mapX(f.x - f.w / 2), mapZ(f.z - f.d / 2 + i));
        ctx.lineTo(mapX(f.x + f.w / 2), mapZ(f.z - f.d / 2 + i));
        ctx.stroke();
      }
      ctx.strokeStyle = "#c9a46a";
      ctx.strokeRect(mapX(f.x - f.w / 2), mapZ(f.z - f.d / 2), f.w * MAP_PX, f.d * MAP_PX);
    });
    /* dirt roads and hamlet grounds */
    ctx.strokeStyle = "#b39568";
    ctx.lineCap = "round";
    roads.forEach(([ax, az, bx, bz, wd]) => {
      ctx.lineWidth = wd * MAP_PX;
      ctx.beginPath();
      ctx.moveTo(mapX(ax), mapZ(az));
      ctx.lineTo(mapX(bx), mapZ(bz));
      ctx.stroke();
    });
    hamlets.forEach((h) => {
      ctx.fillStyle = "#b39568";
      ctx.beginPath();
      ctx.arc(mapX(h.x), mapZ(h.z), (h.ring || 11) * MAP_PX, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8d8f9c";
      ctx.fillRect(mapX(h.x - 4), mapZ(h.z - 4), 8 * MAP_PX, 8 * MAP_PX);
      ctx.fillStyle = "#3d6f9a";
      ctx.beginPath();
      ctx.arc(mapX(h.x), mapZ(h.z), 0.9 * MAP_PX, 0, Math.PI * 2);
      ctx.fill();
    });
    ponds.forEach((p) => {
      ctx.fillStyle = "#3d7fb0";
      ctx.beginPath();
      ctx.arc(mapX(p.x), mapZ(p.z), p.r * MAP_PX, 0, Math.PI * 2);
      ctx.fill();
    });
    /* boulevard + sidewalks */
    ctx.fillStyle = "#9a96a0";
    ctx.fillRect(0, mapZ(STREET_Z - 6), MAP_W, 12 * MAP_PX);
    ctx.fillStyle = "#6b6f7c";
    ctx.fillRect(0, mapZ(STREET_Z - 4), MAP_W, 8 * MAP_PX);
    ctx.strokeStyle = "rgba(255,226,150,.6)";
    ctx.setLineDash([3 * MAP_PX, 3 * MAP_PX]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, mapZ(STREET_Z));
    ctx.lineTo(MAP_W, mapZ(STREET_Z));
    ctx.stroke();
    ctx.setLineDash([]);
    /* buildings and other solids (houses, wells, crates…) as dark roofs */
    ctx.fillStyle = "rgba(70,40,30,.85)";
    colliders.forEach((c) => {
      const w = c.x1 - c.x0;
      const d = c.z1 - c.z0;
      if (w < 0.7 && d < 0.7) return; /* trees, posts: drawn below */
      if (c.h < 1 && (w < 0.3 || d < 0.3)) return; /* fences */
      ctx.fillRect(mapX(c.x0), mapZ(c.z0), w * MAP_PX, d * MAP_PX);
    });
    /* trees */
    countryTrees.forEach(([x, z, s]) => {
      ctx.fillStyle = "#2f5d2a";
      ctx.beginPath();
      ctx.arc(mapX(x), mapZ(z), 1.25 * s * MAP_PX, 0, Math.PI * 2);
      ctx.fill();
    });
    /* CV plots in their colours, tower roof, icon */
    sections.forEach((sec, i) => {
      const x = i * SPACING;
      ctx.fillStyle = "#2c6b4a";
      ctx.fillRect(mapX(x - PLOT_W / 2), mapZ(PLOT_Z - PLOT_D / 2), PLOT_W * MAP_PX, PLOT_D * MAP_PX);
      ctx.strokeStyle = sec.color || "#f0b63d";
      ctx.lineWidth = 3;
      ctx.strokeRect(mapX(x - PLOT_W / 2), mapZ(PLOT_Z - PLOT_D / 2), PLOT_W * MAP_PX, PLOT_D * MAP_PX);
      ctx.fillStyle = sec.color || "#f0b63d";
      ctx.fillRect(mapX(x - 2.9), mapZ(PLOT_Z - 1 - 2.9), 5.8 * MAP_PX, 5.8 * MAP_PX);
      ctx.font = `${Math.round(4.2 * MAP_PX)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sec.icon || "🏠", mapX(x), mapZ(PLOT_Z - 1));
    });
    mapLayer = c;
    if (miniEl) miniEl.hidden = false;
  }

  /* player arrow (heading 0 = +z = down on the map) */
  function mapArrow(ctx, px, py, heading, size, color) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-heading);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#11131f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(size * 0.7, -size * 0.7);
    ctx.lineTo(0, -size * 0.3);
    ctx.lineTo(-size * 0.7, -size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  function mapDots(ctx, toPx, scale) {
    ctx.fillStyle = "rgba(240,236,225,.85)";
    npcs.forEach((n) => {
      const [px, py] = toPx(n.x, n.z);
      ctx.beginPath();
      ctx.arc(px, py, Math.max(1.6, 0.45 * scale), 0, Math.PI * 2);
      ctx.fill();
    });
    remotes.forEach((r) => {
      if (!r.st) return;
      const [px, py] = toPx(r.x, r.z);
      ctx.fillStyle = r.color;
      ctx.strokeStyle = "#11131f";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, Math.max(4, 1.2 * scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    if (walker) {
      const [px, py] = toPx(walker.s.x, walker.s.z);
      mapArrow(ctx, px, py, walker.s.heading, Math.max(7, 1.8 * scale), "#ffd36a");
    }
  }

  /* corner minimap: a window round the character */
  const miniEl = host.querySelector("[data-minimap]");
  const miniCanvas = miniEl ? miniEl.querySelector("canvas") : null;
  const MINI_SCALE = 3; /* screen px per world unit */
  function drawMini() {
    if (!mapLayer || !miniCanvas || miniEl.hidden) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = miniCanvas.clientWidth || 160;
    if (miniCanvas.width !== Math.round(size * dpr)) {
      miniCanvas.width = Math.round(size * dpr);
      miniCanvas.height = Math.round(size * dpr);
    }
    const ctx = miniCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cx = walker ? walker.s.x : view.x;
    const cz = walker ? walker.s.z : view.z;
    const span = size / MINI_SCALE; /* world units across */
    ctx.fillStyle = "#1c2b1a";
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(mapLayer, mapX(cx - span / 2), mapZ(cz - span / 2), span * MAP_PX, span * MAP_PX, 0, 0, size, size);
    mapDots(ctx, (x, z) => [(x - cx) * MINI_SCALE + size / 2, (z - cz) * MINI_SCALE + size / 2], MINI_SCALE);
  }

  /* full map */
  const mapEl = host.querySelector("[data-map]");
  const mapCanvas = mapEl ? mapEl.querySelector("canvas") : null;
  const mapFit = { s: 1, ox: 0, oy: 0 };
  function mapIsOpen() {
    return Boolean(mapEl && !mapEl.hidden);
  }
  function openMap() {
    if (!mapEl || !mapLayer) return;
    keys.clear();
    mapEl.hidden = false;
    mapEl.querySelector("button").focus({ preventScroll: true });
  }
  function closeMap() {
    if (!mapIsOpen()) return;
    mapEl.hidden = true;
    host.focus({ preventScroll: true });
  }
  function drawMap() {
    if (!mapIsOpen() || !mapCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = mapCanvas.clientWidth;
    const h = mapCanvas.clientHeight;
    if (mapCanvas.width !== Math.round(w * dpr) || mapCanvas.height !== Math.round(h * dpr)) {
      mapCanvas.width = Math.round(w * dpr);
      mapCanvas.height = Math.round(h * dpr);
    }
    const ctx = mapCanvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const s = Math.min(w / (MAX_X - MIN_X), h / (WALK_Z_MAX - WALK_Z_MIN)); /* px per world unit */
    const ox = (w - (MAX_X - MIN_X) * s) / 2;
    const oy = (h - (WALK_Z_MAX - WALK_Z_MIN) * s) / 2;
    Object.assign(mapFit, { s, ox, oy });
    ctx.drawImage(mapLayer, ox, oy, (MAX_X - MIN_X) * s, (WALK_Z_MAX - WALK_Z_MIN) * s);
    /* section names under the plots */
    ctx.font = `700 ${clamp(s * 2.6, 10, 15)}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    sections.forEach((sec, i) => {
      const px = ox + (i * SPACING - MIN_X) * s;
      /* two rows so long names do not run into each other */
      const py = oy + (PLOT_Z + PLOT_D / 2 - WALK_Z_MIN) * s + 4 + (i % 2) * clamp(s * 3.4, 13, 20);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(10,12,24,.85)";
      ctx.strokeText(sec.title, px, py);
      ctx.fillStyle = "#fff";
      ctx.fillText(sec.title, px, py);
    });
    mapDots(ctx, (x, z) => [ox + (x - MIN_X) * s, oy + (z - WALK_Z_MIN) * s], s);
  }
  function mapClick(event) {
    const rect = mapCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - mapFit.ox) / mapFit.s + MIN_X;
    const z = (event.clientY - rect.top - mapFit.oy) / mapFit.s + WALK_Z_MIN;
    if (x < MIN_X || x > MAX_X || z < WALK_Z_MIN || z > WALK_Z_MAX) return;
    const i = Math.round(x / SPACING);
    closeMap();
    if (i >= 0 && i < sections.length && Math.abs(x - i * SPACING) < PLOT_W / 2 && Math.abs(z - PLOT_Z) < PLOT_D / 2) {
      goTo(i);
      return;
    }
    warpTo(x, z);
  }
  /* teleport to the nearest free spot round (x, z) */
  function warpTo(x, z) {
    if (!walker || !walking) return;
    for (let r = 0; r < 12; r += 0.5) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
        const tx = clamp(x + Math.cos(a) * r, MIN_X, MAX_X);
        const tz = clamp(z + Math.sin(a) * r, WALK_Z_MIN, WALK_Z_MAX);
        if (!blocked(tx, tz, 0)) {
          const s = walker.s;
          Object.assign(s, { x: tx, z: tz, y: groundAt(tx, tz), vy: 0, grounded: true });
          if (sparkle && !reduced) sparkle.burst(s.x, s.y, s.z);
          return;
        }
        if (r === 0) break;
      }
    }
  }
  if (mapEl) {
    mapCanvas.addEventListener("click", mapClick);
    mapEl.querySelector("[data-map-close]").addEventListener("click", closeMap);
    mapEl.addEventListener("click", (event) => {
      if (event.target === mapEl) closeMap();
    });
  }
  host.querySelector("[data-map-open]")?.addEventListener("click", openMap);
  miniEl?.addEventListener("click", openMap);

  /* ── camera rig ──────────────────────────────────────────────────────── */
  const view = { x: 0, y: 5, z: PLOT_Z, dist: 40, yaw: 0, pitch: 0.43 };
  const goal = { ...view };
  if (!reduced) {
    /* opening shot: high and wide, then it swoops down to the character */
    view.dist = 120;
    view.pitch = 1.05;
    view.yaw = -0.5;
  }
  let width = 1;
  let height = 1;
  let walking = false;

  function clampGoal() {
    goal.x = clamp(goal.x, MIN_X, MAX_X);
    goal.dist = walking ? clamp(goal.dist, 5, 30) : clamp(goal.dist, 10, 140);
    goal.pitch = clamp(goal.pitch, 0.1, walking ? 1.0 : 1.35);
    goal.y = clamp(goal.y, 2, 20);
  }
  function placeCamera(v) {
    const cp = Math.cos(v.pitch);
    camera.position.set(
      v.x + v.dist * Math.sin(v.yaw) * cp,
      v.y + v.dist * Math.sin(v.pitch),
      v.z + v.dist * Math.cos(v.yaw) * cp,
    );
    camera.lookAt(v.x, v.y, v.z);
  }
  function resize() {
    width = stage.clientWidth || 1;
    height = stage.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);

  /* ── section panel ───────────────────────────────────────────────────── */
  let selected = -1;
  let expanded = false;
  function renderPanel() {
    if (selected < 0) {
      panel.hidden = true;
      panel.innerHTML = "";
      host.classList.remove("is-reading");
      return;
    }
    const sec = sections[selected];
    panel.style.setProperty("--c", sec.color || "#f0b63d");
    panel.classList.toggle("is-expanded", expanded);
    host.classList.toggle("is-reading", expanded);
    panel.innerHTML = `<header>
        <span class="panel__icon" aria-hidden="true">${esc(sec.icon || "")}</span>
        <strong>${esc(sec.title)}</strong>
        <button type="button" class="panel__btn" data-panel-grow aria-label="${expanded ? "Küçült" : "Büyüt"}">${expanded ? "⤡" : "⤢"}</button>
        <button type="button" class="panel__btn" data-panel-close aria-label="Kapat">✕</button>
      </header>
      <div class="panel__body">${sectionBody(sec)}</div>
      ${expanded ? "" : `<footer>${coarse ? "Büyütmek için ⤢" : "Kapıda <kbd>E</kbd> ile büyüt"}</footer>`}`;
    panel.hidden = false;
    panel.querySelector("[data-panel-close]").addEventListener("click", () => select(-1));
    panel.querySelector("[data-panel-grow]").addEventListener("click", () => {
      expanded = !expanded;
      renderPanel();
    });
    navEl.querySelectorAll("button").forEach((b, i) => b.classList.toggle("is-active", i === selected));
  }
  function select(index, expand) {
    if (index === selected && Boolean(expand) === expanded) return;
    selected = index;
    expanded = index >= 0 && Boolean(expand);
    renderPanel();
    if (index < 0) navEl.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
  }

  /* section chips in the HUD: warp the character to that door */
  navEl.innerHTML = sections.map((sec, i) => `<button type="button" data-go="${i}" style="--c:${esc(sec.color || "#f0b63d")}"><span aria-hidden="true">${esc(sec.icon || "")}</span> ${esc(sec.title)}</button>`).join("");
  navEl.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-go]");
    if (!btn) return;
    goTo(Number(btn.getAttribute("data-go")));
    host.focus({ preventScroll: true });
  });
  function goTo(index) {
    const door = doors.find((d) => d.index === index);
    if (walker && walking) {
      const s = walker.s;
      const tx = door ? door.x : index * SPACING;
      const tz = door ? door.z + 1.4 : STREET_Z - 5;
      s.x = tx;
      s.z = tz;
      s.y = groundAt(s.x, s.z);
      s.vy = 0;
      s.grounded = true;
      s.heading = Math.PI;
      if (sparkle && !reduced) sparkle.burst(s.x, s.y, s.z);
      Object.assign(goal, { yaw: 0, dist: 13, pitch: 0.55 });
    } else {
      goal.x = index * SPACING;
      goal.z = PLOT_Z;
      goal.y = 6;
      goal.dist = Math.min(goal.dist, 30);
      clampGoal();
    }
    select(index, false);
  }

  /* ── pointer / wheel / touch ─────────────────────────────────────────── */
  const canvas = renderer.domElement;
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.index : -1;
  }

  const pointers = new Map();
  let gesture = null;
  function pinchState() {
    const pts = Array.from(pointers.values());
    return { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1 };
  }
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    host.focus({ preventScroll: true });
    if (pointers.size === 2) {
      releaseStick();
      gesture = { type: "pinch", start: pinchState(), dist: goal.dist };
      return;
    }
    if (walking && event.pointerType === "touch") {
      /* walking on touch: the finger is a virtual joystick */
      gesture = { type: "stick", x: event.clientX, y: event.clientY, moved: 0 };
      holdStick(event.clientX, event.clientY);
      return;
    }
    gesture = { type: "orbit", x: event.clientX, y: event.clientY, yaw: goal.yaw, pitch: goal.pitch, moved: 0, button: event.button };
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (event) => {
    if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (!gesture) {
      if (event.pointerType === "mouse") canvas.style.cursor = pick(event.clientX, event.clientY) >= 0 ? "pointer" : "grab";
      return;
    }
    if (gesture.type === "pinch" && pointers.size === 2) {
      goal.dist = gesture.dist * (gesture.start.dist / pinchState().dist);
      clampGoal();
      return;
    }
    if (gesture.type === "stick" && pointers.has(event.pointerId)) {
      gesture.moved = Math.max(gesture.moved, Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y));
      moveStick(event.clientX - gesture.x, event.clientY - gesture.y);
      return;
    }
    if (gesture.type === "orbit" && pointers.has(event.pointerId)) {
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      gesture.moved = Math.max(gesture.moved, Math.hypot(dx, dy));
      goal.yaw = gesture.yaw - dx * 0.005;
      goal.pitch = gesture.pitch + dy * 0.004;
      clampGoal();
    }
  });
  function endPointer(event) {
    pointers.delete(event.pointerId);
    if (!gesture) return;
    if (gesture.type === "pinch") {
      if (pointers.size < 2) gesture = null;
      return;
    }
    if (gesture.type === "stick") {
      const tap = gesture.moved < 8 && event.type !== "pointercancel";
      gesture = null;
      releaseStick();
      if (tap) {
        const index = pick(event.clientX, event.clientY);
        if (index >= 0) select(index, true);
        else jump();
      }
      return;
    }
    const wasClick = gesture.moved <= 5 && event.type !== "pointercancel";
    gesture = null;
    canvas.style.cursor = "grab";
    if (!wasClick) return;
    /* clicking a tower opens its section large */
    const index = pick(event.clientX, event.clientY);
    if (index >= 0) select(index, true);
  }
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? 400 : 1;
    goal.dist *= Math.exp(event.deltaY * unit * 0.0015);
    clampGoal();
  }, { passive: false });

  /* ── walking: the animated character ─────────────────────────────────── */
  const walkHint = host.querySelector("[data-walkhint]");
  const doorPrompt = host.querySelector("[data-prompt]");
  const stickEl = host.querySelector("[data-stick]");
  const abilityBar = host.querySelector("[data-abilities]");
  const sprintBtn = host.querySelector("[data-sprint]");
  const sprintState = host.querySelector("[data-sprint-state]");
  const WALK_SPEED = 2.2;
  const RUN_SPEED = 5;
  const SPRINT_SPEED = 8.5;
  const JUMP_V = 6.5;
  const GRAVITY = 18;
  const RADIUS = 0.2;
  const STEP_UP = 0.36;
  const DOOR_REACH = 1.6;
  const stick = { active: false, x: 0, y: 0 };
  const MOVE_KEYS = {
    KeyW: "f", ArrowUp: "f", KeyS: "b", ArrowDown: "b", KeyA: "l", ArrowLeft: "l", KeyD: "r", ArrowRight: "r",
    ShiftLeft: "run", ShiftRight: "run",
  };
  let walker = null;
  let sparkle = null;
  let sprint = false;

  function groundAt(x, z) {
    const i = Math.round(x / SPACING);
    if (i >= 0 && i < sections.length && Math.abs(x - i * SPACING) < PLOT_W / 2 && Math.abs(z - PLOT_Z) < PLOT_D / 2) return 0.3;
    if (Math.abs(z - (STREET_Z - 5)) < 1 || Math.abs(z - (STREET_Z + 5)) < 1) return 0.25;
    return 0;
  }
  function blocked(x, z, y) {
    for (let i = 0; i < colliders.length; i += 1) {
      const c = colliders[i];
      if (y < c.h && x > c.x0 - RADIUS && x < c.x1 + RADIUS && z > c.z0 - RADIUS && z < c.z1 + RADIUS) return true;
    }
    return false;
  }
  function turnToward(a, b, k) {
    return a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * Math.min(1, k);
  }

  function makeWalker(gltf) {
    const root = gltf.scene;
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; /* skinned bounds lag behind the animation */
      if (o.material && o.material.name === "M_Joints") o.material.color.setHex(0x2a2d36);
    });
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      if (!/_Loop$/.test(clip.name)) {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      actions[clip.name] = action;
    });
    let current = "";
    const startedAt = {};
    function play(name, fade, restart) {
      if ((name === current && !restart) || !actions[name]) return;
      if (name === current) {
        actions[name].reset().play();
        return;
      }
      const next = actions[name];
      next.reset();
      next.setEffectiveWeight(1);
      next.fadeIn(fade).play();
      if (current) {
        /* fadeOut always starts from weight 1: start it from where the action really is, so a
         * clip that was still fading in does not pop back to full strength for a frame */
        const prev = actions[current];
        prev.setEffectiveWeight(startedAt[current] === mixer.time ? 0 : prev.getEffectiveWeight());
        prev.fadeOut(fade);
      }
      startedAt[name] = mixer.time;
      current = name;
    }
    return {
      root,
      mixer,
      play,
      current: () => current,
      has: (name) => Boolean(actions[name]),
      s: { x: 0, y: 0, z: 0, vy: 0, heading: Math.PI, grounded: true, idle: 0, land: 0, busy: 0, door: null, plot: -2 },
    };
  }

  /* ── sprint aura: a glowing rune ring under the feet + rising gold / cyan sparkles ── */
  function glowTexture(draw) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    draw(c.getContext("2d"));
    return new THREE.CanvasTexture(c);
  }
  function makeSparkle() {
    const group = new THREE.Group();
    group.visible = false;
    const starTex = glowTexture((ctx) => {
      const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(0.18, "rgba(255,255,255,.85)");
      g.addColorStop(0.45, "rgba(255,255,255,.18)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      /* four-point twinkle */
      ctx.fillStyle = "rgba(255,255,255,.9)";
      ctx.beginPath();
      ctx.moveTo(64, 4); ctx.lineTo(68, 64); ctx.lineTo(64, 124); ctx.lineTo(60, 64);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(4, 64); ctx.lineTo(64, 60); ctx.lineTo(124, 64); ctx.lineTo(64, 68);
      ctx.closePath();
      ctx.fill();
    });
    const ringTex = glowTexture((ctx) => {
      const g = ctx.createRadialGradient(64, 64, 18, 64, 64, 64);
      g.addColorStop(0, "rgba(255,210,90,0)");
      g.addColorStop(0.55, "rgba(255,210,90,.25)");
      g.addColorStop(0.78, "rgba(255,226,140,.95)");
      g.addColorStop(0.86, "rgba(120,220,255,.55)");
      g.addColorStop(1, "rgba(120,220,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      /* rune ticks around the ring */
      ctx.strokeStyle = "rgba(255,245,200,.9)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const r = i % 3 ? 44 : 48;
        ctx.beginPath();
        ctx.moveTo(64 + Math.cos(a) * 38, 64 + Math.sin(a) * 38);
        ctx.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
        ctx.stroke();
      }
    });
    const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.7), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.renderOrder = 2;
    group.add(ring);
    const glowMat = new THREE.MeshBasicMaterial({ map: starTex, color: 0xffd36a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const glowDisc = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), glowMat);
    glowDisc.rotation.x = -Math.PI / 2;
    glowDisc.position.y = -0.01;
    group.add(glowDisc);

    /* particles live in world space so they trail behind a sprinting character */
    const N = 160;
    const pos = new Float32Array(N * 3).fill(-99);
    const col = new Float32Array(N * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.22, map: starTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    pts.frustumCulled = false;
    pts.renderOrder = 3;
    const parts = Array.from({ length: N }, () => ({ life: 0, age: 1, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, tw: 0 }));
    let next = 0;
    let carry = 0;
    let strength = 0;
    function spawn(x, y, z, burst) {
      const p = parts[next];
      next = (next + 1) % N;
      const a = Math.random() * Math.PI * 2;
      const rad = burst ? 0.15 : 0.2 + Math.random() * 0.45;
      p.x = x + Math.cos(a) * rad;
      p.z = z + Math.sin(a) * rad;
      p.y = y + 0.05 + Math.random() * 0.15;
      const out = burst ? 2 + Math.random() * 2.5 : 0.15;
      p.vx = Math.cos(a) * out;
      p.vz = Math.sin(a) * out;
      p.vy = burst ? 1 + Math.random() * 2.5 : 0.5 + Math.random() * 1.1;
      p.life = burst ? 0.5 + Math.random() * 0.5 : 0.6 + Math.random() * 0.8;
      p.age = 0;
      p.tw = Math.random() * 10;
      const gold = Math.random() < 0.62;
      p.r = gold ? 1 : 0.5;
      p.g = gold ? 0.82 : 0.88;
      p.b = gold ? 0.38 : 1;
    }
    return {
      group,
      pts,
      burst(x, y, z) {
        for (let i = 0; i < 46; i += 1) spawn(x, y, z, true);
      },
      update(dt, t, s, on, moving) {
        strength += ((on ? 1 : 0) - strength) * Math.min(1, dt * 6);
        group.position.set(s.x, s.y + 0.04, s.z);
        group.visible = strength > 0.01;
        ring.rotation.z += dt * (moving ? 3.2 : 1.1);
        const pulse = 0.5 + 0.5 * Math.sin(t * 5);
        ring.scale.setScalar(1 + (moving ? 0.18 : 0.08) * pulse);
        ringMat.opacity = strength * (0.75 + 0.25 * pulse) * (s.grounded ? 1 : 0.4);
        glowMat.opacity = strength * (0.35 + 0.15 * pulse);
        if (on) {
          carry += dt * (reduced ? 14 : moving ? 110 : 38);
          while (carry >= 1) {
            carry -= 1;
            spawn(s.x, s.y, s.z, false);
          }
        } else carry = 0;
        for (let i = 0; i < N; i += 1) {
          const p = parts[i];
          if (p.age >= p.life) {
            pos[i * 3 + 1] = -99;
            continue;
          }
          p.age += dt;
          p.vy -= dt * 0.6;
          p.vx *= 1 - Math.min(1, dt * 3);
          p.vz *= 1 - Math.min(1, dt * 3);
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          const f = Math.max(0, 1 - p.age / p.life) * (0.55 + 0.45 * Math.sin(p.tw + p.age * 22));
          pos[i * 3] = p.x;
          pos[i * 3 + 1] = p.y;
          pos[i * 3 + 2] = p.z;
          col[i * 3] = p.r * f;
          col[i * 3 + 1] = p.g * f;
          col[i * 3 + 2] = p.b * f;
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.color.needsUpdate = true;
      },
    };
  }

  function syncSprint() {
    host.classList.toggle("is-sprinting", sprint);
    if (!sprintBtn) return;
    sprintBtn.classList.toggle("is-on", sprint);
    sprintBtn.setAttribute("aria-pressed", sprint ? "true" : "false");
    if (sprintState) {
      sprintState.textContent = sprint ? "Açık" : "Kapalı";
      sprintState.className = sprint ? "is-on" : "";
    }
  }
  function toggleSprint() {
    if (!walking) return;
    sprint = !sprint;
    if (sprint && sparkle && !reduced) sparkle.burst(walker.s.x, walker.s.y, walker.s.z);
    if (sprintBtn && !reduced) {
      sprintBtn.classList.remove("is-cast");
      void sprintBtn.offsetWidth;
      sprintBtn.classList.add("is-cast");
    }
    syncSprint();
  }
  sprintBtn?.addEventListener("click", () => {
    toggleSprint();
    host.focus({ preventScroll: true });
  });

  let hintTimer = 0;
  function showHint(text) {
    if (!walkHint) return;
    walkHint.textContent = text || "";
    walkHint.hidden = !text;
    window.clearTimeout(hintTimer);
    if (text) hintTimer = window.setTimeout(() => { walkHint.hidden = true; }, 9000);
  }

  function startWalk(gltf) {
    /* an untouched copy for the other players' bodies */
    charTpl = { scene: cloneSkinned(gltf.scene), clips: gltf.animations };
    walker = makeWalker(gltf);
    const s = walker.s;
    /* on the sidewalk in front of the first section's door (just beside the lamp post), facing it */
    s.x = 1 + Math.random() * 2.5; /* a little spread so players do not spawn inside each other */
    s.z = STREET_Z - 5.5 - Math.random() * 0.3;
    s.y = groundAt(s.x, s.z);
    s.heading = Math.PI;
    walker.root.position.set(s.x, s.y, s.z);
    walker.play("Idle_Loop", 0);
    scene.add(walker.root);
    sparkle = makeSparkle();
    scene.add(sparkle.group, sparkle.pts);
    walking = true;
    /* sprint is on from the start; 1 / ⚡ switches back to walking */
    sprint = true;
    syncSprint();
    if (abilityBar) abilityBar.hidden = false;
    host.classList.add("is-walking");
    Object.assign(goal, { x: s.x, z: s.z, y: 2, dist: 11, pitch: 0.45, yaw: 0 });
    clampGoal();
    showHint(coarse
      ? "Parmağını sürükle: yürü · dokun: zıpla · ⚡ hızlı koşu"
      : "WASD: yürü · Shift: koş · 1: hızlı koşu · Space: zıpla · fare: kamera");
    canvas.style.cursor = "grab";
  }

  function jump() {
    if (!walking) return;
    const s = walker.s;
    if (!s.grounded || s.busy > 0) return;
    s.vy = JUMP_V;
    s.grounded = false;
    s.idle = 0;
    walker.play("Jump_Start", 0.08);
  }

  function enterDoor() {
    if (!walking) return;
    const s = walker.s;
    const door = s.door;
    if (!door || s.busy > 0 || !s.grounded) return;
    s.heading = Math.atan2(door.x - s.x, door.z - s.z);
    walker.play("Interact", 0.15);
    s.busy = 0.9;
    window.setTimeout(() => select(door.index, true), 450);
  }

  function isTyping(target) {
    return Boolean(target && target.closest && target.closest("input, textarea, select, [contenteditable]"));
  }

  function walkKey(event, down) {
    const code = event.code;
    if (MOVE_KEYS[code]) {
      if (down) keys.add(code);
      else keys.delete(code);
      return true;
    }
    if (!down) return code === "Space" || code === "KeyE" || code === "Digit1" || code === "Numpad1";
    if (code === "Digit1" || code === "Numpad1") {
      if (!event.repeat) toggleSprint();
      return true;
    }
    if (code === "Space") {
      if (!event.repeat) jump();
      return true;
    }
    if (code === "KeyE" || code === "Enter" || code === "NumpadEnter") {
      if (event.target && event.target.closest && event.target.closest("a, button")) return false;
      if (!event.repeat) enterDoor();
      return true;
    }
    return false;
  }

  function holdStick(x, y) {
    stick.active = true;
    stick.x = 0;
    stick.y = 0;
    if (!stickEl) return;
    const rect = host.getBoundingClientRect();
    stickEl.style.left = `${x - rect.left}px`;
    stickEl.style.top = `${y - rect.top}px`;
    stickEl.style.setProperty("--x", "0px");
    stickEl.style.setProperty("--y", "0px");
    stickEl.hidden = false;
  }
  function moveStick(dx, dy) {
    const len = Math.hypot(dx, dy);
    const k = len > 70 ? 70 / len : 1;
    stick.x = (dx * k) / 45;
    stick.y = (dy * k) / 45;
    if (stickEl) {
      const kk = len > 36 ? 36 / len : 1;
      stickEl.style.setProperty("--x", `${dx * kk}px`);
      stickEl.style.setProperty("--y", `${dy * kk}px`);
    }
  }
  function releaseStick() {
    stick.active = false;
    stick.x = 0;
    stick.y = 0;
    if (stickEl) stickEl.hidden = true;
  }

  function updateWalk(dt) {
    const s = walker.s;
    let fwd = 0;
    let side = 0;
    let run = false;
    keys.forEach((code) => {
      const k = MOVE_KEYS[code];
      if (k === "f") fwd += 1;
      else if (k === "b") fwd -= 1;
      else if (k === "l") side -= 1;
      else if (k === "r") side += 1;
      else if (k === "run") run = true;
    });
    if (stick.active) {
      fwd = -stick.y;
      side = stick.x;
      run = Math.hypot(fwd, side) > 1.05;
    }
    const len = Math.hypot(fwd, side);
    let speed = 0;
    let mx = 0;
    let mz = 0;
    if (s.busy > 0) {
      s.busy -= dt;
    } else if (len > 0.2) {
      /* camera-relative: forward is where the camera looks, flattened onto the ground */
      const sy = Math.sin(view.yaw);
      const cy = Math.cos(view.yaw);
      const f = fwd / len;
      const r = side / len;
      mx = -sy * f + cy * r;
      mz = -cy * f - sy * r;
      speed = sprint ? SPRINT_SPEED : run ? RUN_SPEED : WALK_SPEED;
    }
    if (speed) {
      const step = speed * dt;
      const nx = clamp(s.x + mx * step, MIN_X, MAX_X);
      if (!blocked(nx, s.z, s.y)) s.x = nx;
      const nz = clamp(s.z + mz * step, WALK_Z_MIN, WALK_Z_MAX);
      if (!blocked(s.x, nz, s.y)) s.z = nz;
      s.heading = turnToward(s.heading, Math.atan2(mx, mz), dt * 12);
    }

    const groundY = groundAt(s.x, s.z);
    if (s.grounded) {
      if (Math.abs(groundY - s.y) <= STEP_UP) s.y = groundY;
    } else {
      s.vy -= GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y <= groundY) {
        s.y = groundY;
        s.vy = 0;
        s.grounded = true;
        s.land = 0.22;
        walker.play("Jump_Land", 0.06);
      } else if (s.vy < 1.5) {
        walker.play("Jump_Loop", 0.15);
      }
    }
    if (s.land > 0) s.land = speed ? 0 : s.land - dt;
    if (s.grounded && s.land <= 0 && s.busy <= 0) {
      if (speed) {
        s.idle = 0;
        if (speed >= SPRINT_SPEED && walker.has("Sprint_Loop")) walker.play("Sprint_Loop", 0.15);
        else walker.play(speed > WALK_SPEED ? "Jog_Fwd_Loop" : "Walk_Loop", 0.2);
      } else {
        s.idle += dt;
        walker.play(s.idle > 10 ? "Dance_Loop" : "Idle_Loop", 0.35);
      }
    }

    walker.root.position.set(s.x, s.y, s.z);
    walker.root.rotation.y = s.heading;
    walker.mixer.update(dt);
    if (sparkle) sparkle.update(dt, elapsed, s, sprint, speed > 0);
    netTick(dt, s, speed > 0);
    goal.x = s.x;
    goal.z = s.z;
    goal.y = Math.max(2, s.y + 1.3);
    clampGoal();

    /* standing on a plot opens its section; leaving it closes it */
    const i = Math.round(s.x / SPACING);
    const onPlot = i >= 0 && i < sections.length && Math.abs(s.x - i * SPACING) < PLOT_W / 2 && Math.abs(s.z - PLOT_Z) < PLOT_D / 2;
    const plot = onPlot ? i : -1;
    if (plot !== s.plot) {
      /* on a plot the cottages hide the character from a low camera: look down more */
      if (plot >= 0 && s.plot < 0) goal.pitch = Math.max(goal.pitch, 0.6);
      else if (plot < 0 && s.plot >= 0) goal.pitch = Math.min(goal.pitch, 0.45);
      s.plot = plot;
      if (plot >= 0) select(plot, false);
      else if (!expanded) select(-1);
    }
    /* nearest tower door in reach */
    let door = null;
    let best = DOOR_REACH;
    doors.forEach((item) => {
      const dist = Math.hypot(item.x - s.x, item.z - s.z);
      if (dist < best) {
        best = dist;
        door = item;
      }
    });
    if (door !== s.door) {
      s.door = door;
      if (doorPrompt) {
        doorPrompt.hidden = !door;
        if (door) doorPrompt.textContent = `🚪 ${sections[door.index].title} · oku${coarse ? "" : " (E)"}`;
      }
    }
  }

  doorPrompt?.addEventListener("click", () => enterDoor());

  host.tabIndex = 0;
  window.addEventListener("keydown", (event) => {
    if (isTyping(event.target)) return;
    if (overlayOpen(introEl)) {
      /* while typing any key shows the whole text; then M opens the map, Esc / Enter close */
      if (!introDone) finishIntro();
      else if (event.code === "KeyM") closeIntro(openMap);
      else if (event.key === "Escape" || event.key === "Enter" || event.code === "Space") {
        if (!(event.key === "Enter" && event.target && event.target.closest && event.target.closest("button"))) closeIntro();
        else return;
      } else return;
      event.preventDefault();
      return;
    }
    if (anyOverlay()) {
      if (event.key === "Escape") {
        closeOverlay(helpEl);
        closeOverlay(cvEl);
        event.preventDefault();
      }
      return;
    }
    const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
    if (mapIsOpen()) {
      if (event.key === "Escape" || (event.code === "KeyM" && plain)) {
        closeMap();
        event.preventDefault();
      }
      return;
    }
    if (event.code === "KeyM" && plain && !event.repeat) {
      openMap();
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") {
      if (expanded) {
        expanded = false;
        renderPanel();
      } else if (selected >= 0) select(-1);
      event.preventDefault();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if ((event.code === "Enter" || event.code === "NumpadEnter") && net.id && !event.repeat
      && !(event.target && event.target.closest && event.target.closest("a, button"))) {
      openChat();
      event.preventDefault();
      return;
    }
    if (walking && walkKey(event, true)) event.preventDefault();
  });
  window.addEventListener("keyup", (event) => {
    if (walking) walkKey(event, false);
  });
  window.addEventListener("blur", () => keys.clear());

  /* ── multiplayer ─────────────────────────────────────────────────────────
   * server.js relays every player's state (position, heading, animation, sprint) at 10 Hz plus
   * chat lines. Others are clones of the same character, tinted in their colour, eased toward
   * their last state, with a name plate (and chat bubble) over the head. Without the server (a
   * static host) the socket simply fails and the world stays single-player. */
  const platesEl = host.querySelector("[data-plates]");
  const onlineEl = host.querySelector("[data-online]");
  const onlineN = host.querySelector("[data-online-n]");
  const chatEl = host.querySelector("[data-chat]");
  const chatLog = host.querySelector("[data-chat-log]");
  const chatForm = host.querySelector("[data-chat-form]");
  const chatInput = host.querySelector("[data-chat-input]");
  const chatOpenBtn = host.querySelector("[data-chat-open]");
  const nameInput = host.querySelector("[data-name-input]");
  const net = { ws: null, id: "", retry: 0, timer: 0, sendIn: 0, last: "" };
  const remotes = new Map();
  let charTpl = null;

  function storedName() {
    try {
      return window.localStorage.getItem("cv-world-name") || "";
    } catch (_err) {
      return "";
    }
  }
  if (nameInput) {
    nameInput.value = storedName();
    nameInput.addEventListener("change", () => {
      const name = nameInput.value.trim().slice(0, 20);
      try {
        window.localStorage.setItem("cv-world-name", name);
      } catch (_err) { /* private mode */ }
      if (name) netSend({ t: "name", name });
    });
  }

  function cloneSkinned(source) {
    const clone = source.clone();
    const srcOf = new Map();
    const cloneOf = new Map();
    (function pair(a, b) {
      srcOf.set(b, a);
      cloneOf.set(a, b);
      for (let i = 0; i < a.children.length; i += 1) pair(a.children[i], b.children[i]);
    })(source, clone);
    clone.traverse((node) => {
      if (!node.isSkinnedMesh) return;
      const src = srcOf.get(node);
      node.skeleton = src.skeleton.clone();
      node.skeleton.bones = src.skeleton.bones.map((b) => cloneOf.get(b));
      node.bind(node.skeleton, src.bindMatrix);
    });
    return clone;
  }

  function netConnect() {
    if (!window.WebSocket || net.ws || location.protocol === "file:") return;
    const name = storedName();
    const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws${name ? `?name=${encodeURIComponent(name)}` : ""}`;
    let ws;
    try {
      ws = new WebSocket(url);
    } catch (_err) {
      return;
    }
    net.ws = ws;
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch (_err) {
        return;
      }
      netHandle(msg);
    };
    ws.onclose = () => {
      const was = Boolean(net.id);
      net.ws = null;
      net.id = "";
      remotes.forEach(dropRemote);
      remotes.clear();
      syncOnline();
      /* reconnect with back-off, only if the server was there once */
      if (was || net.retry) {
        net.retry = Math.min(net.retry + 1, 6);
        net.timer = window.setTimeout(netConnect, 1000 * 2 ** net.retry);
      }
    };
  }
  function netSend(msg) {
    if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(msg));
  }
  function netHandle(msg) {
    if (msg.t === "hello") {
      net.id = msg.id;
      net.retry = 0;
      net.last = "";
      if (nameInput && !nameInput.value) nameInput.value = msg.name || "";
      (msg.players || []).forEach(addRemote);
      chatSystem(`Dünyaya katıldın: ${msg.name}`);
    } else if (msg.t === "join") {
      addRemote(msg.p);
      if (msg.p) chatSystem(`${msg.p.name} katıldı`);
    } else if (msg.t === "leave") {
      const r = remotes.get(msg.id);
      if (r) {
        chatSystem(`${r.name} ayrıldı`);
        dropRemote(r);
        remotes.delete(msg.id);
      }
    } else if (msg.t === "sts") {
      (msg.list || []).forEach(([id, x, y, z, h, a, sp]) => {
        const r = remotes.get(id);
        if (r) remoteState(r, { x, y, z, h, a, sp });
      });
    } else if (msg.t === "name") {
      const r = remotes.get(msg.id);
      if (r) {
        r.name = String(msg.name || "");
        r.nameEl.textContent = r.name;
      }
    } else if (msg.t === "chat") {
      chatLine(msg);
      const r = remotes.get(msg.id);
      if (r) say(r, msg.text);
    }
    syncOnline();
  }

  /* our own state: 10 times a second, and only when something changed */
  function netTick(dt, s, moving) {
    if (!net.id) return;
    net.sendIn -= dt;
    if (net.sendIn > 0) return;
    net.sendIn = 0.1;
    const st = { t: "st", x: +s.x.toFixed(2), y: +s.y.toFixed(2), z: +s.z.toFixed(2), h: +s.heading.toFixed(2), a: walker.current(), sp: sprint && moving ? 1 : 0 };
    const key = `${st.x}|${st.y}|${st.z}|${st.h}|${st.a}|${st.sp}`;
    if (key === net.last) return;
    net.last = key;
    netSend(st);
  }

  function syncOnline() {
    const on = Boolean(net.id);
    if (onlineEl) onlineEl.hidden = !on;
    if (onlineN) onlineN.textContent = String(remotes.size + 1);
    if (chatEl) chatEl.hidden = !on;
  }

  function addRemote(p) {
    if (!p || !p.id || p.id === net.id || remotes.has(p.id)) return;
    const color = /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#ffffff";
    const el = document.createElement("div");
    el.className = "plate";
    el.style.setProperty("--c", color);
    el.innerHTML = '<q class="plate__say" hidden></q><span class="plate__name"></span>';
    el.hidden = true;
    platesEl.appendChild(el);
    const r = {
      id: p.id, name: String(p.name || ""), color, el, nameEl: el.querySelector(".plate__name"), sayEl: el.querySelector("q"),
      body: null, mixer: null, actions: {}, current: "", sparkle: null, st: null, x: 0, y: 0, z: 0, h: 0, sayUntil: 0, shown: false, grounded: true,
    };
    r.nameEl.textContent = r.name;
    remotes.set(p.id, r);
    if (p.st) remoteState(r, p.st);
  }
  function buildRemote(r) {
    const body = cloneSkinned(charTpl.scene);
    const tint = new THREE.Color(r.color).convertSRGBToLinear();
    body.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      if (o.material.name === "M_Joints") o.material.color.setHex(0x2a2d36);
      else o.material.color.copy(tint);
      o.castShadow = true;
      o.frustumCulled = false;
    });
    const mixer = new THREE.AnimationMixer(body);
    charTpl.clips.forEach((clip) => {
      const a = mixer.clipAction(clip);
      if (!/_Loop$/.test(clip.name)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      r.actions[clip.name] = a;
    });
    r.body = body;
    r.mixer = mixer;
    r.sparkle = makeSparkle();
    scene.add(body, r.sparkle.group, r.sparkle.pts);
  }
  function remotePlay(r, name, fade) {
    const next = r.actions[name];
    if (!next || name === r.current) return;
    next.reset();
    next.setEffectiveWeight(1);
    next.fadeIn(fade).play();
    if (r.current) {
      const prev = r.actions[r.current];
      prev.setEffectiveWeight(prev.getEffectiveWeight());
      prev.fadeOut(fade);
    }
    r.current = name;
  }
  function remoteState(r, st) {
    const first = !r.st;
    r.st = st;
    if (first || Math.hypot(st.x - r.x, st.z - r.z) > 12) {
      r.x = st.x;
      r.y = st.y;
      r.z = st.z;
      r.h = st.h;
    }
  }
  function say(r, text) {
    r.sayEl.textContent = text;
    r.sayEl.hidden = false;
    r.sayUntil = performance.now() + 5000 + text.length * 40;
  }
  function dropRemote(r) {
    if (r.body) {
      scene.remove(r.body, r.sparkle.group, r.sparkle.pts);
      r.mixer.stopAllAction();
    }
    r.el.remove();
  }

  const remoteV = new THREE.Vector3();
  /* every frame, after the camera moved: ease the others toward their state, plates over them */
  function updateRemotes(dt) {
    if (!remotes.size) return;
    const now = performance.now();
    remotes.forEach((r) => {
      if (!r.st) return;
      if (!r.body && charTpl) buildRemote(r);
      if (!r.body) return;
      const st = r.st;
      const k = 1 - Math.exp(-dt * 12);
      r.x += (st.x - r.x) * k;
      r.y += (st.y - r.y) * k;
      r.z += (st.z - r.z) * k;
      r.h = turnToward(r.h, st.h, dt * 12);
      r.grounded = r.y < 0.5;
      r.body.position.set(r.x, r.y, r.z);
      r.body.rotation.y = r.h;
      remotePlay(r, r.actions[st.a] ? st.a : "Idle_Loop", 0.2);
      r.mixer.update(dt);
      r.sparkle.update(dt, elapsed, r, Boolean(st.sp), Boolean(st.sp));
      /* name plate */
      const s = walker && walker.s;
      const d = s ? Math.hypot(r.x - s.x, r.z - s.z) : Math.hypot(r.x - view.x, r.z - view.z);
      let show = d < 80;
      if (show) {
        remoteV.set(r.x, r.y + 2.15, r.z).project(camera);
        show = remoteV.z < 1 && Math.abs(remoteV.x) < 1.2 && Math.abs(remoteV.y) < 1.2;
      }
      if (show !== r.shown) {
        r.el.hidden = !show;
        r.shown = show;
      }
      if (r.sayUntil && now > r.sayUntil) {
        r.sayUntil = 0;
        r.sayEl.hidden = true;
      }
      if (!show) return;
      const sx = (remoteV.x * 0.5 + 0.5) * width;
      const sy = (-remoteV.y * 0.5 + 0.5) * height;
      const sc = clamp(1.15 - d / 70, 0.7, 1.1);
      r.el.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%) scale(${sc.toFixed(3)})`;
    });
  }

  /* chat: Enter opens the line, Enter sends, Esc closes; lines fade after a while */
  function chatTrim() {
    while (chatLog.children.length > 8) chatLog.firstElementChild.remove();
  }
  function chatAdd(li) {
    chatLog.appendChild(li);
    chatTrim();
    window.setTimeout(() => li.classList.add("is-old"), 12000);
  }
  function chatLine(m) {
    const li = document.createElement("li");
    const b = document.createElement("b");
    b.textContent = `${m.name}: `;
    b.style.color = /^#[0-9a-f]{6}$/i.test(m.color) ? m.color : "#ffffff";
    li.append(b, document.createTextNode(String(m.text || "")));
    chatAdd(li);
  }
  function chatSystem(text) {
    const li = document.createElement("li");
    li.className = "is-system";
    li.textContent = text;
    chatAdd(li);
  }
  function chatIsOpen() {
    return Boolean(chatForm && !chatForm.hidden);
  }
  function openChat() {
    if (!net.id || !chatForm) return;
    keys.clear();
    chatForm.hidden = false;
    chatEl.classList.add("is-open");
    chatInput.focus({ preventScroll: true });
  }
  function closeChat() {
    if (!chatIsOpen()) return;
    chatForm.hidden = true;
    chatEl.classList.remove("is-open");
    chatInput.value = "";
    host.focus({ preventScroll: true });
  }
  chatForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = chatInput.value.trim().slice(0, 200);
    if (text) netSend({ t: "chat", text });
    closeChat();
  });
  chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeChat();
    }
  });
  chatInput?.addEventListener("blur", () => window.setTimeout(closeChat, 150));
  chatOpenBtn?.addEventListener("click", () => (chatIsOpen() ? closeChat() : openChat()));

  /* ── opening: the lines type themselves out one by one, then "open the map" / "explore" ── */
  const introLinesEl = host.querySelector("[data-intro-lines]");
  const introActions = host.querySelector("[data-intro-actions]");
  const introSkip = host.querySelector("[data-intro-skip]");
  let introTimer = 0;
  let introDone = false;
  let introText = [];

  function introLines() {
    const key = coarse ? "sağ alttaki haritaya dokun" : "M tuşuna bas";
    const lines = Array.isArray(CV.intro) && CV.intro.length ? CV.intro
      : [`Merhaba, ben ${CV.name || ""}.`, "Beni tanımaya nereden başlamak istersin?", "Yolunu bulmak için {key}."];
    return lines.map((l) => String(l).replace("{key}", key));
  }
  function introLine(text) {
    const p = document.createElement("p");
    if (CV.name && text.includes(CV.name) && text.length < CV.name.length + 12) p.className = "is-name";
    else if (/\?\s*$/.test(text)) p.className = "is-ask";
    introLinesEl.appendChild(p);
    return p;
  }
  function showIntroActions() {
    introDone = true;
    window.clearTimeout(introTimer);
    introSkip.hidden = true;
    introActions.hidden = false;
    introActions.querySelector("[data-intro-map]").focus({ preventScroll: true });
  }
  function finishIntro() {
    window.clearTimeout(introTimer);
    introLinesEl.innerHTML = "";
    introText.forEach((t) => { introLine(t).textContent = t; });
    showIntroActions();
  }
  function openIntro() {
    if (!introEl) return;
    keys.clear();
    introText = introLines();
    introDone = false;
    introLinesEl.innerHTML = "";
    introActions.hidden = true;
    introSkip.hidden = false;
    if (coarse) introActions.querySelector("kbd")?.remove();
    introEl.hidden = false;
    if (reduced) {
      finishIntro();
      return;
    }
    let line = 0;
    let ch = 0;
    let p = null;
    const caret = '<span class="caret">▍</span>';
    const tick = () => {
      if (line >= introText.length) {
        if (p) p.textContent = introText[line - 1];
        showIntroActions();
        return;
      }
      const text = introText[line];
      if (!p) p = introLine(text);
      ch += 1;
      p.innerHTML = esc(text.slice(0, ch)) + caret;
      if (ch >= text.length) {
        p.textContent = text;
        line += 1;
        ch = 0;
        p = null;
        /* a longer breath after the question */
        introTimer = window.setTimeout(tick, /\?\s*$/.test(text) ? 900 : 480);
        return;
      }
      const c = text.charAt(ch - 1);
      introTimer = window.setTimeout(tick, c === "," ? 160 : c === "." || c === "…" ? 260 : 34);
    };
    introTimer = window.setTimeout(tick, 700);
  }
  function closeIntro(then) {
    if (!introEl || introEl.hidden || introEl.classList.contains("is-leaving")) return;
    window.clearTimeout(introTimer);
    introEl.classList.add("is-leaving");
    window.setTimeout(() => {
      introEl.hidden = true;
      introEl.classList.remove("is-leaving");
      host.focus({ preventScroll: true });
      if (then) then();
    }, reduced ? 0 : 650);
  }
  if (introEl) {
    introEl.addEventListener("click", (event) => {
      if (event.target.closest("[data-intro-map]")) closeIntro(openMap);
      else if (event.target.closest("[data-intro-close]")) closeIntro();
      else if (!introDone) finishIntro();
    });
  }

  /* ── load: kits first (world), then the character ─────────────────────── */
  Promise.all([loadGltf(ASSETS.kit), loadGltf(ASSETS.country)]).then(([k, mv]) => {
    try {
      kit = k ? createKit(k) : null;
    } catch (_err) {
      kit = null;
    }
    countryKit = mv ? mv.scene : null;
    buildCity();
    return loadGltf(ASSETS.character);
  }).then((gltf) => {
    if (loadingEl) loadingEl.hidden = true;
    if (gltf) {
      startWalk(gltf);
      spawnNpcs();
      netConnect();
    } else showHint("Karakter yüklenemedi: kuleye tıkla ya da üstteki bölümleri kullan.");
    openIntro();
  });

  /* ── frame loop ──────────────────────────────────────────────────────── */
  const clock = new THREE.Clock();
  let elapsed = 0;
  function damp(current, target, rate, dt) {
    return current + (target - current) * (1 - Math.exp(-rate * dt));
  }
  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) {
      clock.getDelta();
      return;
    }
    const dt = Math.min(0.05, clock.getDelta());
    const motion = reduced ? 0 : dt;
    elapsed += motion;

    if (walking && !anyOverlay() && !mapIsOpen()) updateWalk(dt);
    else if (walking) {
      /* paused under an overlay: stand and breathe instead of freezing in the bind pose */
      if (walker.s.grounded) walker.play("Idle_Loop", 0.3);
      walker.mixer.update(dt);
    }
    if (reduced) Object.assign(view, goal);
    else {
      const follow = walking ? 10 : 7;
      view.x = damp(view.x, goal.x, follow, dt);
      view.z = damp(view.z, goal.z, follow, dt);
      view.y = damp(view.y, goal.y, 7, dt);
      view.dist = damp(view.dist, goal.dist, 6, dt);
      view.yaw = damp(view.yaw, goal.yaw, 8, dt);
      view.pitch = damp(view.pitch, goal.pitch, 8, dt);
    }
    placeCamera(view);
    updateRemotes(dt);
    fitShadow(view.dist * 1.1);
    moon.position.set(view.x - 40, 70, PLOT_Z + 50);
    moon.target.position.set(view.x, 0, PLOT_Z);
    scene.fog.near = view.dist + 40;
    scene.fog.far = view.dist + 190;

    spinners.forEach((sp) => { sp.obj.rotation[sp.axis] += sp.speed * motion; });
    updateNpcs(motion);
    if (kit) kit.cull(camera);

    const step = dt || 0.016;
    labels.forEach((item, i) => {
      const active = i === selected;
      const s = damp(item.sprite.scale.x, active ? 11.5 : 10, 10, step);
      item.sprite.scale.set(s, s * 0.2625, 1);
      item.sprite.position.y = item.baseY + (active ? Math.sin(elapsed * 3) * 0.25 : 0);
    });
    plots.forEach((m, i) => {
      m.emissiveIntensity = damp(m.emissiveIntensity, i === selected ? 0.35 : 0, 10, step);
    });
    rings.forEach((m, i) => {
      m.opacity = damp(m.opacity, i === selected ? 0.7 + 0.3 * Math.sin(elapsed * 4) : 0, 10, step);
    });
    renderer.render(scene, camera);
    drawMini();
    drawMap();
  }
  frame();
})();
