      1  'use strict';
      2
      3 -// ── Sound (Web Audio API — no files needed) ──────────────────────────────────
      3 +// ── Sound (Web Audio API) ─────────────────────────────────────────────────────
      4  class SoundManager {
      5    constructor() {
      6      try {
     ...
       9      } catch { this.ok = false; }
      10      this._chaseGain = null;
      11      this._chaseOscs = [];
      12 -    this._droneGain = null;
      12    }
      13
      14    resume() { if (this.ok && this.ctx.state === 'suspended') this.ctx.resume(); }
     ...
      16    startAmbient() {
      17      if (!this.ok) return;
      18      const c = this.ctx;
      20 -    this._droneGain = c.createGain();
      21 -    this._droneGain.gain.value = 0.10;
      22 -    this._droneGain.connect(c.destination);
      23 -
      19 +    const g = c.createGain(); g.gain.value = 0.10; g.connect(c.destination);
      20      [[55,0.5],[82.5,0.15],[27.5,0.22],[110,0.08]].forEach(([f,v]) => {
      25 -      const o = c.createOscillator(), g = c.createGain();
      26 -      o.frequency.value = f; o.type = 'sine'; g.gain.value = v;
      27 -      o.connect(g); g.connect(this._droneGain); o.start();
      21 +      const o = c.createOscillator(), og = c.createGain();
      22 +      o.frequency.value = f; o.type = 'sine'; og.gain.value = v;
      23 +      o.connect(og); og.connect(g); o.start();
      24      });
      29 -    // Slow tremolo LFO
      25      const lfo = c.createOscillator(), lg = c.createGain();
      26      lfo.frequency.value = 0.2; lg.gain.value = 0.04;
      32 -    lfo.connect(lg); lg.connect(this._droneGain.gain); lfo.start();
      27 +    lfo.connect(lg); lg.connect(g.gain); lfo.start();
      28    }
      29
      30    startChase() {
     ...
      34      this._chaseGain.gain.setValueAtTime(0, c.currentTime);
      35      this._chaseGain.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.6);
      36      this._chaseGain.connect(c.destination);
      42 -
      43 -    [[110,0.45,'sawtooth'],[155,0.28,'sawtooth'],[220.5,0.22,'sawtooth']].forEach(([f,v,t]) => {
      44 -      const o = c.createOscillator(), g = c.createGain();
      45 -      o.frequency.value = f; o.type = t; g.gain.value = v;
      46 -      o.connect(g); g.connect(this._chaseGain); o.start();
      37 +    [[110,0.45],[155,0.28],[220.5,0.22]].forEach(([f,v]) => {
      38 +      const o = c.createOscillator(), og = c.createGain();
      39 +      o.frequency.value = f; o.type = 'sawtooth'; og.gain.value = v;
      40 +      o.connect(og); og.connect(this._chaseGain); o.start();
      41        this._chaseOscs.push(o);
      42      });
      49 -    // Fast tremolo
      43      const lfo = c.createOscillator(), lg = c.createGain();
      44      lfo.frequency.value = 5; lg.gain.value = 0.09;
      45      lfo.connect(lg); lg.connect(this._chaseGain.gain); lfo.start();
     ...
      51      this._chaseGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
      52      const g = this._chaseGain, os = this._chaseOscs;
      53      this._chaseGain = null; this._chaseOscs = [];
      61 -    setTimeout(() => { os.forEach(o => { try { o.stop(); } catch {} }); }, 500);
      54 +    setTimeout(() => os.forEach(o => { try { o.stop(); } catch {} }), 500);
      55    }
      56
      57    playCaught() {
      58      if (!this.ok) return;
      59      const c = this.ctx, n = c.sampleRate * 2;
      60      const buf = c.createBuffer(1, n, c.sampleRate);
      68 -    const d   = buf.getChannelData(0);
      61 +    const d = buf.getChannelData(0);
      62      for (let i = 0; i < n; i++) {
      70 -      const t = i / c.sampleRate, decay = Math.exp(-t * 1.8);
      71 -      d[i] = ((Math.random()*2-1)*0.55 +
      72 -              Math.sin(2*Math.PI*380*t)*0.3 +
      73 -              Math.sin(2*Math.PI*566*t)*0.3) * decay;
      63 +      const t = i / c.sampleRate, dec = Math.exp(-t * 1.8);
      64 +      d[i] = ((Math.random()*2-1)*0.55 + Math.sin(2*Math.PI*380*t)*0.3 +
      65 +              Math.sin(2*Math.PI*566*t)*0.3) * dec;
      66      }
      67      const src = c.createBufferSource(), g = c.createGain();
      68      g.gain.value = 0.85; src.buffer = buf;
     ...
      83    }
      84  }
      85
      94 -// ── Helpers ──────────────────────────────────────────────────────────────────
      86 +// ── Helpers ───────────────────────────────────────────────────────────────────
      87  function makeBox(name, x, y, z, w, h, d, col, scene, collide = true) {
      96 -  const m   = BABYLON.MeshBuilder.CreateBox(name, {width:w, height:h, depth:d}, scene);
      88 +  const m = BABYLON.MeshBuilder.CreateBox(name, {width:w, height:h, depth:d}, scene);
      89    m.position.set(x, y, z);
      90    const mat = new BABYLON.StandardMaterial(name+'_m', scene);
      91    mat.diffuseColor  = col;
     ...
       96  }
       97
       98  function sconce(x, y, z, scene) {
      107 -  const light = new BABYLON.PointLight('sconce_'+x, new BABYLON.Vector3(x, y, z), scene);
      108 -  light.diffuse    = new BABYLON.Color3(0.9, 0.45, 0.1);
      109 -  light.intensity  = 0.5;
      110 -  light.range      = 6;
      111 -  const bulb = BABYLON.MeshBuilder.CreateBox('bulb_'+x, {size:0.18}, scene);
      112 -  bulb.position.set(x, y, z);
      113 -  const bm = new BABYLON.StandardMaterial('bm_'+x, scene);
       99 +  const light = new BABYLON.PointLight('sc_'+x+z, new BABYLON.Vector3(x,y,z), scene);
      100 +  light.diffuse = new BABYLON.Color3(0.9, 0.45, 0.1);
      101 +  light.intensity = 0.5; light.range = 6;
      102 +  const b = BABYLON.MeshBuilder.CreateBox('bl_'+x+z, {size:0.18}, scene);
      103 +  b.position.set(x, y, z);
      104 +  const bm = new BABYLON.StandardMaterial('bm_'+x+z, scene);
      105    bm.emissiveColor = new BABYLON.Color3(1, 0.55, 0.1);
      115 -  bulb.material = bm;
      106 +  b.material = bm;
      107  }
      108
      118 -// ── Main ─────────────────────────────────────────────────────────────────────
      109 +// ── Setup ─────────────────────────────────────────────────────────────────────
      110  const canvas = document.getElementById('renderCanvas');
      120 -const engine = new BABYLON.Engine(canvas, true, {preserveDrawingBuffer:true});
      111 +const engine = new BABYLON.Engine(canvas, true);
      112  const sound  = new SoundManager();
      113
      123 -// Game state
      114  const G = {
      115    keyCollected : false,
      116    gameOver     : false,
     ...
      121    started      : false,
      122  };
      123
      134 -// HUD refs
      135 -const $objKey    = document.getElementById('obj-key');
      136 -const $objExit   = document.getElementById('obj-exit');
      137 -const $msg       = document.getElementById('message');
      138 -const $gameover  = document.getElementById('gameover');
      139 -const $win       = document.getElementById('win');
      140 -const $start     = document.getElementById('start-screen');
      141 -let msgTimer     = 0;
      124 +// Track which keys are held down
      125 +const keys = {};
      126
      127 +// HUD elements
      128 +const $objKey   = document.getElementById('obj-key');
      129 +const $objExit  = document.getElementById('obj-exit');
      130 +const $msg      = document.getElementById('message');
      131 +const $gameover = document.getElementById('gameover');
      132 +const $win      = document.getElementById('win');
      133 +const $start    = document.getElementById('start-screen');
      134 +let msgTimer = 0;
      135 +
      136  function showMessage(text, dur = 4) {
      137    $msg.textContent = text;
      138    $msg.classList.add('visible');
      139    msgTimer = dur;
      140  }
      141
      149 -// ── Build scene ───────────────────────────────────────────────────────────────
      142 +// ── Scene ─────────────────────────────────────────────────────────────────────
      143  const scene = new BABYLON.Scene(engine);
      151 -scene.clearColor       = new BABYLON.Color4(0.02, 0.01, 0.03, 1);
      152 -scene.gravity          = new BABYLON.Vector3(0, -0.5, 0);
      144 +scene.clearColor        = new BABYLON.Color4(0.02, 0.01, 0.03, 1);
      145 +scene.gravity           = new BABYLON.Vector3(0, -0.5, 0);
      146  scene.collisionsEnabled = true;
      154 -scene.fogMode          = BABYLON.Scene.FOGMODE_EXP2;
      155 -scene.fogDensity       = 0.032;
      156 -scene.fogColor         = new BABYLON.Color3(0.02, 0.01, 0.03);
      147 +scene.fogMode           = BABYLON.Scene.FOGMODE_EXP2;
      148 +scene.fogDensity        = 0.032;
      149 +scene.fogColor          = new BABYLON.Color3(0.02, 0.01, 0.03);
      150
      158 -// Ambient fill light (very dim purple tint)
      159 -const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0,1,0), scene);
      151 +const ambient = new BABYLON.HemisphericLight('amb', new BABYLON.Vector3(0,1,0), scene);
      152  ambient.intensity   = 0.06;
      153  ambient.diffuse     = new BABYLON.Color3(0.5, 0.4, 0.8);
      154  ambient.groundColor = new BABYLON.Color3(0.08, 0.06, 0.1);
      155
      164 -// ── Camera ───────────────────────────────────────────────────────────────────
      156 +// ── Camera ────────────────────────────────────────────────────────────────────
      157  const camera = new BABYLON.UniversalCamera('cam', new BABYLON.Vector3(0, 1.6, -10), scene);
      158  camera.setTarget(new BABYLON.Vector3(0, 1.6, 1));
      167 -camera.keysUp    = [87]; camera.keysDown  = [83];
      168 -camera.keysLeft  = [65]; camera.keysRight = [68];
      169 -camera.speed     = 0.18;
      170 -camera.minZ      = 0.1;
      159 +camera.minZ            = 0.1;
      160  camera.checkCollisions = true;
      172 -camera.applyGravity    = true;
      161 +camera.applyGravity    = false;   // we fix Y manually — avoids browser gravity bugs
      162  camera.ellipsoid       = new BABYLON.Vector3(0.4, 0.9, 0.4);
      163  camera.attachControl(canvas, true);
      164
      176 -// Flashlight
      165 +// Disable built-in WASD so our manual handler is the only one
      166 +camera.inputs.removeByType('FreeCameraKeyboardMoveInput');
      167 +
      168 +// Flashlight (SpotLight updated each frame to follow camera)
      169  const flashlight = new BABYLON.SpotLight('flash',
      178 -  camera.position.clone(),
      179 -  new BABYLON.Vector3(0, 0, 1),
      180 -  Math.PI / 3.5, 1.2, scene);
      181 -flashlight.diffuse    = new BABYLON.Color3(1, 0.95, 0.8);
      182 -flashlight.intensity  = 1.4;
      170 +  camera.position.clone(), new BABYLON.Vector3(0,0,1), Math.PI/3.5, 1.2, scene);
      171 +flashlight.diffuse   = new BABYLON.Color3(1, 0.95, 0.8);
      172 +flashlight.intensity = 1.4;
      173  let flashOn = true;
      174
      175  scene.onBeforeRenderObservable.add(() => {
      176    if (!flashOn) return;
      177    flashlight.position.copyFrom(camera.globalPosition);
      188 -  const ray = camera.getForwardRay(1);
      189 -  flashlight.direction.copyFrom(ray.direction);
      178 +  flashlight.direction.copyFrom(camera.getForwardRay(1).direction);
      179  });
      180
      192 -// ── Level ────────────────────────────────────────────────────────────────────
      181 +// ── Level ─────────────────────────────────────────────────────────────────────
      182  const WALL  = new BABYLON.Color3(0.17, 0.12, 0.12);
      183  const FLOOR = new BABYLON.Color3(0.09, 0.07, 0.07);
      184
      196 -// Floor
      197 -const floor = makeBox('floor', 0, 0, 0, 30, 0.2, 30, FLOOR, scene);
      198 -// Ceiling
      199 -makeBox('ceil', 0, 4, 0, 30, 0.2, 30, new BABYLON.Color3(0.04,0.03,0.04), scene, false);
      185 +makeBox('floor', 0, 0,   0, 30, 0.2, 30, FLOOR, scene);
      186 +makeBox('ceil',  0, 4,   0, 30, 0.2, 30, new BABYLON.Color3(0.04,0.03,0.04), scene, false);
      187 +makeBox('wS',    0, 2, -15, 30, 4,   1,  WALL,  scene);
      188 +makeBox('wN',    0, 2,  15, 30, 4,   1,  WALL,  scene);
      189 +makeBox('wW',  -15, 2,   0,  1, 4,  30,  WALL,  scene);
      190 +makeBox('wE',   15, 2,   0,  1, 4,  30,  WALL,  scene);
      191 +makeBox('wML', -6.5, 2,  0,  9, 4,   1,  WALL,  scene);
      192 +makeBox('wMR',  6.5, 2,  0,  9, 4,   1,  WALL,  scene);
      193
      201 -// Outer walls
      202 -makeBox('wS',  0, 2, -15, 30, 4, 1, WALL, scene);
      203 -makeBox('wN',  0, 2,  15, 30, 4, 1, WALL, scene);
      204 -makeBox('wW', -15, 2,  0,  1, 4, 30, WALL, scene);
      205 -makeBox('wE',  15, 2,  0,  1, 4, 30, WALL, scene);
      194 +[[-14,2,-8],[-14,2,8],[14,2,-8],[14,2,8],[-14,2,2],[14,2,2]]
      195 +  .forEach(([x,y,z]) => sconce(x,y,z,scene));
      196
      207 -// Middle divider with doorway
      208 -makeBox('wML', -6.5, 2, 0, 9, 4, 1, WALL, scene);
      209 -makeBox('wMR',  6.5, 2, 0, 9, 4, 1, WALL, scene);
      210 -
      211 -// Atmospheric sconces
      212 -[[-14,2,-8],[-14,2,8],[14,2,-8],[14,2,8],[-14,2,2],[14,2,2]].forEach(([x,y,z]) => sconce(x,y,z,scene));
      213 -
      214 -// ── Key ──────────────────────────────────────────────────────────────────────
      197 +// ── Key ───────────────────────────────────────────────────────────────────────
      198  const keyPivot = new BABYLON.TransformNode('keyPivot', scene);
      199  keyPivot.position.set(-10, 0.85, 10);
      200
     ...
      208  holeMat.diffuseColor  = new BABYLON.Color3(0.04, 0.03, 0.03);
      209  holeMat.emissiveColor = new BABYLON.Color3(0.02, 0.01, 0.01);
      210
      228 -// Ring face
      211  const kRing = BABYLON.MeshBuilder.CreateSphere('kRing', {diameter:0.38, segments:10}, scene);
      212  kRing.scaling.z = 0.28; kRing.material = goldMat; kRing.parent = keyPivot;
      213
      232 -// Hole
      214  const kHole = BABYLON.MeshBuilder.CreateSphere('kHole', {diameter:0.21, segments:10}, scene);
      215  kHole.scaling.z = 0.5; kHole.material = holeMat; kHole.parent = keyPivot;
      216
      236 -// Shaft
      217  const kShaft = BABYLON.MeshBuilder.CreateBox('kShaft', {width:0.09, height:0.45, depth:0.09}, scene);
      218  kShaft.position.y = -0.36; kShaft.material = goldMat; kShaft.parent = keyPivot;
      219
      240 -// Teeth
      220  [[0.1,-0.40],[0.1,-0.52]].forEach(([tx,ty],i) => {
      221    const t = BABYLON.MeshBuilder.CreateBox('kt'+i, {width:0.14, height:0.08, depth:0.09}, scene);
      222    t.position.set(tx, ty, 0); t.material = goldMat; t.parent = keyPivot;
      223  });
      224
      246 -// Key glow light
      225  const keyLight = new BABYLON.PointLight('keyLight', new BABYLON.Vector3(-10,0.85,10), scene);
      248 -keyLight.diffuse   = new BABYLON.Color3(1, 0.78, 0.2);
      249 -keyLight.intensity = 0.55;
      250 -keyLight.range     = 5;
      226 +keyLight.diffuse = new BABYLON.Color3(1, 0.78, 0.2);
      227 +keyLight.intensity = 0.55; keyLight.range = 5;
      228
      252 -// ── Exit door ────────────────────────────────────────────────────────────────
      229 +// ── Exit door ─────────────────────────────────────────────────────────────────
      230  makeBox('door', 10, 1.75, 14, 1.6, 3.5, 0.25,
      231    new BABYLON.Color3(0.35, 0.18, 0.07), scene, false);
      232
      256 -// Green beacon light + orb above door
      257 -const exitLight = new BABYLON.PointLight('exitLight', new BABYLON.Vector3(10, 3.8, 14), scene);
      258 -exitLight.diffuse   = new BABYLON.Color3(0, 0.75, 0.35);
      259 -exitLight.intensity = 0.7;
      260 -exitLight.range     = 6;
      233 +const exitLight = new BABYLON.PointLight('exitLight', new BABYLON.Vector3(10,3.8,14), scene);
      234 +exitLight.diffuse = new BABYLON.Color3(0, 0.75, 0.35);
      235 +exitLight.intensity = 0.7; exitLight.range = 6;
      236
      262 -const beaconOrb = BABYLON.MeshBuilder.CreateSphere('beacon', {diameter:0.22, segments:8}, scene);
      263 -beaconOrb.position.set(10, 3.8, 14);
      237 +const beacon = BABYLON.MeshBuilder.CreateSphere('beacon', {diameter:0.22, segments:8}, scene);
      238 +beacon.position.set(10, 3.8, 14);
      239  const beaconMat = new BABYLON.StandardMaterial('beaconMat', scene);
      240  beaconMat.emissiveColor = new BABYLON.Color3(0, 1, 0.5);
      266 -beaconOrb.material = beaconMat;
      241 +beacon.material = beaconMat;
      242
      268 -// Trigger zone (invisible)
      269 -const exitZone = BABYLON.MeshBuilder.CreateBox('exitZone', {width:2.5, height:3.5, depth:1.5}, scene);
      270 -exitZone.position.set(10, 1.75, 14);
      271 -exitZone.isVisible = false;
      272 -exitZone.checkCollisions = false;
      273 -
      274 -// ── Monster ──────────────────────────────────────────────────────────────────
      243 +// ── Monster ───────────────────────────────────────────────────────────────────
      244  const monsterRoot = new BABYLON.TransformNode('monsterRoot', scene);
      245  monsterRoot.position.set(0, 0, 10);
      246
     ...
      248  darkMat.diffuseColor  = new BABYLON.Color3(0.07, 0.05, 0.09);
      249  darkMat.specularColor = new BABYLON.Color3(0.03, 0.03, 0.03);
      250
      282 -function monsterPart(name, w, h, d, x, y, z) {
      251 +function mp(name, w, h, d, x, y, z) {
      252    const m = BABYLON.MeshBuilder.CreateBox(name, {width:w, height:h, depth:d}, scene);
      284 -  m.position.set(x, y, z);
      285 -  m.material = darkMat;
      286 -  m.parent   = monsterRoot;
      287 -  return m;
      253 +  m.position.set(x, y, z); m.material = darkMat; m.parent = monsterRoot; return m;
      254  }
      255 +mp('mbody', 0.75,1.4,0.55, 0,   0.90, 0);
      256 +mp('mhead', 0.70,0.62,0.62, 0,  1.91, 0);
      257 +mp('mneck', 0.24,0.24,0.24, 0,  1.60, 0);
      258 +const mArmL = mp('marmL', 0.20,1.10,0.20, -0.57, 1.15, 0);
      259 +const mArmR = mp('marmR', 0.20,1.10,0.20,  0.57, 1.15, 0);
      260 +mArmL.rotation.z =  0.35; mArmR.rotation.z = -0.35;
      261
      290 -monsterPart('mbody',  0.75, 1.4,  0.55,  0,    0.90, 0);
      291 -monsterPart('mhead',  0.70, 0.62, 0.62,  0,    1.91, 0);
      292 -monsterPart('mneck',  0.24, 0.24, 0.24,  0,    1.60, 0);
      293 -const mArmL = monsterPart('marmL', 0.20, 1.10, 0.20, -0.57, 1.15, 0);
      294 -const mArmR = monsterPart('marmR', 0.20, 1.10, 0.20,  0.57, 1.15, 0);
      295 -mArmL.rotation.z =  0.35;
      296 -mArmR.rotation.z = -0.35;
      297 -
      298 -// Glowing red eyes
      262  const eyeMat = new BABYLON.StandardMaterial('eyeMat', scene);
      300 -eyeMat.emissiveColor  = new BABYLON.Color3(1, 0, 0);
      263 +eyeMat.emissiveColor = new BABYLON.Color3(1, 0, 0);
      264  eyeMat.disableLighting = true;
      265  [-0.18, 0.18].forEach(ex => {
      266    const e = BABYLON.MeshBuilder.CreateSphere('eye'+ex, {diameter:0.10, segments:6}, scene);
      304 -  e.position.set(ex, 2.02, 0.30);
      305 -  e.material = eyeMat;
      306 -  e.parent   = monsterRoot;
      267 +  e.position.set(ex, 2.02, 0.30); e.material = eyeMat; e.parent = monsterRoot;
      268  });
      269
      309 -// Red eye glow light
      310 -const eyeGlow = new BABYLON.PointLight('eyeGlow', new BABYLON.Vector3(0, 2.0, 0.4), scene);
      311 -eyeGlow.parent    = monsterRoot;
      312 -eyeGlow.position  = new BABYLON.Vector3(0, 2.0, 0.4);
      313 -eyeGlow.diffuse   = new BABYLON.Color3(0.9, 0, 0);
      314 -eyeGlow.intensity = 0.35;
      315 -eyeGlow.range     = 6;
      270 +const eyeGlow = new BABYLON.PointLight('eyeGlow', new BABYLON.Vector3(0,2.0,0.4), scene);
      271 +eyeGlow.parent = monsterRoot;
      272 +eyeGlow.position = new BABYLON.Vector3(0, 2.0, 0.4);
      273 +eyeGlow.diffuse = new BABYLON.Color3(0.9,0,0);
      274 +eyeGlow.intensity = 0.35; eyeGlow.range = 6;
      275
      317 -const PATROL_POINTS = [
      318 -  new BABYLON.Vector3( 0, 0, 10),
      319 -  new BABYLON.Vector3(-10, 0, 10),
      320 -  new BABYLON.Vector3(-10, 0, 13),
      321 -  new BABYLON.Vector3( 10, 0, 13),
      322 -  new BABYLON.Vector3( 10, 0, 10),
      276 +const PATROL  = [
      277 +  new BABYLON.Vector3( 0,0,10), new BABYLON.Vector3(-10,0,10),
      278 +  new BABYLON.Vector3(-10,0,13), new BABYLON.Vector3(10,0,13),
      279 +  new BABYLON.Vector3(10,0,10),
      280  ];
      324 -const PATROL_SPEED = 2.2;
      325 -const CHASE_SPEED  = 5.2;
      326 -const SIGHT_RANGE  = 11;
      327 -const CATCH_RANGE  = 1.4;
      281 +const PATROL_SPEED = 2.2, CHASE_SPEED = 5.2, SIGHT = 11, CATCH = 1.4;
      282
      329 -// ── Beacon pulse ─────────────────────────────────────────────────────────────
      283  let beaconT = 0;
      284
      285  // ── Input ─────────────────────────────────────────────────────────────────────
      286  window.addEventListener('keydown', e => {
      334 -  if (!G.started) return;
      335 -  if (e.key === 'f' || e.key === 'F') {
      287 +  keys[e.code] = true;
      288 +  if (e.code === 'KeyF') {
      289      flashOn = !flashOn;
      290      flashlight.intensity = flashOn ? 1.4 : 0;
      291    }
      339 -  if ((e.key === 'r' || e.key === 'R') && (G.gameOver || G.won)) {
      340 -    location.reload();
      341 -  }
      292 +  if (e.code === 'KeyR' && (G.gameOver || G.won)) location.reload();
      293  });
      294 +window.addEventListener('keyup', e => { keys[e.code] = false; });
      295
      344 -// ── Start screen ──────────────────────────────────────────────────────────────
      296  $start.addEventListener('click', () => {
      297    $start.classList.add('hidden');
      298    G.started = true;
     ...
      303    showMessage("Find a way out. Don't be seen.", 5);
      304  });
      305
      355 -// Re-focus and re-lock on canvas click (e.g. after Esc releases mouse)
      306  canvas.addEventListener('click', () => {
      307    if (G.started && !G.gameOver && !G.won) {
      308      canvas.focus();
     ...
      316    if (!G.started || G.gameOver || G.won) return;
      317
      318    // Message timer
      369 -  if (msgTimer > 0) {
      370 -    msgTimer -= dt;
      371 -    if (msgTimer <= 0) $msg.classList.remove('visible');
      372 -  }
      319 +  if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) $msg.classList.remove('visible'); }
      320
      321    // Key spin & bob
      322    keyPivot.rotation.y += 1.2 * dt;
     ...
      324
      325    // Beacon pulse
      326    beaconT += dt;
      380 -  exitLight.intensity   = 0.5 + Math.sin(beaconT * 2) * 0.25;
      381 -  beaconOrb.scaling.setAll(0.9 + Math.sin(beaconT * 2) * 0.12);
      327 +  exitLight.intensity = 0.5 + Math.sin(beaconT * 2) * 0.25;
      328 +  beacon.scaling.setAll(0.9 + Math.sin(beaconT * 2) * 0.12);
      329
      383 -  // Key pickup
      330 +  // ── WASD movement ──
      331 +  const s   = 5 * dt;
      332 +  const fwd = camera.getForwardRay(1).direction;
      333 +  const fl  = Math.sqrt(fwd.x*fwd.x + fwd.z*fwd.z) || 1;
      334 +  const nx  = fwd.x / fl,  nz = fwd.z / fl;   // normalised forward (XZ only)
      335 +  const rx  = nz,          rz = -nx;           // right = 90° rotation of forward
      336 +
      337 +  const mv = new BABYLON.Vector3(0, 0, 0);
      338 +  if (keys['KeyW']) { mv.x += nx*s; mv.z += nz*s; }
      339 +  if (keys['KeyS']) { mv.x -= nx*s; mv.z -= nz*s; }
      340 +  if (keys['KeyA']) { mv.x -= rx*s; mv.z -= rz*s; }
      341 +  if (keys['KeyD']) { mv.x += rx*s; mv.z += rz*s; }
      342 +  if (mv.lengthSquared() > 0) camera.moveWithCollisions(mv);
      343 +  camera.position.y = 1.6; // keep at fixed eye height
      344 +
      345 +  // ── Key pickup ──
      346    if (!G.keyCollected) {
      385 -    const kDist = BABYLON.Vector3.Distance(
      347 +    const d = BABYLON.Vector3.Distance(
      348        new BABYLON.Vector3(camera.position.x, 0, camera.position.z),
      349        new BABYLON.Vector3(-10, 0, 10));
      388 -    if (kDist < 1.6) {
      350 +    if (d < 1.6) {
      351        G.keyCollected = true;
      390 -      keyPivot.setEnabled(false);
      391 -      keyLight.setEnabled(false);
      352 +      keyPivot.setEnabled(false); keyLight.setEnabled(false);
      353        $objKey.textContent = '✓ Find the key';
      354        $objKey.classList.add('done');
      355        sound.playKeyPickup();
     ...
      357      }
      358    }
      359
      399 -  // Exit check
      360 +  // ── Exit check ──
      361    if (G.keyCollected) {
      401 -    const eDist = BABYLON.Vector3.Distance(
      362 +    const d = BABYLON.Vector3.Distance(
      363        new BABYLON.Vector3(camera.position.x, 0, camera.position.z),
      364        new BABYLON.Vector3(10, 0, 14));
      404 -    if (eDist < 2.2) {
      365 +    if (d < 2.2) {
      366        G.won = true;
      367        $objExit.textContent = '✓ Reach the exit';
      368        $objExit.classList.add('done');
     ...
      373    }
      374
      375    // ── Monster AI ──
      415 -  const mPos   = monsterRoot.position;
      416 -  const flat   = (v) => new BABYLON.Vector3(v.x, 0, v.z);
      417 -  const dist   = BABYLON.Vector3.Distance(flat(mPos), flat(camera.position));
      376 +  const mp   = monsterRoot.position;
      377 +  const flat = v => new BABYLON.Vector3(v.x, 0, v.z);
      378 +  const dist = BABYLON.Vector3.Distance(flat(mp), flat(camera.position));
      379
      419 -  if (dist < SIGHT_RANGE)            G.isChasing = true;
      420 -  if (dist > SIGHT_RANGE * 1.6)      G.isChasing = false;
      380 +  if (dist < SIGHT)          G.isChasing = true;
      381 +  if (dist > SIGHT * 1.6)    G.isChasing = false;
      382
      422 -  // Audio transitions
      423 -  if (G.isChasing && !G.wasChasing)  sound.startChase();
      424 -  if (!G.isChasing && G.wasChasing)  sound.stopChase();
      383 +  if ( G.isChasing && !G.wasChasing) sound.startChase();
      384 +  if (!G.isChasing &&  G.wasChasing) sound.stopChase();
      385    G.wasChasing = G.isChasing;
      386
      427 -  // Arm animation
      387    const swingSpeed = G.isChasing ? 7 : 3;
      429 -  const swing      = Math.sin(Date.now() / 1000 * swingSpeed) * (G.isChasing ? 0.38 : 0.14);
      430 -  mArmL.rotation.x =  swing;
      431 -  mArmR.rotation.x = -swing;
      432 -  const tgtZ        = G.isChasing ? 1.35 : 0.35;
      433 -  mArmL.rotation.z += (tgtZ  - mArmL.rotation.z) * dt * 3;
      434 -  mArmR.rotation.z += (-tgtZ - mArmR.rotation.z) * dt * 3;
      388 +  const swing = Math.sin(Date.now() / 1000 * swingSpeed) * (G.isChasing ? 0.38 : 0.14);
      389 +  mArmL.rotation.x =  swing; mArmR.rotation.x = -swing;
      390 +  const tZ = G.isChasing ? 1.35 : 0.35;
      391 +  mArmL.rotation.z += ( tZ - mArmL.rotation.z) * dt * 3;
      392 +  mArmR.rotation.z += (-tZ - mArmR.rotation.z) * dt * 3;
      393
      394    if (G.isChasing) {
      437 -    const dir = flat(camera.position).subtract(flat(mPos)).normalize();
      395 +    const dir = flat(camera.position).subtract(flat(mp)).normalize();
      396      monsterRoot.position.x += dir.x * CHASE_SPEED * dt;
      397      monsterRoot.position.z += dir.z * CHASE_SPEED * dt;
      398      monsterRoot.rotation.y  = Math.atan2(dir.x, dir.z);
      441 -
      442 -    if (dist < CATCH_RANGE) {
      399 +    if (dist < CATCH) {
      400        G.gameOver = true;
      401        $gameover.classList.remove('hidden');
      445 -      sound.stopChase();
      446 -      sound.playCaught();
      402 +      sound.stopChase(); sound.playCaught();
      403      }
      404    } else {
      449 -    const tgt  = PATROL_POINTS[G.patrolIndex];
      450 -    const diff = flat(tgt).subtract(flat(mPos));
      405 +    const tgt  = PATROL[G.patrolIndex];
      406 +    const diff = flat(tgt).subtract(flat(mp));
      407      if (diff.length() < 0.5) {
      452 -      G.patrolIndex = (G.patrolIndex + 1) % PATROL_POINTS.length;
      408 +      G.patrolIndex = (G.patrolIndex + 1) % PATROL.length;
      409      } else {
      410        const dir = diff.normalize();
      411        monsterRoot.position.x += dir.x * PATROL_SPEED * dt;
