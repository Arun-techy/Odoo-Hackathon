/* =========================================================
   DAYFLOW — dayring3d.js
   A 3D replacement for the big "Day Ring" (the 148px one used
   on the employee dashboard and attendance page). Renders a
   torus track + a partial glowing arc (amber -> teal, dawn to
   midday) whose sweep represents the percent complete, with a
   gentle idle turn and mouse-follow tilt. The time/label text
   stays as a plain HTML overlay in the center, same as before.

   Exposes window.renderDayRing3D(el, { percent, timeLabel, subLabel }),
   same call signature as the existing SVG renderDayRing() in
   common.js. Falls back to that SVG version automatically for:
   - the small ".day-ring-mini" rings (too small to read in 3D)
   - prefers-reduced-motion
   - no Three.js / no WebGL available
   ========================================================= */

(function () {
  const CACHE = new WeakMap();

  function hasWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  window.renderDayRing3D = function renderDayRing3D(el, opts) {
    opts = opts || {};
    const percent = opts.percent || 0;
    const timeLabel = opts.timeLabel || '';
    const subLabel = opts.subLabel || 'Today';

    const isMini = el.classList.contains('day-ring-mini');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const unavailable = typeof THREE === 'undefined' || !hasWebGL();

    if (isMini || reduced || unavailable) {
      if (typeof renderDayRing === 'function') renderDayRing(el, opts);
      return;
    }

    let ctx = CACHE.get(el);
    if (!ctx) {
      try {
        ctx = createRing3D(el);
      } catch (e) {
        if (typeof renderDayRing === 'function') renderDayRing(el, opts);
        return;
      }
      CACHE.set(el, ctx);
    }
    ctx.setTarget(percent, timeLabel, subLabel);
  };

  function createRing3D(el) {
    el.innerHTML = '';
    el.style.position = 'relative';

    const size = el.clientWidth || 148;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(size, size);
    renderer.domElement.style.display = 'block';
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 5.6);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fb4e0, 0.45);
    rim.position.set(-3, -2, -4);
    scene.add(rim);

    const R = 1.5, TUBE = 0.22, RADIAL_SEG = 16, TUBULAR_SEG = 96;

    // Track: dim full ring underneath
    const trackGeo = new THREE.TorusGeometry(R, TUBE, RADIAL_SEG, TUBULAR_SEG);
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0xE1E4EA, roughness: 0.9, metalness: 0.02,
      transparent: true, opacity: 0.85,
    });
    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    scene.add(trackMesh);

    const amber = new THREE.Color(0xE8A33D);
    const teal = new THREE.Color(0x2F8F82);
    const fillMat = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.32, metalness: 0.18,
      emissive: 0x1a1004, emissiveIntensity: 0.18,
    });

    let fillMesh = null;

    function buildFill(fraction) {
      if (fillMesh) {
        scene.remove(fillMesh);
        fillMesh.geometry.dispose();
      }
      const arc = Math.max(0.001, Math.min(1, fraction)) * Math.PI * 2;
      const geo = new THREE.TorusGeometry(R, TUBE * 1.04, RADIAL_SEG, TUBULAR_SEG, arc);

      // TorusGeometry vertex order: outer loop = radial (cross-section) j,
      // inner loop = tubular (along the arc) i — so slice length is TUBULAR_SEG+1.
      const posAttr = geo.attributes.position;
      const colors = new Float32Array(posAttr.count * 3);
      const sliceLen = TUBULAR_SEG + 1;
      for (let j = 0; j <= RADIAL_SEG; j++) {
        for (let i = 0; i <= TUBULAR_SEG; i++) {
          const idx = j * sliceLen + i;
          if (idx >= posAttr.count) continue;
          const u = i / TUBULAR_SEG;
          const c = amber.clone().lerp(teal, u);
          colors[idx * 3] = c.r;
          colors[idx * 3 + 1] = c.g;
          colors[idx * 3 + 2] = c.b;
        }
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      fillMesh = new THREE.Mesh(geo, fillMat);
      // Start the sweep at 12 o'clock, going clockwise as viewed.
      fillMesh.rotation.z = Math.PI / 2;
      scene.add(fillMesh);
    }

    scene.rotation.x = -0.5;
    buildFill(0.001);

    // Center overlay: same markup/classes as the SVG ring's center label
    const centerWrap = document.createElement('div');
    centerWrap.className = 'day-ring-center';
    centerWrap.innerHTML = '<div class="rc-time"></div><div class="rc-label"></div>';
    el.appendChild(centerWrap);
    const timeEl = centerWrap.querySelector('.rc-time');
    const labelEl = centerWrap.querySelector('.rc-label');

    let current = 0.1;
    let target = 0.1;
    let lastBuilt = -1;
    let mouseX = 0, mouseY = 0;

    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouseY = ((e.clientY - r.top) / r.height) * 2 - 1;
    });
    el.addEventListener('mouseleave', () => { mouseX = 0; mouseY = 0; });

    const clock = new THREE.Clock();
    let raf = null;

    function tick() {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      current += (target - current) * 0.07;
      if (Math.abs(current - lastBuilt) > 0.004) {
        buildFill(current);
        lastBuilt = current;
      }

      scene.rotation.y = Math.sin(t * 0.15) * 0.09 + mouseX * 0.28;
      scene.rotation.x = -0.5 + mouseY * -0.14;

      renderer.render(scene, camera);
    }
    tick();

    function onResize() {
      const s = el.clientWidth || size;
      renderer.setSize(s, s);
    }
    window.addEventListener('resize', onResize);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) { tick(); }
    });

    return {
      setTarget(percent, timeLabel, subLabel) {
        target = Math.max(0.001, Math.min(100, percent)) / 100;
        timeEl.textContent = timeLabel || '';
        labelEl.textContent = subLabel || 'Today';
      },
    };
  }
})();
