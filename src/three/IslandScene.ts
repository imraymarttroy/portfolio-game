import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ISLAND_NPCS, ISLAND_SHELLS } from '../data/portfolioData';
import { distance2D, getTerrainHeight, ISLAND_RADIUS, WATER_LEVEL } from '../game/logic';
import {
  Collider,
  getBushes,
  getSurfaceHeight,
  npcColliders,
  STATIC_COLLIDERS,
  stepPlayer,
} from '../game/world';
import { soundManager } from '../audio/soundSynthesizer';
import { GameState, Vector3D } from '../types/game';

// Software WebGL Detection as specified by Three.js skill
export const isSoftwareGl = (() => {
  if (typeof document === 'undefined') return true;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param));
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
})();

// Module-level reusable scratch vectors for zero-allocation render loop
const _vec3_player = new THREE.Vector3();
const _vec3_targetCam = new THREE.Vector3();
const _vec3_targetLook = new THREE.Vector3();
const _vec3_scratch1 = new THREE.Vector3();
const _vec3_scratch2 = new THREE.Vector3();

export interface IslandSceneCallbacks {
  onNpcProximity: (npcId: string | null) => void;
  onShellCollected: (shellId: string) => void;
  onPlayerMoved: (pos: Vector3D) => void;
}

/** Hip height of the player avatar (legs pivot here, upper body sits here). */
const PLAYER_HIP_Y = 0.42;

/** Camera zoom limits, as multiples of the default follow distance. */
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.2;

export class IslandSceneController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private isDestroyed: boolean = false;
  private frameId: number = 0;

  // Game actors & references
  private playerGroup: THREE.Group = new THREE.Group();
  private playerBodyMesh!: THREE.Object3D;
  private playerHeadMesh!: THREE.Object3D;
  private playerLeftLeg!: THREE.Object3D;
  private playerRightLeg!: THREE.Object3D;
  private playerLeftArm!: THREE.Object3D;
  private playerRightArm!: THREE.Object3D;
  private playerShadowDisc!: THREE.Mesh;
  private playerFacingAngle: number = 0;

  private npcGroups: Map<string, THREE.Group> = new Map();
  private npcEmoteMeshes: Map<string, THREE.Group> = new Map();
  private shellMeshes: Map<string, THREE.Group> = new Map();
  private windmillBladesGroup!: THREE.Group;
  private lighthouseBeamGroup!: THREE.Group;
  private campfireLight!: THREE.PointLight;
  private oceanMesh!: THREE.Mesh;

  // Particle systems
  private stepParticles: THREE.InstancedMesh | null = null;
  private particleIndices = 0;
  private particleData: { x: number; y: number; z: number; scale: number; life: number }[] = [];

  // State
  private gameState: GameState = 'title';

  // Camera zoom (1 = default follow distance). Wheel, trackpad/touch pinch and +/- keys.
  private zoom = 1;
  private targetZoom = 1;
  private activeTouches = new Map<number, { x: number; y: number }>();
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private heldKeys: Set<string> = new Set();
  private playerPos = { x: 0, y: 0.5, z: 8 };
  private playerVel = { x: 0, y: 0, z: 0 };
  private colliders: Collider[] = [...STATIC_COLLIDERS, ...npcColliders(ISLAND_NPCS)];
  private isJumping: boolean = false;
  private jumpVelocity: number = 0;
  private walkTime: number = 0;
  private stepSoundTimer: number = 0;
  private titleCamAngle: number = 0;
  private collectedShells: Set<string> = new Set();
  private callbacks: IslandSceneCallbacks;

  // Mobile virtual joystick input
  private joystickInput = { x: 0, y: 0 };

  constructor(container: HTMLElement, callbacks: IslandSceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Clock();

    // 1. Renderer initialization
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth, container.clientHeight);

    container.appendChild(this.renderer.domElement);

    // 2. Scene & Camera setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbbf2f6); // Warm coastal cyan
    this.scene.fog = new THREE.FogExp2(0xbbf2f6, 0.013);

    this.camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / container.clientHeight,
      0.2,
      250
    );
    this.camera.position.set(0, 16, 28);
    this.camera.lookAt(0, 2, 0);

    // 3. Procedural Studio Environment Reflection
    try {
      const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
      this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      pmremGenerator.dispose();
    } catch {
      // Fallback in case room environment is unavailable
    }

    // 4. Lighting Rig (Key warm light + cool hemisphere fill)
    this.setupLighting();

    // 5. Construct Procedural Island World
    this.buildTerrain();
    this.buildOcean();
    this.buildLighthouse();
    this.buildWindmill();
    this.buildPavilion();
    this.buildCampfirePeak();
    this.buildPier();
    this.buildFoliage();
    this.buildNpcs();
    this.buildShells();
    this.buildPlayer();
    this.setupParticles();

    // 6. Pre-warm shaders
    if (!isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // 7. Event listeners
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    const canvas = this.renderer.domElement;
    canvas.style.touchAction = 'none'; // let our pinch handle zoom instead of the browser
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerUp);

    // Start render loop
    this.startLoop();
  }

  private setupLighting() {
    // Cool sky / warm ground hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xe0f7fa, 0x8d6e63, 0.9);
    hemiLight.position.set(0, 40, 0);
    this.scene.add(hemiLight);

    // Warm Sun Key Light
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
    sunLight.position.set(28, 45, 20);
    sunLight.castShadow = !isSoftwareGl;
    if (!isSoftwareGl) {
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 10;
      sunLight.shadow.camera.far = 110;
      const d = 38;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      sunLight.shadow.normalBias = 0.02;
    }
    this.scene.add(sunLight);

    // Soft ambient backlight
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.45);
    rimLight.position.set(-25, 20, -25);
    this.scene.add(rimLight);
  }

  private buildTerrain() {
    const terrainGeo = new THREE.PlaneGeometry(76, 76, 72, 72);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    const colors: number[] = [];

    const sandColor = new THREE.Color(0xfde68a); // Warm sand
    const grassColor = new THREE.Color(0x86efac); // Vibrant cozy meadow
    const peakColor = new THREE.Color(0xa7f3d0); // Sage mountain crest
    const rockColor = new THREE.Color(0x94a3b8); // Granite rock

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.sqrt(x * x + z * z);

      const h = getTerrainHeight(x, z); // already slopes under the water past the shore
      pos.setY(i, h);

      // Vertex color grading
      if (dist > 25.5 || h < 0.28) {
        colors.push(sandColor.r, sandColor.g, sandColor.b);
      } else if (h > 3.2) {
        const mix = THREE.MathUtils.clamp((h - 3.2) / 1.6, 0, 1);
        const c = rockColor.clone().lerp(peakColor, mix);
        colors.push(c.r, c.g, c.b);
      } else {
        // Meadow with subtle natural variation
        const noise = (Math.sin(x * 0.4) + Math.cos(z * 0.4)) * 0.08;
        const c = grassColor.clone().offsetHSL(noise * 0.05, 0, noise * 0.06);
        colors.push(c.r, c.g, c.b);
      }
    }

    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = !isSoftwareGl;
    this.scene.add(terrainMesh);
  }

  private buildOcean() {
    // Calming stylized water plane
    const oceanGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
    oceanGeo.rotateX(-Math.PI / 2);

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.78,
    });

    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.position.y = WATER_LEVEL;
    this.scene.add(this.oceanMesh);

    // Shoreline foam ring
    // Sits where the beach slope meets the water (see getTerrainHeight).
    const foamGeo = new THREE.RingGeometry(30.6, 32.2, 64);
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const foamMesh = new THREE.Mesh(foamGeo, foamMat);
    foamMesh.position.y = 0.08;
    this.scene.add(foamMesh);
  }

  private buildLighthouse() {
    const group = new THREE.Group();
    const x = -18;
    const z = 19;
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    // 1. Stone rock foundation
    const baseGeo = new THREE.CylinderGeometry(3.6, 4.2, 1.2, 8);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 0.6;
    base.castShadow = !isSoftwareGl;
    base.receiveShadow = !isSoftwareGl;
    group.add(base);

    // 2. Striped tower sections
    const towerMatWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const towerMatRed = new THREE.MeshStandardMaterial({ color: 0xdd8669, roughness: 0.45 });

    const bandHeights = [1.8, 1.8, 1.8, 1.8];
    let curY = 1.2;
    for (let i = 0; i < 4; i++) {
      const rTop = 2.4 - i * 0.25;
      const rBottom = 2.8 - i * 0.25;
      const bandGeo = new THREE.CylinderGeometry(rTop, rBottom, bandHeights[i], 12);
      const band = new THREE.Mesh(bandGeo, i % 2 === 0 ? towerMatWhite : towerMatRed);
      band.position.y = curY + bandHeights[i] / 2;
      band.castShadow = !isSoftwareGl;
      group.add(band);
      curY += bandHeights[i];
    }

    // 3. Black iron observation deck
    const deckGeo = new THREE.CylinderGeometry(2.1, 2.1, 0.25, 12);
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.6 });
    const deck = new THREE.Mesh(deckGeo, ironMat);
    deck.position.y = curY + 0.125;
    group.add(deck);

    // Railing
    const railGeo = new THREE.TorusGeometry(2.0, 0.06, 6, 16);
    railGeo.rotateX(Math.PI / 2);
    const rail = new THREE.Mesh(railGeo, ironMat);
    rail.position.y = curY + 0.45;
    group.add(rail);

    // 4. Glass lantern room
    const glassGeo = new THREE.CylinderGeometry(1.4, 1.4, 1.3, 10);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      emissive: 0xfef08a,
      emissiveIntensity: 0.4,
    });
    const lantern = new THREE.Mesh(glassGeo, glassMat);
    lantern.position.y = curY + 0.9;
    group.add(lantern);

    // 5. Roof cupola dome + finial
    const roofGeo = new THREE.ConeGeometry(1.6, 1.2, 12);
    const roof = new THREE.Mesh(roofGeo, ironMat);
    roof.position.y = curY + 2.15;
    group.add(roof);

    // 6. Rotating light beam cone
    this.lighthouseBeamGroup = new THREE.Group();
    this.lighthouseBeamGroup.position.set(0, curY + 0.9, 0);

    const beamGeo = new THREE.ConeGeometry(2.8, 14, 16, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 7);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    this.lighthouseBeamGroup.add(beam);
    group.add(this.lighthouseBeamGroup);

    this.scene.add(group);
  }

  private buildWindmill() {
    const group = new THREE.Group();
    const x = 18;
    const z = 12;
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    // 1. Octagonal stone base
    const baseGeo = new THREE.CylinderGeometry(3.2, 3.8, 2.5, 8);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
    const base = new THREE.Mesh(baseGeo, stoneMat);
    base.position.y = 1.25;
    base.castShadow = !isSoftwareGl;
    group.add(base);

    // 2. Timber upper house
    const timberGeo = new THREE.CylinderGeometry(2.4, 3.0, 3.2, 8);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
    const house = new THREE.Mesh(timberGeo, woodMat);
    house.position.y = 2.5 + 1.6;
    house.castShadow = !isSoftwareGl;
    group.add(house);

    // 3. Conical shingle roof
    const roofGeo = new THREE.ConeGeometry(2.8, 2.2, 8);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 5.7 + 1.1;
    group.add(roof);

    // 4. Turning 4-blade rotor group
    this.windmillBladesGroup = new THREE.Group();
    this.windmillBladesGroup.position.set(0, 5.2, 2.5);

    const hubGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.6, 8);
    hubGeo.rotateX(Math.PI / 2);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.6 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    this.windmillBladesGroup.add(hub);

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 4; i++) {
      const bladeArm = new THREE.Group();
      bladeArm.rotation.z = (i * Math.PI) / 2;

      // Spar
      const sparGeo = new THREE.BoxGeometry(0.12, 4.4, 0.12);
      sparGeo.translate(0, 2.2, 0);
      const spar = new THREE.Mesh(sparGeo, hubMat);
      bladeArm.add(spar);

      // Canvas vane
      const sailGeo = new THREE.PlaneGeometry(1.1, 3.2);
      sailGeo.translate(0.55, 2.5, 0.05);
      const sail = new THREE.Mesh(sailGeo, bladeMat);
      sail.castShadow = !isSoftwareGl;
      bladeArm.add(sail);

      this.windmillBladesGroup.add(bladeArm);
    }
    group.add(this.windmillBladesGroup);

    this.scene.add(group);
  }

  private buildPavilion() {
    const group = new THREE.Group();
    const x = -14;
    const z = -14;
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    // Decking
    const deckGeo = new THREE.CylinderGeometry(4.2, 4.4, 0.35, 12);
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const deck = new THREE.Mesh(deckGeo, woodMat);
    deck.position.y = 0.18;
    deck.receiveShadow = !isSoftwareGl;
    group.add(deck);

    // Pillars (6 posts)
    const postMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 });
    const postGeo = new THREE.CylinderGeometry(0.16, 0.16, 2.6, 8);
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const px = Math.cos(angle) * 3.4;
      const pz = Math.sin(angle) * 3.4;
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, 1.4, pz);
      post.castShadow = !isSoftwareGl;
      group.add(post);
    }

    // Striped awning canopy roof
    const canopyGeo = new THREE.ConeGeometry(4.4, 1.8, 12);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.4 });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.y = 3.6;
    canopy.castShadow = !isSoftwareGl;
    group.add(canopy);

    // Cafe counter & stools
    const counterGeo = new THREE.BoxGeometry(2.4, 0.9, 0.8);
    const counter = new THREE.Mesh(counterGeo, woodMat);
    counter.position.set(0, 0.65, 0);
    group.add(counter);

    // Crystal accent
    const crystalGeo = new THREE.OctahedronGeometry(0.5, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      roughness: 0.1,
      metalness: 0.3,
      emissive: 0xa855f7,
      emissiveIntensity: 0.5,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(0, 1.4, 0);
    group.add(crystal);

    this.scene.add(group);
  }

  private buildCampfirePeak() {
    const group = new THREE.Group();
    const x = 0;
    const z = -20;
    const y = getTerrainHeight(x, z);
    group.position.set(x, y, z);

    // Fire pit ring stones
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const sx = Math.cos(angle) * 0.9;
      const sz = Math.sin(angle) * 0.9;
      const stoneGeo = new THREE.DodecahedronGeometry(0.24, 0);
      const stone = new THREE.Mesh(stoneGeo, stoneMat);
      stone.position.set(sx, 0.15, sz);
      group.add(stone);
    }

    // Glowing coals
    const coalGeo = new THREE.ConeGeometry(0.55, 0.65, 6);
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.8,
      roughness: 0.5,
    });
    const coals = new THREE.Mesh(coalGeo, coalMat);
    coals.position.y = 0.32;
    group.add(coals);

    // Campfire PointLight
    this.campfireLight = new THREE.PointLight(0xf97316, 2.2, 10);
    this.campfireLight.position.set(0, 0.8, 0);
    group.add(this.campfireLight);

    // Wooden log benches
    const logGeo = new THREE.CylinderGeometry(0.28, 0.28, 2.2, 8);
    logGeo.rotateZ(Math.PI / 2);
    const logMat = new THREE.MeshStandardMaterial({ color: 0x543621, roughness: 0.85 });
    const bench1 = new THREE.Mesh(logGeo, logMat);
    bench1.position.set(0, 0.25, 1.8);
    group.add(bench1);

    const bench2 = new THREE.Mesh(logGeo, logMat);
    bench2.position.set(-1.8, 0.25, 0);
    bench2.rotation.y = Math.PI / 2;
    group.add(bench2);

    // Brass telescope
    const tripodGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.3, 6);
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.7 });
    const leg1 = new THREE.Mesh(tripodGeo, brassMat);
    leg1.rotation.z = 0.2;
    leg1.position.set(2.2, 0.65, -0.8);
    group.add(leg1);

    const scopeGeo = new THREE.CylinderGeometry(0.14, 0.09, 1.2, 8);
    scopeGeo.rotateX(Math.PI / 3);
    const scope = new THREE.Mesh(scopeGeo, brassMat);
    scope.position.set(2.2, 1.35, -0.8);
    group.add(scope);

    this.scene.add(group);
  }

  private buildPier() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.85 });

    // Deck planks
    const pierLength = 12;
    for (let i = 0; i < pierLength; i++) {
      const plankGeo = new THREE.BoxGeometry(2.4, 0.15, 0.7);
      const plank = new THREE.Mesh(plankGeo, woodMat);
      const pz = 18 + i * 0.75;
      const px = -16 - (i * 0.3);
      plank.position.set(px, 0.32, pz);
      plank.receiveShadow = !isSoftwareGl;
      group.add(plank);

      // Support pilings every 3 planks
      if (i % 3 === 0) {
        const pileGeo = new THREE.CylinderGeometry(0.16, 0.16, 1.6, 6);
        const pileL = new THREE.Mesh(pileGeo, woodMat);
        pileL.position.set(px - 1.0, -0.4, pz);
        group.add(pileL);

        const pileR = new THREE.Mesh(pileGeo, woodMat);
        pileR.position.set(px + 1.0, -0.4, pz);
        group.add(pileR);
      }
    }

    // Moored little rowboat
    const boatGroup = new THREE.Group();
    boatGroup.position.set(-22, 0.2, 25);
    boatGroup.rotation.y = 0.5;

    const boatHullGeo = new THREE.BoxGeometry(1.6, 0.6, 3.2);
    const boatMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const boatHull = new THREE.Mesh(boatHullGeo, boatMat);
    boatGroup.add(boatHull);

    const seatGeo = new THREE.BoxGeometry(1.4, 0.1, 0.6);
    const seat = new THREE.Mesh(seatGeo, woodMat);
    seat.position.y = 0.15;
    boatGroup.add(seat);
    group.add(boatGroup);

    this.scene.add(group);
  }

  private buildFoliage() {
    // Flowering bushes and rock boulders
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
    getBushes().forEach(({ x: bx, y: by, z: bz }) => {
      const bushGroup = new THREE.Group();
      bushGroup.position.set(bx, by, bz);

      const bGeo = new THREE.SphereGeometry(0.65, 6, 6);
      bGeo.scale(1, 0.7, 1);
      const bMesh = new THREE.Mesh(bGeo, bushMat);
      bMesh.position.y = 0.35;
      bushGroup.add(bMesh);

      // Accent flower dot
      const fGeo = new THREE.SphereGeometry(0.16, 4, 4);
      const fMesh = new THREE.Mesh(fGeo, flowerMat);
      fMesh.position.set(0.2, 0.65, 0.2);
      bushGroup.add(fMesh);

      this.scene.add(bushGroup);
    });
  }

  private buildNpcs() {
    ISLAND_NPCS.forEach((npc) => {
      const group = new THREE.Group();
      const x = npc.position[0];
      const z = npc.position[2];
      const y = getSurfaceHeight(x, z);
      group.position.set(x, y, z);
      group.rotation.y = npc.rotation;

      // 1. Soft radial contact shadow
      const shadowGeo = new THREE.CircleGeometry(0.65, 12);
      shadowGeo.rotateX(-Math.PI / 2);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.position.y = 0.02;
      group.add(shadow);

      // 2. Character body (tunic / robe)
      const bodyGeo = new THREE.CylinderGeometry(0.42, 0.55, 1.1, 8);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(npc.accentColor),
        roughness: 0.65,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.55;
      body.castShadow = !isSoftwareGl;
      group.add(body);

      // 3. Head
      const headGeo = new THREE.SphereGeometry(0.4, 8, 8);
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.6 });
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.35;
      head.castShadow = !isSoftwareGl;
      group.add(head);

      // 4. Eyes
      const eyeGeo = new THREE.SphereGeometry(0.06, 4, 4);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(0.13, 1.4, 0.36);
      group.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(-0.13, 1.4, 0.36);
      group.add(rightEye);

      // 5. Unique Hat / Accessory per NPC
      if (npc.id === 'captain_barnaby') {
        // Captain navy hat with gold trim
        const capGeo = new THREE.CylinderGeometry(0.48, 0.44, 0.28, 8);
        const capMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 1.68;
        group.add(cap);

        const visorGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 8, 1, false, 0, Math.PI);
        const visor = new THREE.Mesh(visorGeo, new THREE.MeshStandardMaterial({ color: 0x0f172a }));
        visor.position.set(0, 1.58, 0.1);
        group.add(visor);
      } else if (npc.id === 'gearsmith_pip') {
        // Brass goggles
        const goggleGeo = new THREE.TorusGeometry(0.18, 0.06, 4, 8);
        const brass = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });
        const g1 = new THREE.Mesh(goggleGeo, brass);
        g1.position.set(0.16, 1.52, 0.35);
        group.add(g1);
        const g2 = new THREE.Mesh(goggleGeo, brass);
        g2.position.set(-0.16, 1.52, 0.35);
        group.add(g2);
      } else if (npc.id === 'curator_celeste') {
        // Artist beret
        const beretGeo = new THREE.CylinderGeometry(0.52, 0.35, 0.18, 8);
        beretGeo.rotateZ(0.2);
        const beretMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.5 });
        const beret = new THREE.Mesh(beretGeo, beretMat);
        beret.position.set(0.08, 1.7, 0);
        group.add(beret);
      } else if (npc.id === 'sage_zephyr') {
        // Mystical sage cowl / hood
        const hoodGeo = new THREE.ConeGeometry(0.54, 0.75, 7);
        const hoodMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8 });
        const hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.position.y = 1.85;
        group.add(hood);
      } else if (npc.id === 'puck_courier') {
        // Courier satchel
        const satchelGeo = new THREE.BoxGeometry(0.35, 0.3, 0.16);
        const satchelMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
        const satchel = new THREE.Mesh(satchelGeo, satchelMat);
        satchel.position.set(0.48, 0.65, 0.1);
        group.add(satchel);
      }

      // 6. Floating Chat Bubble Indicator
      const emoteGroup = new THREE.Group();
      emoteGroup.position.set(0, 2.3, 0);

      const bubbleGeo = new THREE.SphereGeometry(0.32, 8, 8);
      const bubbleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const bubble = new THREE.Mesh(bubbleGeo, bubbleMat);
      emoteGroup.add(bubble);

      const tailGeo = new THREE.ConeGeometry(0.15, 0.28, 4);
      tailGeo.rotateX(Math.PI);
      const tail = new THREE.Mesh(tailGeo, bubbleMat);
      tail.position.y = -0.25;
      emoteGroup.add(tail);

      group.add(emoteGroup);
      this.npcEmoteMeshes.set(npc.id, emoteGroup);

      this.scene.add(group);
      this.npcGroups.set(npc.id, group);
    });
  }

  /** Draws one face of the gold ₱ coin (flat-top hexagon) onto a canvas texture. */
  private createPesoCoinTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const c = size / 2;

    const hexPath = (r: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const x = c + Math.cos(a) * r;
        const y = c + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    // Outer face: warm gold gradient.
    const face = ctx.createLinearGradient(0, 0, 0, size);
    face.addColorStop(0, '#ffe48a');
    face.addColorStop(0.5, '#f8bb2c');
    face.addColorStop(1, '#e48d14');
    hexPath(c);
    ctx.fillStyle = face;
    ctx.fill();

    // Raised rim and recessed centre.
    hexPath(c * 0.78);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#c97a10';
    ctx.stroke();
    const inner = ctx.createLinearGradient(0, c * 0.3, 0, size - c * 0.3);
    inner.addColorStop(0, '#f2a51f');
    inner.addColorStop(1, '#fcc844');
    ctx.fillStyle = inner;
    ctx.fill();
    hexPath(c * 0.72);
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 243, 196, 0.75)';
    ctx.stroke();

    // ₱ glyph drawn as strokes (no font dependency): shadow, then highlight.
    const drawPeso = (dx: number, dy: number, color: string, width: number) => {
      ctx.save();
      ctx.translate(dx, dy);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      // Stem
      ctx.moveTo(108, 178);
      ctx.lineTo(108, 80);
      // Bowl
      ctx.lineTo(136, 80);
      ctx.arc(136, 106, 26, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(108, 132);
      // Two bars
      ctx.moveTo(86, 98);
      ctx.lineTo(176, 98);
      ctx.moveTo(86, 116);
      ctx.lineTo(176, 116);
      ctx.stroke();
      ctx.restore();
    };
    drawPeso(5, 6, 'rgba(120, 60, 4, 0.6)', 20);
    drawPeso(0, 0, '#a85c08', 20);
    drawPeso(-1, -1, '#fff2b8', 13);
    drawPeso(0, 0, '#f9bf33', 8);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }

  private buildShells() {
    const COIN_R = 0.56;
    const COIN_DEPTH = 0.2;

    const faceTex = this.createPesoCoinTexture();
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      emissive: 0xffffff,
      emissiveMap: faceTex,
      emissiveIntensity: 0.28,
      roughness: 0.32,
      metalness: 0.45,
    });
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xe0961a,
      emissive: 0xb86a08,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.7,
    });

    // Hexagonal coin body, standing upright with a flat top like the face art.
    const bodyGeo = new THREE.CylinderGeometry(COIN_R, COIN_R, COIN_DEPTH, 6);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.rotateZ(Math.PI / 6);
    const faceGeo = new THREE.CircleGeometry(COIN_R * 0.995, 6);

    ISLAND_SHELLS.forEach((shell) => {
      const group = new THREE.Group();
      const x = shell.position[0];
      const z = shell.position[2];
      const y = getTerrainHeight(x, z) + 0.65;
      group.position.set(x, y, z);

      // Contact glow ring on the ground
      const ringGeo = new THREE.RingGeometry(0.3, 0.55, 12);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfde047,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = -0.6;
      group.add(ring);

      const coin = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, edgeMat);
      body.castShadow = !isSoftwareGl;
      coin.add(body);

      const front = new THREE.Mesh(faceGeo, faceMat);
      front.position.z = COIN_DEPTH / 2 + 0.002;
      coin.add(front);

      const back = new THREE.Mesh(faceGeo, faceMat);
      back.position.z = -COIN_DEPTH / 2 - 0.002;
      back.rotation.y = Math.PI;
      coin.add(back);

      // Little sparkle that twinkles on the rim
      const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
      const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), sparkleMat);
      sparkle.scale.set(0.5, 1.6, 0.5);
      sparkle.position.set(-COIN_R * 0.55, COIN_R * 0.72, COIN_DEPTH / 2 + 0.03);
      sparkle.name = 'sparkle';
      coin.add(sparkle);

      group.add(coin);
      this.scene.add(group);
      this.shellMeshes.set(shell.id, group);
    });
  }

  private buildPlayer() {
    this.playerGroup = new THREE.Group();
    this.playerPos.y = getTerrainHeight(this.playerPos.x, this.playerPos.z);
    this.playerGroup.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);

    // 1. Soft radial contact shadow
    const shadowGeo = new THREE.CircleGeometry(0.5, 12);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    this.playerShadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
    this.playerShadowDisc.position.y = 0.02;
    this.playerGroup.add(this.playerShadowDisc);

    // Player avatar: Raymart Troy in a chunky, heroic mobile-strategy cartoon
    // style — oversized head, broad shoulders, big fists and boots, short
    // sturdy legs. Keeps his tan cap, headphones, cream jacket over a navy
    // tee, brown belt, jeans, hiking boots and ID lanyard. Faces +Z.
    const mat = (color: number, roughness = 0.55, metalness = 0) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const skinMat = mat(0xd39a70, 0.5);
    const hairMat = mat(0x1d1612, 0.7);
    const capMat = mat(0xb07a30, 0.6);
    const headphoneMat = mat(0x2b2b2c, 0.4, 0.3);
    const jacketMat = mat(0xe6d6b6, 0.7);
    jacketMat.side = THREE.DoubleSide;
    const teeMat = mat(0x1f2a44, 0.7);
    const jeansMat = mat(0x3a5c92, 0.7);
    const beltMat = mat(0x6b4426, 0.5);
    const buckleMat = mat(0xf2c14e, 0.25, 0.85); // chunky gold buckle
    const bootMat = mat(0x3a2f29, 0.6);
    const bootAccentMat = mat(0x9a3b2c, 0.6);
    const soleMat = mat(0x141414, 0.9);
    const cast = (m: THREE.Mesh) => {
      m.castShadow = !isSoftwareGl;
      return m;
    };

    // --- Short sturdy legs (pivot at the hip so they swing naturally) ---
    const buildLeg = (side: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.16 * side, PLAYER_HIP_Y, 0);

      const jeans = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.125, 0.26, 10), jeansMat));
      jeans.position.y = -0.13;
      pivot.add(jeans);

      // Oversized boots
      const boot = cast(new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.19, 0.4), bootMat));
      boot.position.set(0, -0.31, 0.06);
      pivot.add(boot);
      const toe = cast(new THREE.Mesh(new THREE.SphereGeometry(0.135, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), bootMat));
      toe.scale.set(1, 0.9, 0.8);
      toe.position.set(0, -0.395, 0.24);
      pivot.add(toe);
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.22), bootAccentMat);
      band.position.set(0, -0.24, 0.1);
      pivot.add(band);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.05, 0.46), soleMat);
      sole.position.set(0, -0.4, 0.08);
      pivot.add(sole);

      this.playerGroup.add(pivot);
      return pivot;
    };
    this.playerLeftLeg = buildLeg(1);
    this.playerRightLeg = buildLeg(-1);

    // --- Upper body (bobs while walking) ---
    const upper = new THREE.Group();
    upper.position.y = PLAYER_HIP_Y;
    this.playerBodyMesh = upper;
    this.playerGroup.add(upper);

    // Belt + chunky buckle
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.09, 16), beltMat);
    belt.position.y = 0.02;
    upper.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), buckleMat);
    buckle.position.set(0, 0.02, 0.3);
    upper.add(buckle);

    // Navy tee: V-shaped heroic torso, wide at the shoulders
    const tee = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.27, 0.5, 16), teeMat));
    tee.position.y = 0.3;
    upper.add(tee);

    // Open cream jacket: a shell with a gap at the front so the tee shows
    const jacketGap = 0.5;
    const jacket = cast(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.31, 0.56, 18, 1, true, jacketGap, Math.PI * 2 - jacketGap * 2),
        jacketMat
      )
    );
    jacket.position.y = 0.28;
    upper.add(jacket);
    const shoulders = cast(new THREE.Mesh(new THREE.SphereGeometry(0.385, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.4), jacketMat));
    shoulders.position.y = 0.55;
    shoulders.scale.set(1, 0.5, 0.95);
    upper.add(shoulders);
    // Collar + lapels
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.045, 6, 16), jacketMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.6;
    upper.add(collar);
    [-1, 1].forEach((side) => {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.025), jacketMat);
      lapel.position.set(0.13 * side, 0.45, 0.32);
      lapel.rotation.z = 0.35 * side;
      lapel.rotation.y = 0.3 * side;
      upper.add(lapel);
    });

    // Lanyard + ID card
    const cordMat = mat(0x111111, 0.8);
    [-1, 1].forEach((side) => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), cordMat);
      cord.position.set(0.07 * side, 0.45, 0.3);
      cord.rotation.z = -0.32 * side;
      cord.rotation.x = -0.25;
      upper.add(cord);
    });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.015), mat(0xf4f1ea, 0.5));
    card.position.set(0, 0.27, 0.315);
    upper.add(card);
    const cardPhoto = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.005), mat(0x6a8fd8, 0.5));
    cardPhoto.position.set(0, 0.295, 0.325);
    upper.add(cardPhoto);

    // Arms (pivot at the shoulder): thick sleeves, cuffs and big fists
    const buildArm = (side: number) => {
      const pivot = new THREE.Group();
      pivot.position.set(0.43 * side, 0.5, 0);
      pivot.rotation.z = 0.2 * side;

      const sleeve = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.105, 0.36, 10), jacketMat));
      sleeve.position.y = -0.18;
      pivot.add(sleeve);
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.03, 6, 12), jacketMat);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.35;
      pivot.add(cuff);
      const fist = cast(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skinMat));
      fist.scale.set(1, 0.95, 1.08);
      fist.position.y = -0.45;
      pivot.add(fist);
      const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), skinMat);
      thumb.position.set(-0.06 * side, -0.41, 0.1);
      pivot.add(thumb);

      upper.add(pivot);
      return pivot;
    };
    this.playerLeftArm = buildArm(1);
    this.playerRightArm = buildArm(-1);

    // Short thick neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.1, 10), skinMat);
    neck.position.y = 0.63;
    upper.add(neck);

    // --- Oversized head ---
    const head = new THREE.Group();
    head.position.y = 0.95;
    head.scale.setScalar(1.35);
    this.playerHeadMesh = head;
    upper.add(head);

    const face = cast(new THREE.Mesh(new THREE.SphereGeometry(0.29, 20, 16), skinMat));
    face.scale.set(1.04, 1.02, 0.98);
    head.add(face);
    // Strong, squared cartoon jaw
    const jaw = cast(new THREE.Mesh(new THREE.SphereGeometry(0.25, 18, 12), skinMat));
    jaw.scale.set(1.12, 0.78, 1.02);
    jaw.position.set(0, -0.1, 0.02);
    head.add(jaw);
    // Ears
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), skinMat);
      ear.scale.set(0.6, 1, 0.9);
      ear.position.set(0.3 * side, -0.03, 0.02);
      head.add(ear);
    });

    // Hair: dark cap of hair at the back and sides, peeking under the cap
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3, 18, 10, Math.PI * 0.8, Math.PI * 1.4, 0.25, Math.PI * 0.6), hairMat);
    hair.position.y = 0.01;
    head.add(hair);
    [-1, 1].forEach((side) => {
      const sideburn = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.13, 0.08), hairMat);
      sideburn.position.set(0.27 * side, 0.0, 0.1);
      head.add(sideburn);
    });

    // Big bold eyes with highlights, thick confident brows, wide grin
    const scleraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x24170f });
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), scleraMat);
      eye.position.set(0.105 * side, 0.0, 0.25);
      eye.scale.set(0.95, 1.1, 0.5);
      head.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), pupilMat);
      pupil.position.set(0.1 * side, -0.005, 0.28);
      pupil.scale.set(1, 1.1, 0.4);
      head.add(pupil);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 4), scleraMat);
      glint.position.set(0.112 * side, 0.015, 0.297);
      head.add(glint);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.04), hairMat);
      brow.position.set(0.11 * side, 0.075, 0.283);
      brow.rotation.z = 0.28 * side; // inner ends low: determined look
      head.add(brow);
    });
    // Grin: dark mouth with a row of teeth
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16, Math.PI, Math.PI), mat(0x5a2620, 0.8));
    mouth.scale.set(1.15, 0.7, 1);
    mouth.position.set(0, -0.12, 0.292);
    mouth.rotation.x = -0.25;
    head.add(mouth);
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.01), scleraMat);
    teeth.position.set(0, -0.132, 0.296);
    teeth.rotation.x = -0.25;
    head.add(teeth);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skinMat);
    nose.scale.set(1, 0.85, 0.9);
    nose.position.set(0, -0.025, 0.29);
    head.add(nose);

    // Tan baseball cap: crown + front brim
    const crown = cast(new THREE.Mesh(new THREE.SphereGeometry(0.31, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat));
    crown.position.y = 0.1;
    crown.scale.set(1.02, 0.86, 1.02);
    head.add(crown);
    const capBand = new THREE.Mesh(new THREE.CylinderGeometry(0.316, 0.316, 0.05, 18, 1, true), capMat);
    capBand.position.y = 0.1;
    head.add(capBand);
    const brim = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 16, 1, false, -Math.PI / 2, Math.PI), capMat));
    brim.scale.set(1.2, 1, 1.4);
    brim.position.set(0, 0.115, 0.17);
    brim.rotation.x = 0.12;
    head.add(brim);
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), capMat);
    button.position.y = 0.34;
    head.add(button);

    // Headphones over the cap
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.335, 0.032, 6, 18, Math.PI), headphoneMat);
    head.add(band);
    [-1, 1].forEach((side) => {
      const cup = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.09, 14), headphoneMat));
      cup.rotation.z = Math.PI / 2;
      cup.position.set(0.32 * side, -0.02, 0);
      head.add(cup);
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 14), mat(0x111111, 0.9));
      pad.rotation.z = Math.PI / 2;
      pad.position.set(0.37 * side, -0.02, 0);
      head.add(pad);
    });

    this.scene.add(this.playerGroup);
  }

  private setupParticles() {
    const particleCount = 24;
    const geo = new THREE.SphereGeometry(0.12, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.6,
    });

    this.stepParticles = new THREE.InstancedMesh(geo, mat, particleCount);
    this.stepParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.stepParticles);

    for (let i = 0; i < particleCount; i++) {
      this.particleData.push({ x: 0, y: -10, z: 0, scale: 0, life: 0 });
      const dummy = new THREE.Object3D();
      dummy.position.set(0, -10, 0);
      dummy.updateMatrix();
      this.stepParticles.setMatrixAt(i, dummy.matrix);
    }
    this.stepParticles.instanceMatrix.needsUpdate = true;
  }

  private emitStepParticle(x: number, y: number, z: number) {
    if (!this.stepParticles) return;
    const idx = this.particleIndices % this.particleData.length;
    this.particleIndices++;

    this.particleData[idx] = {
      x: x + (Math.random() - 0.5) * 0.3,
      y: y + 0.1,
      z: z + (Math.random() - 0.5) * 0.3,
      scale: 0.8 + Math.random() * 0.5,
      life: 1.0,
    };
  }

  public setGameState(state: GameState) {
    this.gameState = state;
    if (state === 'playing') {
      soundManager.startAmbient();
    }
  }

  public setJoystickInput(x: number, y: number) {
    this.joystickInput.x = x;
    this.joystickInput.y = y;
  }

  public triggerJump() {
    if (!this.isJumping && this.gameState === 'playing') {
      this.isJumping = true;
      this.jumpVelocity = 8.8;
      soundManager.playJump();
    }
  }

  public collectShell(shellId: string) {
    this.collectedShells.add(shellId);
    const mesh = this.shellMeshes.get(shellId);
    if (mesh) {
      mesh.visible = false;
    }
  }

  public resetPlayer() {
    this.playerPos.x = 0;
    this.playerPos.z = 8;
    this.playerPos.y = getTerrainHeight(0, 8);
    this.playerVel.x = 0;
    this.playerVel.z = 0;
    this.playerGroup.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.heldKeys.add(e.code);

    if (this.gameState === 'playing') {
      if (e.code === 'Equal' || e.code === 'NumpadAdd') this.zoomBy(1 / 1.2);
      if (e.code === 'Minus' || e.code === 'NumpadSubtract') this.zoomBy(1.2);
    }

    if (e.code === 'Space' && !this.isJumping && this.gameState === 'playing') {
      // If close to NPC, interact handled by overlay, else hop
      this.triggerJump();
    }
  };

  /** Multiplies the camera distance: factor < 1 zooms in, > 1 zooms out. */
  public zoomBy(factor: number) {
    this.targetZoom = THREE.MathUtils.clamp(this.targetZoom * factor, ZOOM_MIN, ZOOM_MAX);
  }

  private onWheel = (e: WheelEvent) => {
    if (this.gameState !== 'playing') return;
    e.preventDefault();
    const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    // Trackpad pinch arrives as ctrl+wheel with small deltas; make it a bit stronger.
    this.zoomBy(Math.exp(dy * (e.ctrlKey ? 0.01 : 0.0015)));
  };

  private onPointerDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.activeTouches.size === 2) {
      this.pinchStartDist = this.touchDistance();
      this.pinchStartZoom = this.targetZoom;
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (!this.activeTouches.has(e.pointerId)) return;
    this.activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.activeTouches.size === 2 && this.pinchStartDist > 0 && this.gameState === 'playing') {
      const d = this.touchDistance();
      if (d > 0) {
        this.targetZoom = THREE.MathUtils.clamp(
          this.pinchStartZoom * (this.pinchStartDist / d),
          ZOOM_MIN,
          ZOOM_MAX
        );
      }
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    this.activeTouches.delete(e.pointerId);
    if (this.activeTouches.size < 2) this.pinchStartDist = 0;
  };

  private touchDistance(): number {
    const [a, b] = [...this.activeTouches.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private onWindowBlur = () => {
    this.heldKeys.clear();
    this.joystickInput.x = 0;
    this.joystickInput.y = 0;
  };

  private onWindowResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private startLoop() {
    const tick = () => {
      if (this.isDestroyed) return;

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);

      this.update(dt);
      this.render();

      if (isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  // Software WebGL pacing helper using WebGL2 fence sync
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDestroyed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 60);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number) {
    const time = this.clock.getElapsedTime();

    // 1. Ambient world animations
    if (this.windmillBladesGroup) {
      this.windmillBladesGroup.rotation.z -= dt * 1.5;
    }
    if (this.lighthouseBeamGroup) {
      this.lighthouseBeamGroup.rotation.y += dt * 0.9;
    }
    if (this.campfireLight) {
      this.campfireLight.intensity = 2.0 + Math.sin(time * 12) * 0.35 + Math.cos(time * 7) * 0.2;
    }

    // Floating animation on shells
    this.shellMeshes.forEach((mesh, shellId) => {
      if (!this.collectedShells.has(shellId)) {
        mesh.rotation.y += dt * 1.8;
        const baseY = getTerrainHeight(mesh.position.x, mesh.position.z) + 0.65;
        mesh.position.y = baseY + Math.sin(time * 3 + mesh.position.x) * 0.12;
        const sparkle = mesh.getObjectByName('sparkle');
        if (sparkle) {
          const tw = Math.max(0, Math.sin(time * 4 + mesh.position.z * 1.7));
          sparkle.scale.set(0.5 * tw, 1.6 * tw, 0.5 * tw);
          sparkle.rotation.z = time * 2;
        }
      }
    });

    // Emote bubbles bobbing gently
    this.npcEmoteMeshes.forEach((mesh) => {
      mesh.position.y = 2.3 + Math.sin(time * 3.5) * 0.1;
      mesh.rotation.y = time * 0.8;
    });

    // 2. Title screen cinematic orbital camera
    if (this.gameState === 'title') {
      this.titleCamAngle += dt * 0.22;
      const camRadius = 34;
      const cx = Math.sin(this.titleCamAngle) * camRadius;
      const cz = Math.cos(this.titleCamAngle) * camRadius;
      const cy = 14 + Math.sin(this.titleCamAngle * 0.5) * 4;

      this.camera.position.set(cx, cy, cz);
      this.camera.lookAt(0, 3, 0);
      return;
    }

    // 3. Player Movement & Physics in Active Game
    let moveX = 0;
    let moveZ = 0;

    if (this.gameState === 'playing') {
      if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) moveZ -= 1;
      if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) moveZ += 1;
      if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) moveX -= 1;
      if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) moveX += 1;

      // Virtual joystick addition
      if (Math.abs(this.joystickInput.x) > 0.1 || Math.abs(this.joystickInput.y) > 0.1) {
        moveX += this.joystickInput.x;
        moveZ += this.joystickInput.y;
      }
    }

    const inputLen = Math.sqrt(moveX * moveX + moveZ * moveZ);
    const speed = 7.2;

    if (inputLen > 0.05) {
      const normX = (moveX / Math.max(1, inputLen));
      const normZ = (moveZ / Math.max(1, inputLen));

      this.playerVel.x = normX * speed;
      this.playerVel.z = normZ * speed;

      // Face direction of movement
      this.playerFacingAngle = Math.atan2(normX, normZ);

      // Running walk cycle
      this.walkTime += dt * 14;
      this.playerLeftLeg.rotation.x = Math.sin(this.walkTime) * 0.7;
      this.playerRightLeg.rotation.x = -Math.sin(this.walkTime) * 0.7;
      this.playerLeftArm.rotation.x = -Math.sin(this.walkTime) * 0.6;
      this.playerRightArm.rotation.x = Math.sin(this.walkTime) * 0.6;
      this.playerBodyMesh.position.y = PLAYER_HIP_Y + Math.abs(Math.sin(this.walkTime)) * 0.06;

      // Footstep sound & dust puff
      this.stepSoundTimer += dt;
      if (this.stepSoundTimer > 0.28 && !this.isJumping) {
        this.stepSoundTimer = 0;
        soundManager.playFootstep();
        this.emitStepParticle(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      }
    } else {
      this.playerVel.x = 0;
      this.playerVel.z = 0;
      this.playerLeftLeg.rotation.x = 0;
      this.playerRightLeg.rotation.x = 0;
      this.playerLeftArm.rotation.x = 0;
      this.playerRightArm.rotation.x = 0;
      this.playerBodyMesh.position.y = PLAYER_HIP_Y;
    }

    // Apply movement with collision: slide around trees, buildings and villagers,
    // stay on the island (or the pier), and hop over low things while airborne.
    const feetAboveGround = this.isJumping
      ? Math.max(0, this.playerPos.y - getSurfaceHeight(this.playerPos.x, this.playerPos.z))
      : 0;
    const moved = stepPlayer(
      this.playerPos.x,
      this.playerPos.z,
      this.playerVel.x * dt,
      this.playerVel.z * dt,
      this.colliders,
      feetAboveGround,
      ISLAND_RADIUS - 1.5
    );
    this.playerPos.x = moved.x;
    this.playerPos.z = moved.z;

    // Ground height snapping + jump physics
    const groundY = getSurfaceHeight(this.playerPos.x, this.playerPos.z);
    if (this.isJumping) {
      this.playerPos.y += this.jumpVelocity * dt;
      this.jumpVelocity -= 26 * dt; // Gravity
      if (this.playerPos.y <= groundY) {
        this.playerPos.y = groundY;
        this.isJumping = false;
        this.jumpVelocity = 0;
      }
    } else {
      this.playerPos.y = THREE.MathUtils.damp(this.playerPos.y, groundY, 16, dt);
    }

    // Update player group position & orientation
    this.playerGroup.position.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    this.playerGroup.rotation.y = THREE.MathUtils.damp(
      this.playerGroup.rotation.y,
      this.playerFacingAngle,
      18,
      dt
    );

    // Keep shadow glued to ground
    this.playerShadowDisc.position.y = - (this.playerPos.y - groundY) + 0.02;

    // Update particles
    if (this.stepParticles) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < this.particleData.length; i++) {
        const p = this.particleData[i];
        if (p.life > 0) {
          p.life -= dt * 2.2;
          p.y += dt * 0.3;
          p.scale = THREE.MathUtils.clamp(p.life * 0.8, 0, 1);
          dummy.position.set(p.x, p.y, p.z);
          dummy.scale.set(p.scale, p.scale, p.scale);
        } else {
          dummy.position.set(0, -10, 0);
          dummy.scale.set(0, 0, 0);
        }
        dummy.updateMatrix();
        this.stepParticles.setMatrixAt(i, dummy.matrix);
      }
      this.stepParticles.instanceMatrix.needsUpdate = true;
    }

    // 4. Camera Follow with Silky Damping
    this.zoom = THREE.MathUtils.damp(this.zoom, this.targetZoom, 10, dt);
    const camOffset = _vec3_scratch1.set(0, 7.5, 11).multiplyScalar(this.zoom);
    _vec3_targetCam.copy(this.playerGroup.position).add(camOffset);
    _vec3_targetLook.copy(this.playerGroup.position).add(_vec3_scratch2.set(0, 1.2, 0));

    // Exponential smoothing (1 - exp(-k * dt))
    const camLerp = 1 - Math.exp(-6 * dt);
    this.camera.position.lerp(_vec3_targetCam, camLerp);
    this.camera.lookAt(_vec3_targetLook);

    // 5. Proximity Checks & Callbacks
    _vec3_player.set(this.playerPos.x, this.playerPos.y, this.playerPos.z);
    this.callbacks.onPlayerMoved({
      x: this.playerPos.x,
      y: this.playerPos.y,
      z: this.playerPos.z,
    });

    let nearestNpcId: string | null = null;
    let minNpcDist = 3.6;
    ISLAND_NPCS.forEach((npc) => {
      const dist = distance2D(this.playerPos.x, this.playerPos.z, npc.position[0], npc.position[2]);
      if (dist < minNpcDist) {
        minNpcDist = dist;
        nearestNpcId = npc.id;
      }
    });
    this.callbacks.onNpcProximity(nearestNpcId);

    // Check shell collection
    ISLAND_SHELLS.forEach((shell) => {
      if (!this.collectedShells.has(shell.id)) {
        const dist = distance2D(this.playerPos.x, this.playerPos.z, shell.position[0], shell.position[2]);
        if (dist < 1.7) {
          this.collectShell(shell.id);
          soundManager.playShellPickup();
          this.callbacks.onShellCollected(shell.id);
        }
      }
    });
  }

  private render() {
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    this.isDestroyed = true;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('wheel', this.onWheel);
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerUp);

    soundManager.stopAmbient();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
