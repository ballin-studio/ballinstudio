// <crystal-mark> — the BALLIN mark as a genuine 3D object.
// The silhouette comes from the vector contour, extruded with a fine bevel; the
// crystal look comes from a studio matcap painted to match the reference render
// (cream/amber core, silver top, dark chrome edge bands, dispersion at the rim).
// Drag to spin with inertia; the cursor tilts it so the highlights travel.
if (!customElements.get('crystal-mark')) {
class CrystalMark extends HTMLElement {
  connectedCallback() {
    if (this._booted) return;
    this._booted = true;
    this.style.display = 'block';
    this.style.touchAction = 'none';
    this.style.cursor = 'grab';
    this._init();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this._raf);
    (this._off || []).forEach(f => f());
    this._ro && this._ro.disconnect();
    if (this.renderer) { this.renderer.dispose(); this.renderer.forceContextLoss && this.renderer.forceContextLoss(); }
  }

  // studio ball, painted the way the render reads: warm glass core, silver
  // shoulders, hard dark bands where the bevel turns away, hot specular.
  _matcap(THREE, mode) {
    const S = 512, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d'), R = S / 2;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.clip();

    if (mode === 'rim') {
      g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
      const rg = g.createRadialGradient(R, R, R * 0.74, R, R, R);
      rg.addColorStop(0, 'rgba(0,0,0,0)');
      rg.addColorStop(0.55, 'rgba(255,236,214,0.30)');
      rg.addColorStop(0.86, 'rgba(255,255,255,0.62)');
      rg.addColorStop(1, 'rgba(160,205,255,0.25)');
      g.fillStyle = rg; g.fillRect(0, 0, S, S);
      // dispersion smear along the rim
      ['rgba(120,255,220,0.16)', 'rgba(255,170,90,0.18)', 'rgba(150,170,255,0.14)'].forEach((col, i) => {
        g.save(); g.translate(R, R); g.rotate(-0.6 + i * 1.9);
        const lg = g.createLinearGradient(0, -R, 0, R);
        lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, col); lg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = lg; g.beginPath(); g.arc(0, 0, R * 0.99, -0.5, 0.5); g.lineWidth = R * 0.16;
        g.strokeStyle = lg; g.stroke(); g.restore();
      });
      g.restore();
    } else {
      // body: dark shell first so the silhouette has weight
      const base = g.createRadialGradient(R * 0.86, R * 0.72, R * 0.06, R, R, R);
      base.addColorStop(0.00, '#fffaf1');
      base.addColorStop(0.16, '#f7e9d2');
      base.addColorStop(0.40, '#e8dcc9');
      base.addColorStop(0.62, '#c9bda9');
      base.addColorStop(0.78, '#6e5a49');
      base.addColorStop(0.92, '#2b2018');
      base.addColorStop(1.00, '#171009');
      g.fillStyle = base; g.fillRect(0, 0, S, S);

      const soft = (x, y, r, col) => {
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.fillRect(0, 0, S, S);
      };
      // warm amber bounce from below, exactly like the render's underside
      soft(R * 1.08, R * 1.52, R * 0.95, 'rgba(255,158,66,0.55)');
      soft(R * 0.55, R * 1.30, R * 0.70, 'rgba(255,120,40,0.30)');
      // cool silver shoulder up top
      soft(R * 1.10, R * 0.34, R * 0.85, 'rgba(226,238,255,0.55)');
      // the blown specular
      soft(R * 0.74, R * 0.52, R * 0.30, 'rgba(255,255,255,0.98)');
      soft(R * 1.44, R * 1.06, R * 0.16, 'rgba(255,255,255,0.7)');

      // hard chrome bands: bright inner edge over a dark turn — the signature
      g.save();
      g.globalCompositeOperation = 'source-over';
      const band = g.createRadialGradient(R, R, R * 0.60, R, R, R * 0.99);
      band.addColorStop(0.00, 'rgba(255,255,255,0)');
      band.addColorStop(0.42, 'rgba(255,255,255,0)');
      band.addColorStop(0.52, 'rgba(255,252,246,0.85)');
      band.addColorStop(0.60, 'rgba(255,255,255,0.10)');
      band.addColorStop(0.70, 'rgba(24,16,10,0.72)');
      band.addColorStop(0.86, 'rgba(255,244,228,0.55)');
      band.addColorStop(1.00, 'rgba(14,9,6,0.9)');
      g.fillStyle = band; g.fillRect(0, 0, S, S);
      g.restore();
      g.restore();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  async _init() {
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
    const w = this.clientWidth || 320, h = this.clientHeight || 320;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    this.appendChild(renderer.domElement);
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, w / h, 0.1, 100);
    camera.position.set(0, 0, 9.4);

    const group = new THREE.Group();
    scene.add(group);

    // ---- silhouette -> smooth closed spline -> beveled extrusion ------------
    const data = await (await fetch('assets/crystal-shape.json')).json();
    const chaikin = (pts, it) => {
      let p = pts;
      for (let k = 0; k < it; k++) {
        const o = [];
        for (let i = 0; i < p.length; i++) {
          const a = p[i], b = p[(i + 1) % p.length];
          o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
          o.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
        }
        p = o;
      }
      return p;
    };
    const mk = raw => {
      const sm = chaikin(raw, 2);
      const curve = new THREE.CatmullRomCurve3(
        sm.map(p => new THREE.Vector3(p[0], p[1], 0)), true, 'centripetal', 0.5);
      return curve.getSpacedPoints(Math.max(900, sm.length))
        .map(v => new THREE.Vector2(v.x, v.y));
    };
    const shapes = data.shapes.map(s => {
      const sh = new THREE.Shape(mk(s.contour));
      (s.holes || []).forEach(hh => sh.holes.push(new THREE.Path(mk(hh))));
      return sh;
    });

    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: 0.34,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.05,
      bevelOffset: 0,
      bevelSegments: 6,
      curveSegments: 6,
      steps: 1
    });
    geo.center();

    const body = new THREE.Mesh(geo, new THREE.MeshMatcapMaterial({
      matcap: this._matcap(THREE, 'body'),
      color: 0xffffff
    }));
    group.add(body);

    // additive rim pass: Fresnel sheen + dispersion, the elegance of real glass
    const rim = new THREE.Mesh(geo, new THREE.MeshMatcapMaterial({
      matcap: this._matcap(THREE, 'rim'),
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
      opacity: 0.85
    }));
    rim.scale.setScalar(1.004);
    group.add(rim);

    // ---- interaction --------------------------------------------------------
    let ang = -0.24, vel = 0, tilt = 0, tiltT = 0, dragging = false, lastX = 0, lastT = 0;
    const off = this._off = [];
    const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); off.push(() => t.removeEventListener(ev, fn, o)); };

    const down = e => {
      dragging = true; vel = 0;
      lastX = e.touches ? e.touches[0].clientX : e.clientX;
      lastT = performance.now();
      this.style.cursor = 'grabbing';
    };
    const move = e => {
      if (!dragging) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const now = performance.now(), dx = x - lastX;
      ang += dx * 0.0075;
      vel = (dx * 0.0075) / Math.max(8, now - lastT) * 16;
      lastX = x; lastT = now;
      if (e.cancelable) e.preventDefault();
    };
    const up = () => { dragging = false; this.style.cursor = 'grab'; };
    on(this, 'pointerdown', down);
    on(window, 'pointermove', move, { passive: false });
    on(window, 'pointerup', up);
    on(this, 'touchstart', down, { passive: true });
    on(window, 'touchmove', move, { passive: false });
    on(window, 'touchend', up);
    on(window, 'mousemove', e => {
      const r = this.getBoundingClientRect();
      tiltT = Math.max(-0.18, Math.min(0.18, ((e.clientY - (r.top + r.height / 2)) / innerHeight) * -0.5));
    });

    this._ro = new ResizeObserver(() => {
      const W = this.clientWidth || w, H = this.clientHeight || h;
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
    });
    this._ro.observe(this);

    const t0 = performance.now();
    const frame = () => {
      this._raf = requestAnimationFrame(frame);
      const t = (performance.now() - t0) / 1000;
      if (!dragging) {
        ang += vel;
        vel *= 0.955;
        if (Math.abs(vel) < 0.0004) { vel = 0; ang += Math.sin(t * 0.34) * 0.0016; }
      }
      tilt += (tiltT - tilt) * 0.06;
      group.rotation.set(tilt + Math.sin(t * 0.27) * 0.02, ang, Math.sin(t * 0.21) * 0.012);
      renderer.render(scene, camera);
    };
    frame();
  }
}
customElements.define('crystal-mark', CrystalMark);
}
