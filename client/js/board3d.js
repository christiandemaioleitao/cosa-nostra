/**
 * Cena 3D do tabuleiro — Three.js (ES module).
 * Estética: tabuleiro de madeira em estúdio, luz de fim de tarde, limões dourados,
 * capangas de terno, animações suaves de movimento/disputa/exportação.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DISTRICTS, EDGES, GOLD_ROUTE } from './data-client.js';

export class Board3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.45;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x141820, 90, 180);
    this.scene.background = new THREE.Color(0x0b0d10);

    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 300);
    this.camera.position.set(0, 26, 30);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = .06;
    this.controls.minDistance = 12; this.controls.maxDistance = 70;
    this.controls.maxPolarAngle = Math.PI / 2.15; this.controls.minPolarAngle = 0.15;
    this.controls.target.set(0, 0, 0);

    this.tweens = [];
    this.capMeshes = new Map();      // `${dist}:${fam}:${i}` -> mesh
    this.districtMeshes = new Map();
    this.#build();
    this.#resize(); // garante buffer do tamanho da janela já na abertura
    addEventListener('resize', () => this.#resize());
    this.renderer.setAnimationLoop(() => this.#tick());
  }

  // ---------- construção ----------
  #build() {
    this.#lights();
    this.#sea();
    this.#board();
    this.#districts();
    this.#connections();
    this.#dust();
  }

  #lights() {
    // sol de fim de tarde siciliano (quente) + céu frio + hemisfíbio suave
    const sun = new THREE.DirectionalLight(0xffd9a0, 3.4);
    sun.position.set(-18, 24, 12); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0xaec6e8, 0x5a4526, 1.1));
    const rim = new THREE.DirectionalLight(0x88aaff, 0.6); rim.position.set(20, 10, -18);
    this.scene.add(rim);
    // vinheta simples: plano escuro com furo radial via textura? deixamos o fog + tone mapping
  }

  #sea() {
    // fundo de mar (Mare Tirreno/Ionio) com ondulação leve
    const geo = new THREE.PlaneGeometry(400, 400, 60, 60);
    const mat = new THREE.MeshStandardMaterial({ color: 0x14303f, roughness: .35, metalness: .1 });
    const sea = new THREE.Mesh(geo, mat);
    sea.rotation.x = -Math.PI / 2; sea.position.y = -2.2;
    this.scene.add(sea);
    this.sea = sea;
    this.seaBase = geo.attributes.position.array.slice();
  }

  #woodTexture(base = '#7a5a34', dark = '#5a4023', size = 256) {
    // textura procedural de madeira envelhecida (canvas)
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, size, size);
    for (let i = 0; i < 90; i++) {
      x.strokeStyle = `rgba(0,0,0,${Math.random() * .08})`;
      x.lineWidth = 1 + Math.random() * 2;
      const y = Math.random() * size;
      x.beginPath(); x.moveTo(0, y);
      for (let px = 0; px <= size; px += 16) x.lineTo(px, y + Math.sin(px * .05 + i) * 3);
      x.stroke();
    }
    for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(60,40,20,${Math.random() * .15})`; x.fillRect(Math.random() * size, Math.random() * size, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  #board() {
    // placa de madeira escura (o "estúdio")
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(46, 1.4, 34),
      new THREE.MeshStandardMaterial({ map: this.#woodTexture('#5b422a', '#402c19'), roughness: .75 })
    );
    board.position.y = -0.7; board.receiveShadow = true;
    this.scene.add(board);
    // moldura dourada fina
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(47.4, 0.6, 35.4),
      new THREE.MeshStandardMaterial({ color: 0xc9a35a, metalness: .9, roughness: .3 })
    );
    frame.position.y = -0.3; this.scene.add(frame);
  }

  #labelSprite(text, color = '#efe6d2', size = 256) {
    const c = document.createElement('canvas'); c.width = c.height = size;
    const x = c.getContext('2d');
    x.font = 'bold 64px Georgia'; x.textAlign = 'center'; x.fillStyle = color;
    x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 8;
    x.fillText(text, size / 2, size / 2 + 22);
    const t = new THREE.CanvasTexture(c);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }));
    s.scale.set(5, 5, 1);
    return s;
  }

  #districts() {
    // posições estilizadas em forma de Sicília (x,z)
    const POS = { 1:[-14,-4], 2:[-18,2], 3:[-10,-9], 4:[-6,0], 5:[6,-11], 6:[-1,5],
      7:[10,-4], 8:[-8,9], 9:[3,6], 10:[12,4], 11:[4,13], 12:[9,11] };
    const typeColor = { Porto: 0x3c5a6e, Pomar: 0x4c6b35, Mercado: 0x8a6a2f };
    const typeIcon = { Porto: '⚓', Pomar: '🍋', Mercado: '⚖️' };
    for (const d of DISTRICTS) {
      const [x, z] = POS[d.id];
      const tile = new THREE.Mesh(
        new THREE.CylinderGeometry(3.2, 3.4, 0.55, 6), // hexágono
        new THREE.MeshStandardMaterial({ map: this.#woodTexture(d.id % 2 ? '#8a6a42' : '#6d5232'), roughness: .65 })
      );
      tile.position.set(x, 0.28, z); tile.castShadow = tile.receiveShadow = true;
      this.scene.add(tile);
      const icon = this.#labelSprite(typeIcon[d.tipo] + ' ' + d.nome, '#ffe9bd', 512);
      icon.scale.set(6, 6, 1); icon.position.set(x, 2.6, z);
      this.scene.add(icon);
      // anel indicador de dono (atualizável)
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.5, 0.14, 8, 40),
        new THREE.MeshBasicMaterial({ color: 0x888888 })
      );
      ring.rotation.x = Math.PI / 2; ring.position.set(x, 0.62, z);
      this.scene.add(ring);
      // slots para capangas (até 6)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.4;
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.05, 12),
          new THREE.MeshStandardMaterial({ color: 0x222222, roughness: .9 }));
        s.position.set(x + Math.cos(a) * 1.9, 0.58, z + Math.sin(a) * 1.9);
        this.scene.add(s);
      }
      this.districtMeshes.set(d.id, { tile, ring, x, z, label: icon, typeColor });
    }
  }

  #connections() {
    const mat = new THREE.LineBasicMaterial({ color: 0xd8c79c, transparent: true, opacity: .8 });
    for (const [a, b] of EDGES) {
      const A = this.districtMeshes.get(a), B = this.districtMeshes.get(b);
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(A.x, 0.62, A.z), new THREE.Vector3(B.x, 0.62, B.z)]);
      this.scene.add(new THREE.Line(g, mat));
    }
    // rota tracejada dourada Palermo(3)–Messina(5)
    const A = this.districtMeshes.get(3), B = this.districtMeshes.get(5);
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(A.x, 0.68, A.z), new THREE.Vector3(B.x, 0.68, B.z)]);
    const gold = new THREE.Line(g, new THREE.LineDashedMaterial({
      color: 0xffd77a, dashSize: .7, gapSize: .45, linewidth: 2 }));
    gold.computeLineDistances();
    this.scene.add(gold);
  }

  #dust() {
    // partículas leves de poeira no ar
    const n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i*3] = (Math.random()-.5)*60; pos[i*3+1] = Math.random()*14; pos[i*3+2] = (Math.random()-.5)*50; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd9c9a0, size: .08, transparent: true, opacity: .35 }));
    this.scene.add(this.dust);
  }

  // ---------- peças ----------
  #capanga(color) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: .5, metalness: .08 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.22, .3, .85, 10), mat);
    body.position.y = .45; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xd8b59a, roughness: .6 }));
    head.position.y = 1.05; head.castShadow = true;
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .07, 12),
      new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: .4 }));
    hat.position.y = 1.17;
    g.add(body, head, hat);
    return g;
  }

  /** Atualiza capangas conforme o estado (trocas animadas por movimento/queda). */
  updateTroops(districts, familyColors) {
    const wanted = new Map(); // key -> {dist,fam,color,index,total}
    for (const d of Object.values(districts)) {
      for (const [fam, n] of Object.entries(d.troops)) {
        for (let i = 0; i < n; i++) {
          const key = `${d.id}:${fam}:${i}`;
          wanted.set(key, { dist: d.id, fam, i, n: n, color: familyColors[fam] });
        }
      }
    }
    // remover excedentes (anima queda)
    for (const [key, mesh] of this.capMeshes) {
      if (!wanted.has(key)) {
        this.capMeshes.delete(key);
        this.tween(mesh.position, { y: mesh.position.y + 1.5 }, 300, () => this.scene.remove(mesh));
        this.tween(mesh.rotation, { x: 1.6 }, 300);
      }
    }
    // adicionar faltantes
    for (const [key, w] of wanted) {
      if (this.capMeshes.has(key)) continue;
      const mesh = this.#capanga(w.color);
      const pos = this.#slotPos(w.dist, w.i, w.n);
      mesh.position.set(pos.x, 1.4, pos.z); // entra caindo suavemente
      this.scene.add(mesh); this.capMeshes.set(key, mesh);
      this.tween(mesh.position, { y: 0.6 }, 350);
    }
    // anéis de dono
    for (const d of Object.values(districts)) {
      const dm = this.districtMeshes.get(d.id);
      const col = d.owner ? familyColors[d.owner] : 0x888888;
      dm.ring.material.color.setHex(col);
      dm.ring.material.color.offsetHSL(0, 0, d.open ? 0 : -0.25);
      // limão dourado nos pomares abertos
      if (!dm.lemon && DISTRICTS.find(x => x.id === d.id).tipo === 'Pomar') {
        const lemon = new THREE.Mesh(new THREE.SphereGeometry(.35, 14, 14),
          new THREE.MeshStandardMaterial({ color: 0xffd75e, metalness: .6, roughness: .25, emissive: 0x554200 }));
        lemon.scale.set(1, 1.25, 1);
        lemon.position.set(dm.x - 2.6, 0.85, dm.z + 1.6); lemon.castShadow = true;
        this.scene.add(lemon); dm.lemon = lemon;
      }
    }
  }

  #slotPos(distId, i, total) {
    const dm = this.districtMeshes.get(distId);
    const a = (i / Math.max(total, 1)) * Math.PI * 2 + 0.4;
    return { x: dm.x + Math.cos(a) * 1.9, z: dm.z + Math.sin(a) * 1.9 };
  }

  /** Foco cinematográfico em um distrito. */
  focus(distId, ms = 900) {
    const dm = this.districtMeshes.get(distId); if (!dm) return;
    const from = this.controls.target.clone();
    const to = new THREE.Vector3(dm.x, 0.8, dm.z);
    this.tween(from, { x: to.x, y: to.y, z: to.z }, ms, null, (v) => { this.controls.target.copy(v); });
  }

  /** Destaca um distrito com pulso dourado (ação atual). */
  pulse(distId) {
    const dm = this.districtMeshes.get(distId); if (!dm) return;
    this.tween(dm.tile.scale, { x: 1.12, y: 1.25, z: 1.12 }, 350, () =>
      this.tween(dm.tile.scale, { x: 1, y: 1, z: 1 }, 500));
  }

  /** Animação de exportação: 2 limões dourados viajam ao distrito alvo. */
  animateExport(fromDist, toDist) {
    const A = this.districtMeshes.get(fromDist), B = this.districtMeshes.get(toDist);
    if (!A || !B) return;
    for (let i = 0; i < 2; i++) {
      const lemon = new THREE.Mesh(new THREE.SphereGeometry(.3, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffd75e, metalness: .7, roughness: .2, emissive: 0x664400 }));
      const start = new THREE.Vector3(A.x, 1, A.z), end = new THREE.Vector3(B.x, 1, B.z);
      lemon.position.copy(start); this.scene.add(lemon);
      this.tween(lemon.position, { x: end.x, y: end.y + 2, z: end.z }, 900, () => this.scene.remove(lemon), null,
        (t) => lemon.position.y += Math.sin(t * Math.PI) * 0.04); // arco
    }
  }

  /** Raycast: qual distrito está sob o ponteiro? (id ou null) */
  pick(clientX, clientY) {
    const ray = new THREE.Raycaster();
    const m = new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(m, this.camera);
    const tiles = [...this.districtMeshes.values()].map(dm => dm.tile);
    const hit = ray.intersectObjects(tiles)[0];
    if (!hit) return null;
    for (const [id, dm] of this.districtMeshes) if (dm.tile === hit.object) return id;
    return null;
  }

  tween(obj, to, ms, done, onUpdate) {
    const from = {}; for (const k in to) from[k] = obj[k];
    this.tweens.push({ obj, from, to, t0: performance.now(), ms, done, onUpdate });
  }

  #tick() {
    const now = performance.now();
    // tweens
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      let k = Math.min(1, (now - tw.t0) / tw.ms);
      const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
      for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
      tw.onUpdate && tw.onUpdate(k);
      if (k >= 1) { this.tweens.splice(i, 1); tw.done && tw.done(); }
    }
    // mar
    const p = this.sea.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      p.setZ(i, Math.sin(now * .0006 + i * .35) * .35 + this.seaBase[i * 3 + 2] * 0);
    }
    p.needsUpdate = true;
    // poeira
    this.dust.rotation.y = now * .00002;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  #resize() {
    this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
}
