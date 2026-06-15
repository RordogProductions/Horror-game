'use strict';

// ── Sound (Web Audio API — no files needed) ──────────────────────────────────
class SoundManager {
  constructor() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.ok  = true;
    } catch { this.ok = false; }
    this._chaseGain = null;
    this._chaseOscs = [];
    this._droneGain = null;
  }

  resume() { if (this.ok && this.ctx.state === 'suspended') this.ctx.resume(); }

  startAmbient() {
    if (!this.ok) return;
    const c = this.ctx;
    this._droneGain = c.createGain();
    this._droneGain.gain.value = 0.10;
    this._droneGain.connect(c.destination);

    [[55,0.5],[82.5,0.15],[27.5,0.22],[110,0.08]].forEach(([f,v]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f; o.type = 'sine'; g.gain.value = v;
      o.connect(g); g.connect(this._droneGain); o.start();
    });
    // Slow tremolo LFO
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.2; lg.gain.value = 0.04;
    lfo.connect(lg); lg.connect(this._droneGain.gain); lfo.start();
  }

  startChase() {
    if (!this.ok || this._chaseGain) return;
    const c = this.ctx;
    this._chaseGain = c.createGain();
    this._chaseGain.gain.setValueAtTime(0, c.currentTime);
    this._chaseGain.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.6);
    this._chaseGain.connect(c.destination);

    [[110,0.45,'sawtooth'],[155,0.28,'sawtooth'],[220.5,0.22,'sawtooth']].forEach(([f,v,t]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f; o.type = t; g.gain.value = v;
      o.connect(g); g.connect(this._chaseGain); o.start();
      this._chaseOscs.push(o);
    });
    // Fast tremolo
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 5; lg.gain.value = 0.09;
    lfo.connect(lg); lg.connect(this._chaseGain.gain); lfo.start();
    this._chaseOscs.push(lfo);
  }

  stopChase() {
    if (!this._chaseGain) return;
    this._chaseGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    const g = this._chaseGain, os = this._chaseOscs;
    this._chaseGain = null; this._chaseOscs = [];
    setTimeout(() => { os.forEach(o => { try { o.stop(); } catch {} }); }, 500);
  }

  playCaught() {
    if (!this.ok) return;
    const c = this.ctx, n = c.sampleRate * 2;
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      const t = i / c.sampleRate, decay = Math.exp(-t * 1.8);
      d[i] = ((Math.random()*2-1)*0.55 +
              Math.sin(2*Math.PI*380*t)*0.3 +
              Math.sin(2*Math.PI*566*t)*0.3) * decay;
    }
    const src = c.createBufferSource(), g = c.createGain();
    g.gain.value = 0.85; src.buffer = buf;
    src.connect(g); g.connect(c.destination); src.start();
  }

  playKeyPickup() {
    if (!this.ok) return;
    const c = this.ctx;
    [880, 1320, 1760].forEach((f, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.28 - i*0.07, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.0);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 1.0);
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeBox(name, x, y, z, w, h, d, col, scene, collide = true) {
  const m   = BABYLON.MeshBuilder.CreateBox(name, {width:w, height:h, depth:d}, scene);
  m.position.set(x, y, z);
  const mat = new BABYLON.StandardMaterial(name+'_m', scene);
  mat.diffuseColor  = col;
  mat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
  m.material = mat;
  m.checkCollisions = collide;
  return m;
}

function sconce(x, y, z, scene) {
  const light = new BABYLON.PointLight('sconce_'+x, new BABYLON.Vector3(x, y, z), scene);
  light.diffuse    = new BABYLON.Color3(0.9, 0.45, 0.1);
  light.intensity  = 0.5;
  light.range      = 6;
  const bulb = BABYLON.MeshBuilder.CreateBox('bulb_'+x, {size:0.18}, scene);
  bulb.position.set(x, y, z);
  const bm = new BABYLON.StandardMaterial('bm_'+x, scene);
  bm.emissiveColor = new BABYLON.Color3(1, 0.55, 0.1);
  bulb.material = bm;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer:true});
const sound  = new SoundManager();

// Game state
const G = {
  keyCollected : false,
  gameOver     : false,
  won          : false,
  isChasing    : false,
  wasChasing   : false,
  patrolIndex  : 0,
  started      : false,
};

// HUD refs
const $objKey    = document.getElementById('obj-key');
const $objExit   = document.getElementById('obj-exit');
const $msg       = document.getElementById('message');
const $gameover  = document.getElementById('gameover');
const $win       = document.getElementById('win');
const $start     = document.getElementById('start-screen');
let msgTimer     = 0;

function showMessage(text, dur = 4) {
  $msg.textContent = text;
  $msg.classList.add('visible');
  msgTimer = dur;
}

// ── Build scene ───────────────────────────────────────────────────────────────
const scene = new BABYLON.Scene(engine);
scene.clearColor       = new BABYLON.Color4(0.02, 0.01, 0.03, 1);
scene.gravity          = new BABYLON.Vector3(0, -0.5, 0);
scene.collisionsEnabled = true;
scene.fogMode          = BABYLON.Scene.FOGMODE_EXP2;
scene.fogDensity       = 0.032;
scene.fogColor         = new BABYLON.Color3(0.02, 0.01, 0.03);

// Ambient fill light (very dim purple tint)
const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0,1,0), scene);
ambient.intensity   = 0.06;
ambient.diffuse     = new BABYLON.Color3(0.5, 0.4, 0.8);
ambient.groundColor = new BABYLON.Color3(0.08, 0.06, 0.1);

// ── Camera ───────────────────────────────────────────────────────────────────
const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 1.6, -10), scene);
camera.setTarget(new BABYLON.Vector3(0, 1.6, 1));
camera.keysUp    = [87]; camera.keysDown  = [83];
camera.keysLeft  = [65]; camera.keysRight = [68];
camera.speed     = 0.18;
camera.minZ      = 0.1;
camera.checkCollisions = true;
camera.applyGravity    = true;
camera.ellipsoid       = new BABYLON.Vector3(0.4, 0.9, 0.4);
camera.attachControl(canvas, true);

// Flashlight
const flashlight = new BABYLON.SpotLight('flash',
  camera.position.clone(),
  new BABYLON.Vector3(0, 0, 1),
  Math.PI / 3.5, 1.2, scene);
flashlight.diffuse    = new BABYLON.Color3(1, 0.95, 0.8);
flashlight.intensity  = 1.4;
let flashOn = true;

scene.onBeforeRenderObservable.add(() => {
  if (!flashOn) return;
  flashlight.position.copyFrom(camera.globalPosition);
  const ray = camera.getForwardRay(1);
  flashlight.direction.copyFrom(ray.direction);
});

// ── Level ────────────────────────────────────────────────────────────────────
const WALL  = new BABYLON.Color3(0.17, 0.12, 0.12);
const FLOOR = new BABYLON.Color3(0.09, 0.07, 0.07);

// Floor
const floor = makeBox('floor', 0, 0, 0, 30, 0.2, 30, FLOOR, scene);
// Ceiling
makeBox('ceil', 0, 4, 0, 30, 0.2, 30, new BABYLON.Color3(0.04,0.03,0.04), scene, false);

// Outer walls
makeBox('wS',  0, 2, -15, 30, 4, 1, WALL, scene);
makeBox('wN',  0, 2,  15, 30, 4, 1, WALL, scene);
makeBox('wW', -15, 2,  0,  1, 4, 30, WALL, scene);
makeBox('wE',  15, 2,  0,  1, 4, 30, WALL, scene);

// Middle divider with doorway
makeBox('wML', -6.5, 2, 0, 9, 4, 1, WALL, scene);
makeBox('wMR',  6.5, 2, 0, 9, 4, 1, WALL, scene);

// Atmospheric sconces
[[-14,2,-8],[-14,2,8],[14,2,-8],[14,2,8],[-14,2,2],[14,2,2]].forEach(([x,y,z]) => sconce(x,y,z,scene));

// ── Key ──────────────────────────────────────────────────────────────────────
const keyPivot = new BABYLON.TransformNode('keyPivot', scene);
keyPivot.position.set(-10, 0.85, 10);

const goldMat = new BABYLON.StandardMaterial('gold', scene);
goldMat.diffuseColor  = new BABYLON.Color3(1, 0.84, 0);
goldMat.specularColor = new BABYLON.Color3(1, 0.9, 0.4);
goldMat.specularPower = 80;
goldMat.emissiveColor = new BABYLON.Color3(0.25, 0.2, 0);

const holeMat = new BABYLON.StandardMaterial('hole', scene);
holeMat.diffuseColor  = new BABYLON.Color3(0.04, 0.03, 0.03);
holeMat.emissiveColor = new BABYLON.Color3(0.02, 0.01, 0.01);

// Ring face
const kRing = BABYLON.MeshBuilder.CreateSphere('kRing', {diameter:0.38, segments:10}, scene);
kRing.scaling.z = 0.28; kRing.material = goldMat; kRing.parent = keyPivot;

// Hole
const kHole = BABYLON.MeshBuilder.CreateSphere('kHole', {diameter:0.21, segments:10}, scene);
kHole.scaling.z = 0.5; kHole.material = holeMat; kHole.parent = keyPivot;

// Shaft
const kShaft = BABYLON.MeshBuilder.CreateBox('kShaft', {width:0.09, height:0.45, depth:0.09}, scene);
kShaft.position.y = -0.36; kShaft.material = goldMat; kShaft.parent = keyPivot;

// Teeth
[[0.1,-0.40],[0.1,-0.52]].forEach(([tx,ty],i) => {
  const t = BABYLON.MeshBuilder.CreateBox('kt'+i, {width:0.14, height:0.08, depth:0.09}, scene);
  t.position.set(tx, ty, 0); t.material = goldMat; t.parent = keyPivot;
});

// Key glow light
const keyLight = new BABYLON.PointLight('keyLight', new BABYLON.Vector3(-10,0.85,10), scene);
keyLight.diffuse   = new BABYLON.Color3(1, 0.78, 0.2);
keyLight.intensity = 0.55;
keyLight.range     = 5;

// ── Exit door ────────────────────────────────────────────────────────────────
makeBox('door', 10, 1.75, 14, 1.6, 3.5, 0.25,
  new BABYLON.Color3(0.35, 0.18, 0.07), scene, false);

// Green beacon light + orb above door
const exitLight = new BABYLON.PointLight('exitLight', new BABYLON.Vector3(10, 3.8, 14), scene);
exitLight.diffuse   = new BABYLON.Color3(0, 0.75, 0.35);
exitLight.intensity = 0.7;
exitLight.range     = 6;

const beaconOrb = BABYLON.MeshBuilder.CreateSphere('beacon', {diameter:0.22, segments:8}, scene);
beaconOrb.position.set(10, 3.8, 14);
const beaconMat = new BABYLON.StandardMaterial('beaconMat', scene);
beaconMat.emissiveColor = new BABYLON.Color3(0, 1, 0.5);
beaconOrb.material = beaconMat;

// Trigger zone (invisible)
const exitZone = BABYLON.MeshBuilder.CreateBox('exitZone', {width:2.5, height:3.5, depth:1.5}, scene);
exitZone.position.set(10, 1.75, 14);
exitZone.isVisible = false;
exitZone.checkCollisions = false;

// ── Monster ──────────────────────────────────────────────────────────────────
const monsterRoot = new BABYLON.TransformNode('monsterRoot', scene);
monsterRoot.position.set(0, 0, 10);

const darkMat = new BABYLON.StandardMaterial('darkMat', scene);
darkMat.diffuseColor  = new BABYLON.Color3(0.07, 0.05, 0.09);
darkMat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);

function monsterPart(name, w, h, d, x, y, z) {
  const m = BABYLON.MeshBuilder.CreateBox(name, {width:w, height:h, depth:d}, scene);
  m.position.set(x, y, z);
  m.material = darkMat;
  m.parent   = monsterRoot;
  return m;
}

monsterPart('mbody',  0.75, 1.4,  0.55,  0,    0.90, 0);
monsterPart('mhead',  0.70, 0.62, 0.62,  0,    1.91, 0);
monsterPart('mneck',  0.24, 0.24, 0.24,  0,    1.60, 0);
const mArmL = monsterPart('marmL', 0.20, 1.10, 0.20, -0.57, 1.15, 0);
const mArmR = monsterPart('marmR', 0.20, 1.10, 0.20,  0.57, 1.15, 0);
mArmL.rotation.z =  0.35;
mArmR.rotation.z = -0.35;

// Glowing red eyes
const eyeMat = new BABYLON.StandardMaterial('eyeMat', scene);
eyeMat.emissiveColor  = new BABYLON.Color3(1, 0, 0);
eyeMat.disableLighting = true;
[-0.18, 0.18].forEach(ex => {
  const e = BABYLON.MeshBuilder.CreateSphere('eye'+ex, {diameter:0.10, segments:6}, scene);
  e.position.set(ex, 2.02, 0.30);
  e.material = eyeMat;
  e.parent   = monsterRoot;
});

// Red eye glow light
const eyeGlow = new BABYLON.PointLight('eyeGlow', new BABYLON.Vector3(0, 2.0, 0.4), scene);
eyeGlow.parent    = monsterRoot;
eyeGlow.position  = new BABYLON.Vector3(0, 2.0, 0.4);
eyeGlow.diffuse   = new BABYLON.Color3(0.9, 0, 0);
eyeGlow.intensity = 0.35;
eyeGlow.range     = 6;

const PATROL_POINTS = [
  new BABYLON.Vector3( 0, 0, 10),
  new BABYLON.Vector3(-10, 0, 10),
  new BABYLON.Vector3(-10, 0, 13),
  new BABYLON.Vector3( 10, 0, 13),
  new BABYLON.Vector3( 10, 0, 10),
];
const PATROL_SPEED = 2.2;
const CHASE_SPEED  = 5.2;
const SIGHT_RANGE  = 11;
const CATCH_RANGE  = 1.4;

// ── Beacon pulse ─────────────────────────────────────────────────────────────
let beaconT = 0;

// ── Input ─────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (!G.started) return;
  if (e.key === 'f' || e.key === 'F') {
    flashOn = !flashOn;
    flashlight.intensity = flashOn ? 1.4 : 0;
  }
  if ((e.key === 'r' || e.key === 'R') && (G.gameOver || G.won)) {
    location.reload();
  }
});

// ── Start screen ──────────────────────────────────────────────────────────────
  $start.addEventListener('click', () => {
    $start.classList.add('hidden');
    G.started = true;
    sound.resume();
    sound.startAmbient();
    canvas.focus();
    canvas.requestPointerLock();
    showMessage("Find a way out. Don't be seen.", 5);
  });

  canvas.addEventListener('click', () => {
    if (G.started && !G.gameOver && !G.won) {
      canvas.focus();
      canvas.requestPointerLock();
    }
  });

// ── Game loop ─────────────────────────────────────────────────────────────────
scene.onBeforeRenderObservable.add(() => {
  const dt = engine.getDeltaTime() / 1000;
  if (!G.started || G.gameOver || G.won) return;

  // Message timer
  if (msgTimer > 0) {
    msgTimer -= dt;
    if (msgTimer <= 0) $msg.classList.remove('visible');
  }

  // Key spin & bob
  keyPivot.rotation.y += 1.2 * dt;
  keyPivot.position.y  = 0.85 + Math.sin(Date.now() / 500) * 0.12;

  // Beacon pulse
  beaconT += dt;
  exitLight.intensity   = 0.5 + Math.sin(beaconT * 2) * 0.25;
  beaconOrb.scaling.setAll(0.9 + Math.sin(beaconT * 2) * 0.12);

  // Key pickup
  if (!G.keyCollected) {
    const kDist = BABYLON.Vector3.Distance(
      new BABYLON.Vector3(camera.position.x, 0, camera.position.z),
      new BABYLON.Vector3(-10, 0, 10));
    if (kDist < 1.6) {
      G.keyCollected = true;
      keyPivot.setEnabled(false);
      keyLight.setEnabled(false);
      $objKey.textContent = '✓ Find the key';
      $objKey.classList.add('done');
      sound.playKeyPickup();
      showMessage('Key found! Now reach the exit.');
    }
  }

  // Exit check
  if (G.keyCollected) {
    const eDist = BABYLON.Vector3.Distance(
      new BABYLON.Vector3(camera.position.x, 0, camera.position.z),
      new BABYLON.Vector3(10, 0, 14));
    if (eDist < 2.2) {
      G.won = true;
      $objExit.textContent = '✓ Reach the exit';
      $objExit.classList.add('done');
      $win.classList.remove('hidden');
      sound.stopChase();
      return;
    }
  }

  // ── Monster AI ──
  const mPos   = monsterRoot.position;
  const flat   = (v) => new BABYLON.Vector3(v.x, 0, v.z);
  const dist   = BABYLON.Vector3.Distance(flat(mPos), flat(camera.position));

  if (dist < SIGHT_RANGE)            G.isChasing = true;
  if (dist > SIGHT_RANGE * 1.6)      G.isChasing = false;

  // Audio transitions
  if (G.isChasing && !G.wasChasing)  sound.startChase();
  if (!G.isChasing && G.wasChasing)  sound.stopChase();
  G.wasChasing = G.isChasing;

  // Arm animation
  const swingSpeed = G.isChasing ? 7 : 3;
  const swing      = Math.sin(Date.now() / 1000 * swingSpeed) * (G.isChasing ? 0.38 : 0.14);
  mArmL.rotation.x =  swing;
  mArmR.rotation.x = -swing;
  const tgtZ        = G.isChasing ? 1.35 : 0.35;
  mArmL.rotation.z += (tgtZ  - mArmL.rotation.z) * dt * 3;
  mArmR.rotation.z += (-tgtZ - mArmR.rotation.z) * dt * 3;

  if (G.isChasing) {
    const dir = flat(camera.position).subtract(flat(mPos)).normalize();
    monsterRoot.position.x += dir.x * CHASE_SPEED * dt;
    monsterRoot.position.z += dir.z * CHASE_SPEED * dt;
    monsterRoot.rotation.y  = Math.atan2(dir.x, dir.z);

    if (dist < CATCH_RANGE) {
      G.gameOver = true;
      $gameover.classList.remove('hidden');
      sound.stopChase();
      sound.playCaught();
    }
  } else {
    const tgt  = PATROL_POINTS[G.patrolIndex];
    const diff = flat(tgt).subtract(flat(mPos));
    if (diff.length() < 0.5) {
      G.patrolIndex = (G.patrolIndex + 1) % PATROL_POINTS.length;
    } else {
      const dir = diff.normalize();
      monsterRoot.position.x += dir.x * PATROL_SPEED * dt;
      monsterRoot.position.z += dir.z * PATROL_SPEED * dt;
      monsterRoot.rotation.y  = Math.atan2(dir.x, dir.z);
    }
  }
});

// ── Run ───────────────────────────────────────────────────────────────────────
engine.runRenderLoop(() => scene.render());
window.addEventListener('resize', () => engine.resize());
