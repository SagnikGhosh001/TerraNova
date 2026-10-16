# Terra Nova — Open World Explorer

A browser-based, third-person 3D open-world exploration game built with **Three.js** and **Vite**.

## Completed Phases

### Phase 1: Playable Prototype
- Responsive third-person character controller (walking, sprinting, jumping with coyote time & buffer).
- Third-person orbit follow camera with collision raycasting and zoom.
- Capsule/Box3 obstacle collision and wall-sliding.
- Stylized 3D explorer character model with procedural locomotion animations.
- Real-time telemetry HUD overlay (coordinates, speed, heading, state, FPS).

### Phase 2: Procedural Terrain & Chunk Streaming
- Seeded procedural heightmap with continental landmasses, mountain ridges, and rolling hills.
- Mathematically seamless chunk boundaries with continuous noise and analytical normal vectors.
- Dynamic radial chunk streaming (`renderDistance = 3`) and memory disposal (`unloadDistance = 4`).
- Biome classification (Plains, Forest, Mountains, Beach) and slope/elevation vertex coloring.
- Infinite ground collision queries avoiding fall-through even on fast traversal.

### Phase 3: Environment Generation
- **Instanced Vegetation System (`VegetationGenerator.js`)**:
  - GPU-accelerated `THREE.InstancedMesh` rendering for trees, rocks, and grass tufts.
  - Multi-tier dark pine trees, broadleaf oak trees, low-poly mossy boulders, and cross-quad grass clumps.
  - Biome-governed densities (lush forests, open plains, rocky mountain peaks).
  - Slope and water height filters preventing trees from growing underwater or on sheer cliffs.
  - Tree trunk and boulder obstacle colliders registered in `CollisionSystem`.
- **Water System (`WaterGenerator.js`)**:
  - Animated custom shader material with gentle surface ripples and turquoise-to-azure depth gradient.
  - Carved river channels and lake basins generated directly in `TerrainGenerator`.
  - Water planes instantiated per chunk where terrain dips below `waterLevel = 3.8`.
- **Modular Architectural Structures (`StructureModels.js`)**:
  - Deep stone foundations preventing buildings from floating or clipping into hills.
  - Cozy timber cabins with pitched gabled roofs, stone chimneys, and front porches.
  - Ancient stone watchtowers (12m) with lookout platforms and battlements.
  - Megalithic stone circles with central runic altars.
  - Wooden trestle bridges with plank decks and beam railings.
  - Village town wells with wooden canopies.
- **Procedural Settlement & Landmark Placement (`BuildingGenerator.js`)**:
  - **The Starter Outpost** at chunk (0, 0): Cozy explorer cabin, campfire with benches, and a wooden river bridge.
  - Deterministic landmark distribution (village settlements, solitary cabins, mountain watchtowers).
  - Solid obstacle and walkable surface registration with the collision subsystem.

### Phase 5: Exploration Polish
- **Atmospheric Sky & Drifting Clouds (`Sky.js`)**:
  - Glowing sun disk mesh accurately aligned with directional sunlight vector.
  - 22 procedural low-poly cloud clusters drifting continuously across the sky and wrapping relative to the player.
  - Smooth atmospheric horizon haze blending seamlessly with terrain fog.
- **Enhanced Water Shader Shimmer (`WaterGenerator.js`)**:
  - Dual-harmonic vertex wave displacement for fluid river and lake motion.
  - Multi-frequency wave shimmer and directional specular sunlight glints.
- **Character Kinematics & Locomotion Polish (`Player.js`, `PlayerController.js`, `CameraController.js`)**:
  - Landing squash and rebound animation when touching down from jumps or falls.
  - Dynamic sprint FOV kick (smoothly transitioning from 60° to 67° at top speed).
  - Water wading dynamics: submerged speed reduction, wading state indicator, and buoyant surface support.
- **Starter Outpost & Settlement Detailing (`BuildingGenerator.js` & `StructureModels.js`)**:
  - Added timber lantern posts with glowing warm illumination at cabin and bridge heads.
  - Added river dock with mooring bollards extending into the eastern river valley.
  - Ancient watchtowers equipped with beacon braziers; shrines equipped with glowing runic crystals.
- **Landmark Discovery Banners (`HUD.js` & `MapInterface.js`)**:
  - Floating discovery toast notifications popping down when discovering new POIs.

### Phase 6: Performance, Stability & Determinism
- **GPU Instancing & Draw Call Optimization (`VegetationGenerator.js`)**:
  - All vegetation (trees, rocks, grass tufts) utilizes `THREE.InstancedMesh` to render hundreds of environmental objects in single draw calls.
- **Chunk Streaming Budgeting (`ChunkManager.js`)**:
  - Queue-based progressive chunk generation limited to `maxChunksPerFrame: 1`, guaranteeing smooth 60 FPS exploration without stutter.
- **Zero-Leak Memory Disposal (`ChunkManager.js`)**:
  - Automated distant chunk pruning (`unloadDistance = 4`) freeing geometry buffers, instanced buffers, and removing colliders from `CollisionSystem`.
- **Multi-Seed Determinism**:
  - Pure deterministic noise mathematics guarantees identical landscapes, biomes, and structure placements across game sessions with the same seed.
- **Automated Test Suite**:
  - 56 passing unit tests across 8 test suites covering cameras, collisions, player locomotion, terrain generation, environment instancing, map fog of war, exploration polish, and performance budgeting.

---

## Controls

| Input | Action | Description |
|---|---|---|
| **W / A / S / D** | **Move** | Move forward, left, backward, and right relative to camera facing |
| **Shift** | **Sprint** | Increase movement speed from 5.0 m/s to 10.5 m/s |
| **Space** | **Jump** | Jump with natural gravity, coyote time, and jump buffering |
| **Mouse Movement** | **Rotate Camera** | Orbit camera yaw and pitch (requires pointer lock) |
| **Mouse Wheel** | **Zoom Camera** | Smoothly zoom camera distance closer or further |
| **M** | **World Map** | Toggle full interactive expedition map with fog of war |
| **Esc** | **Release Cursor / Close Map** | Close map or release browser pointer lock and pause |
| **Click Anywhere / Enter World** | **Resume** | Re-engage pointer lock and resume gameplay |

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Unit Tests
```bash
npm test
```

### 4. Build Production Bundle
```bash
npm run build
```

---

## Architecture

```
src/
├── main.js                     # Application entry point
├── game/
│   ├── Game.js                 # Central game coordinator & input binding
│   ├── GameLoop.js             # Fixed/clamped delta-time game loop with FPS tracking
│   └── SceneManager.js         # WebGLRenderer, Three.js Scene, PerspectiveCamera, resize
├── player/
│   ├── Player.js               # Stylized 3D explorer model & procedural animations
│   ├── PlayerController.js     # Locomotion physics, ground snapping, slopes, jumping
│   ├── CameraController.js     # Third-person follow camera, zoom, & collision raycasting
│   └── CollisionSystem.js      # Downward ground detection, slope checks, & Box3 collisions
├── environment/
│   ├── Materials.js            # Stylized materials palette
│   ├── Sky.js                  # Gradient dome shader & horizon fog
│   └── Lighting.js             # Directional sun with PCF soft shadows & hemisphere bounce
├── world/
│   ├── WorldConfig.js          # Central configuration for seed, chunk size, LOD, and streaming
│   ├── WorldManager.js         # Unified facade coordinating terrain and chunks
│   ├── TerrainGenerator.js     # Continuous procedural heightmaps & river/lake carving
│   ├── ChunkManager.js         # Chunk grid streaming, progressive queue, and GPU disposal
│   ├── BiomeSystem.js          # Climate noise and slope/elevation vertex color blending
│   ├── WaterGenerator.js       # Animated water shaders for rivers and lakes
│   ├── VegetationGenerator.js  # Instanced trees, boulders, and grass clumps
│   ├── StructureModels.js      # Procedural models for cabins, towers, bridges, and shrines
│   └── BuildingGenerator.js    # Landmark and settlement placement logic
├── map/
│   ├── WorldMap.js             # High-level map controller, pan/zoom state, and landmark registry
│   ├── MapRenderer.js          # 2D Canvas cartographic renderer for terrain, water, and icons
│   ├── FogOfWar.js             # Alpha punch-out fog masking with soft radial feathering
│   └── DiscoverySystem.js      # Cell-based exploration tracking and landmark discovery
├── utils/
│   ├── Random.js               # Deterministic Mulberry32 PRNG
│   ├── Noise.js                # 2D Simplex Noise, fBm, and ridged multifractals
│   └── Coordinates.js          # Chunk-to-world coordinate conversion and spiral math
├── ui/
│   ├── HUD.js                  # Telemetry indicators (coords, speed, status, heading, biome, chunk, FPS)
│   ├── MapInterface.js         # Modal overlay, pan/zoom toolbar buttons, and M/Esc toggles
│   └── ControlsHelp.js         # Collapsible controls guide
└── styles/
    └── main.css                # Glassmorphism styling, modal overlays, responsive HUD & map
```
