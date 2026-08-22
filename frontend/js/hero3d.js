/* =========================================================
   DAYFLOW — hero3d.js
   Floating particle network in the auth hero, in the
   dawn/midday/twilight palette. Subtle, slow, parallaxed
   gently by the mouse. Skips itself on reduced-motion or
   if Three.js/WebGL isn't available — the CSS gradient glow
   underneath is a perfectly good fallback on its own.
   ========================================================= */

(function () {
  const containers = document.querySelectorAll('[data-hero3d]');
  if (!containers.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof THREE === 'undefined') return;

  containers.forEach(setupHero3D);

  function setupHero3D(container) {
    let width = container.clientWidth || 640;
    let height = container.clientHeight || 480;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      return; // no WebGL — leave the CSS gradient background as-is
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 62;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    const PALETTE = [
      new THREE.Color(0xE8A33D), // dawn amber
      new THREE.Color(0x2F8F82), // midday teal
      new THREE.Color(0x6C63A6), // twilight violet
      new THREE.Color(0x9FB4E0), // soft periwinkle, for depth
    ];

    const COUNT = width < 640 ? 42 : 70;
    const bounds = { x: 42, y: 26, z: 22 };

    const basePositions = new Float32Array(COUNT * 3);
    const phases = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);

    for (let i = 0; i < COUNT; i++) {
      basePositions[i * 3]     = (Math.random() * 2 - 1) * bounds.x;
      basePositions[i * 3 + 1] = (Math.random() * 2 - 1) * bounds.y;
      basePositions[i * 3 + 2] = (Math.random() * 2 - 1) * bounds.z;

      phases[i * 3]     = Math.random() * Math.PI * 2;
      phases[i * 3 + 1] = Math.random() * Math.PI * 2;
      phases[i * 3 + 2] = Math.random() * Math.PI * 2;

      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }

    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(basePositions.slice(), 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointsMat = new THREE.PointsMaterial({
      size: 1.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(pointsGeo, pointsMat);
    scene.add(points);

    // Connect nearby particles (computed once from base layout, positions updated per-frame)
    const LINK_DIST = 17;
    const pairs = [];
    for (let i = 0; i < COUNT; i++) {
      for (let j = i + 1; j < COUNT; j++) {
        const dx = basePositions[i * 3]     - basePositions[j * 3];
        const dy = basePositions[i * 3 + 1] - basePositions[j * 3 + 1];
        const dz = basePositions[i * 3 + 2] - basePositions[j * 3 + 2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < LINK_DIST) pairs.push(i, j);
      }
    }

    const linePositions = new Float32Array(pairs.length * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x9FB4E0,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    // Gentle mouse parallax, tracked over the whole hero panel
    const heroEl = container.closest('.auth-hero') || container.parentElement || container;
    let mouseX = 0, mouseY = 0;
    heroEl.addEventListener('mousemove', (e) => {
      const r = container.getBoundingClientRect();
      mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouseY = ((e.clientY - r.top) / r.height) * 2 - 1;
    });

    const clock = new THREE.Clock();
    let raf = null;

    function tick() {
      raf = requestAnimationFrame(tick);
      const t = clock.getElapsedTime();

      const posAttr = pointsGeo.attributes.position;
      for (let i = 0; i < COUNT; i++) {
        posAttr.array[i * 3]     = basePositions[i * 3]     + Math.sin(t * 0.25 + phases[i * 3]) * 2.2;
        posAttr.array[i * 3 + 1] = basePositions[i * 3 + 1] + Math.cos(t * 0.22 + phases[i * 3 + 1]) * 2.2;
        posAttr.array[i * 3 + 2] = basePositions[i * 3 + 2] + Math.sin(t * 0.18 + phases[i * 3 + 2]) * 1.6;
      }
      posAttr.needsUpdate = true;

      const lp = lineGeo.attributes.position.array;
      for (let p = 0; p < pairs.length; p += 2) {
        const a = pairs[p], b = pairs[p + 1];
        lp[p * 3]     = posAttr.array[a * 3];
        lp[p * 3 + 1] = posAttr.array[a * 3 + 1];
        lp[p * 3 + 2] = posAttr.array[a * 3 + 2];
        lp[p * 3 + 3] = posAttr.array[b * 3];
        lp[p * 3 + 4] = posAttr.array[b * 3 + 1];
        lp[p * 3 + 5] = posAttr.array[b * 3 + 2];
      }
      lineGeo.attributes.position.needsUpdate = true;

      points.rotation.y = t * 0.03;
      lines.rotation.y = t * 0.03;

      camera.position.x += (mouseX * 6 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 4 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    tick();

    function onResize() {
      width = container.clientWidth;
      height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
    window.addEventListener('resize', onResize);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = null; }
      else if (!raf) { tick(); }
    });
  }
})();
