import { describe, it, expect, beforeEach } from 'vitest';
import { DiscoverySystem } from '../src/map/DiscoverySystem.js';
import { WorldMap } from '../src/map/WorldMap.js';
import { TerrainGenerator } from '../src/world/TerrainGenerator.js';
import { WorldConfig } from '../src/world/WorldConfig.js';

describe('Phase 4 - World Map & Discovery System', () => {
  describe('DiscoverySystem', () => {
    let discovery;

    beforeEach(() => {
      discovery = new DiscoverySystem(8.0, 48.0);
    });

    it('starts with zero discovered cells', () => {
      expect(discovery.getDiscoveredCount()).toBe(0);
      expect(discovery.isWorldDiscovered(0, 0)).toBe(false);
    });

    it('discovers cells within discovery radius when player updates position', () => {
      const result = discovery.update(0, 0);

      expect(result.hasNewDiscoveries).toBe(true);
      expect(discovery.getDiscoveredCount()).toBeGreaterThan(15);
      expect(discovery.isWorldDiscovered(0, 0)).toBe(true);
      expect(discovery.isWorldDiscovered(20, 20)).toBe(true);

      // Distant cells should remain obscured by fog of war
      expect(discovery.isWorldDiscovered(200, 200)).toBe(false);
    });

    it('preserves previously discovered territory as player travels', () => {
      // Discover origin
      discovery.update(0, 0);
      expect(discovery.isWorldDiscovered(0, 0)).toBe(true);

      // Travel far away (300, 300)
      discovery.update(300, 300);

      // Both the starting area and new area remain discovered
      expect(discovery.isWorldDiscovered(0, 0)).toBe(true);
      expect(discovery.isWorldDiscovered(300, 300)).toBe(true);
      // Untraveled midpoint remains unexplored
      expect(discovery.isWorldDiscovered(150, 150)).toBe(false);
    });

    it('discovers registered landmarks when player approaches within discovery radius', () => {
      discovery.registerLandmark({
        id: 'ancient_tower',
        type: 'watchtower',
        name: 'Highland Watchtower',
        x: 60,
        z: 60,
      });

      // Initially undiscovered
      expect(discovery.getDiscoveredLandmarks().length).toBe(0);

      // Player at origin (distance to tower is ~84.8m, > discoveryRadius)
      discovery.update(0, 0);
      expect(discovery.getDiscoveredLandmarks().length).toBe(0);

      // Player moves near tower (45, 45) -> distance is ~21m < discoveryRadius
      const res = discovery.update(45, 45);
      expect(res.newLandmarks.length).toBe(1);
      expect(discovery.getDiscoveredLandmarks().length).toBe(1);
      expect(discovery.getDiscoveredLandmarks()[0].id).toBe('ancient_tower');
    });
  });

  describe('WorldMap', () => {
    let mockCanvas;
    let terrainGenerator;
    let worldMap;

    beforeEach(() => {
      // Mock 2D canvas for Node environment
      mockCanvas = {
        width: 800,
        height: 600,
        getContext: () => ({
          clearRect: () => {},
          fillRect: () => {},
          drawImage: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          fill: () => {},
          arc: () => {},
          save: () => {},
          restore: () => {},
          translate: () => {},
          rotate: () => {},
          fillText: () => {},
          createRadialGradient: () => ({
            addColorStop: () => {},
          }),
        }),
        addEventListener: () => {},
      };

      terrainGenerator = new TerrainGenerator(WorldConfig.seed);
      worldMap = new WorldMap(mockCanvas, terrainGenerator);
    });

    it('clamps zoom scale within minScale and maxScale', () => {
      // Extreme zoom out
      for (let i = 0; i < 20; i++) {
        worldMap.zoom(0.5);
      }
      expect(worldMap.scale).toBeGreaterThanOrEqual(worldMap.minScale);

      // Extreme zoom in
      for (let i = 0; i < 20; i++) {
        worldMap.zoom(2.0);
      }
      expect(worldMap.scale).toBeLessThanOrEqual(worldMap.maxScale);
    });

    it('recenters map view coordinates to player location', () => {
      worldMap.recenter({ x: 128.5, z: -64.2 });
      expect(worldMap.viewCenterX).toBeCloseTo(128.5, 1);
      expect(worldMap.viewCenterZ).toBeCloseTo(-64.2, 1);
    });

    it('registers starter outpost landmark initially', () => {
      const registered = worldMap.discoverySystem.registeredLandmarks;
      expect(registered.has('spawn_outpost')).toBe(true);
      expect(registered.has('starter_bridge')).toBe(true);
    });
  });
});
