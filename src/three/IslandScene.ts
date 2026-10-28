import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ISLAND_NPCS, ISLAND_SHELLS } from '../data/portfolioData';
import { clampToIsland, distance2D, getTerrainHeight, ISLAND_RADIUS } from '../game/logic';
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
  private playerBodyMesh!: THREE.Mesh;
  private playerHeadMesh!: THREE.Mesh;
  private playerLeftLeg!: THREE.Mesh;
  private playerRightLeg!: THREE.Mesh;
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
  private heldKeys: Set<string> = new Set();
  private playerPos = { x: 0, y: 0.5, z: 8 };
  private playerVel = { x: 0, y: 0, z: 0 };
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

      let h = getTerrainHeight(x, z);
      if (dist > 33) {
        h = -0.7; // underwater drop-off
      }
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
    this.oceanMesh.position.y = 0.05;
    this.scene.add(this.oceanMesh);

    // Shoreline foam ring
    const foamGeo = new THREE.RingGeometry(24.5, 27.5, 48);
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
    const treeMatTrunk = new THREE.MeshStandardMaterial({ color: 0x543621, roughness: 0.9 });
    const treeMatPine1 = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 });
    const treeMatPine2 = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.75 });

    // Plant 24 trees around the island at scenic positions
    const treeSpots: [number, number][] = [
      [8, 4], [10, 8], [6, 14], [-6, 12], [-10, 16],
      [-8, -6], [-12, -4], [-18, -6], [-4, -12], [4, -14],
      [12, -8], [15, -14], [20, -2], [22, 4], [-8, 22],
      [-4, 20], [14, 18], [24, 10], [-20, 6], [-16, 8],
      [2, -10], [6, -18], [-6, -18], [10, -20]
    ];

    treeSpots.forEach(([tx, tz], idx) => {
      const ty = getTerrainHeight(tx, tz);
      if (ty < 0.25) return;

      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);

      // Randomize scale ±15%
      const scale = 0.85 + ((idx * 7) % 30) / 100;
      tree.scale.set(scale, scale, scale);

      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.24, 0.35, 1.8, 6);
      const trunk = new THREE.Mesh(trunkGeo, treeMatTrunk);
      trunk.position.y = 0.9;
      trunk.castShadow = !isSoftwareGl;
      tree.add(trunk);

      // 3 Stacked Foliage Cones
      const pineMat = idx % 2 === 0 ? treeMatPine1 : treeMatPine2;
      for (let c = 0; c < 3; c++) {
        const coneRadius = 1.9 - c * 0.45;
        const coneHeight = 1.6;
        const coneGeo = new THREE.ConeGeometry(coneRadius, coneHeight, 7);
        const cone = new THREE.Mesh(coneGeo, pineMat);
        cone.position.y = 1.8 + c * 1.0;
        cone.castShadow = !isSoftwareGl;
        tree.add(cone);
      }

      this.scene.add(tree);
    });

    // Flowering bushes and rock boulders
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.8 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });
    for (let i = 0; i < 18; i++) {
      const angle = (i * Math.PI) / 9;
      const r = 9 + ((i * 11) % 12);
      const bx = Math.cos(angle) * r;
      const bz = Math.sin(angle) * r;
      const by = getTerrainHeight(bx, bz);
      if (by < 0.2) continue;

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
    }
  }

  private buildNpcs() {
    ISLAND_NPCS.forEach((npc) => {
      const group = new THREE.Group();
      const x = npc.position[0];
      const z = npc.position[2];
      const y = getTerrainHeight(x, z);
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

  private buildShells() {
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, // Bright amber gold
      roughness: 0.25,
      metalness: 0.75,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
    });

    ISLAND_SHELLS.forEach((shell) => {
      const group = new THREE.Group();
      const x = shell.position[0];
      const z = shell.position[2];
      const y = getTerrainHeight(x, z) + 0.35;
      group.position.set(x, y, z);

      // Contact glow ring
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
      ring.position.y = -0.3;
      group.add(ring);

      // Nautilus spiral / ribbed shell geometry (procedural toruses)
      for (let s = 0; s < 3; s++) {
        const torRadius = 0.25 - s * 0.06;
        const tubeRadius = 0.09 - s * 0.02;
        const torusGeo = new THREE.TorusGeometry(torRadius, tubeRadius, 6, 12);
        torusGeo.rotateY(Math.PI / 2);
        const segment = new THREE.Mesh(torusGeo, shellMat);
        segment.position.set(s * 0.08, s * 0.04, 0);
        group.add(segment);
      }

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

    // 2. Torso (Cozy warm yellow adventurer hoodie)
    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.9, 8);
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Warm honey amber
      roughness: 0.7,
    });
    this.playerBodyMesh = new THREE.Mesh(bodyGeo, hoodieMat);
    this.playerBodyMesh.position.y = 0.65;
    this.playerBodyMesh.castShadow = !isSoftwareGl;
    this.playerGroup.add(this.playerBodyMesh);

    // 3. Cute explorer backpack
    const packGeo = new THREE.BoxGeometry(0.48, 0.55, 0.32);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const backpack = new THREE.Mesh(packGeo, packMat);
    backpack.position.set(0, 0.65, -0.32);
    this.playerGroup.add(backpack);

    // 4. Head
    const headGeo = new THREE.SphereGeometry(0.38, 8, 8);
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.6 });
    this.playerHeadMesh = new THREE.Mesh(headGeo, skinMat);
    this.playerHeadMesh.position.y = 1.38;
    this.playerHeadMesh.castShadow = !isSoftwareGl;
    this.playerGroup.add(this.playerHeadMesh);

    // 5. Beanie hat with pompom
    const hatGeo = new THREE.SphereGeometry(0.4, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.8 });
    const hat = new THREE.Mesh(hatGeo, hatMat);
    hat.position.y = 1.48;
    this.playerGroup.add(hat);

    const pompomGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const pompomMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const pompom = new THREE.Mesh(pompomGeo, pompomMat);
    pompom.position.set(0, 1.9, 0);
    this.playerGroup.add(pompom);

    // 6. Eyes
    const eyeGeo = new THREE.SphereGeometry(0.05, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.12, 1.42, 0.34);
    this.playerGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.12, 1.42, 0.34);
    this.playerGroup.add(rightEye);

    // 7. Legs / Shoes
    const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.45, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    this.playerLeftLeg = new THREE.Mesh(legGeo, legMat);
    this.playerLeftLeg.position.set(0.16, 0.22, 0);
    this.playerGroup.add(this.playerLeftLeg);

    this.playerRightLeg = new THREE.Mesh(legGeo, legMat);
    this.playerRightLeg.position.set(-0.16, 0.22, 0);
    this.playerGroup.add(this.playerRightLeg);

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

    if (e.code === 'Space' && !this.isJumping && this.gameState === 'playing') {
      // If close to NPC, interact handled by overlay, else hop
      this.triggerJump();
    }
  };

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
        const baseY = getTerrainHeight(mesh.position.x, mesh.position.z) + 0.35;
        mesh.position.y = baseY + Math.sin(time * 3 + mesh.position.x) * 0.12;
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
      this.playerBodyMesh.position.y = 0.65 + Math.abs(Math.sin(this.walkTime)) * 0.06;

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
      this.playerBodyMesh.position.y = 0.65;
    }

    // Apply movement
    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.z += this.playerVel.z * dt;

    // Island boundary clamping
    const clamped = clampToIsland(this.playerPos.x, this.playerPos.z, ISLAND_RADIUS - 1.5);
    this.playerPos.x = clamped.x;
    this.playerPos.z = clamped.z;

    // Ground height snapping + jump physics
    const groundY = getTerrainHeight(this.playerPos.x, this.playerPos.z);
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
    const camOffset = _vec3_scratch1.set(0, 7.5, 11);
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

    soundManager.stopAmbient();
    this.renderer.dispose();
    if (this.container && this.renderer.domElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
