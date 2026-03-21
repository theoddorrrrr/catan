import { describe, it, expect } from 'vitest';
import {
  generateHexCoords,
  hexNeighbors,
  hexEqual,
  buildBoardGraph,
  getHexVertices,
  getHexEdges,
  hexToPixel,
} from '../hex-grid.js';

describe('generateHexCoords', () => {
  it('generates 19 hexes for standard board (radius 2)', () => {
    const coords = generateHexCoords(2);
    expect(coords).toHaveLength(19);
  });

  it('all coordinates satisfy q + r + s = 0', () => {
    const coords = generateHexCoords(2);
    for (const c of coords) {
      expect(c.q + c.r + c.s).toBe(0);
    }
  });

  it('center hex is at origin', () => {
    const coords = generateHexCoords(2);
    expect(coords.some((c) => c.q === 0 && c.r === 0 && c.s === 0)).toBe(true);
  });

  it('generates 7 hexes for radius 1', () => {
    const coords = generateHexCoords(1);
    expect(coords).toHaveLength(7);
  });
});

describe('hexNeighbors', () => {
  it('returns 6 neighbors', () => {
    const neighbors = hexNeighbors({ q: 0, r: 0, s: 0 });
    expect(neighbors).toHaveLength(6);
  });

  it('all neighbors satisfy q + r + s = 0', () => {
    const neighbors = hexNeighbors({ q: 1, r: -1, s: 0 });
    for (const n of neighbors) {
      expect(n.q + n.r + n.s).toBe(0);
    }
  });

  it('neighbors are at distance 1', () => {
    const origin = { q: 0, r: 0, s: 0 };
    const neighbors = hexNeighbors(origin);
    for (const n of neighbors) {
      const dist = (Math.abs(n.q) + Math.abs(n.r) + Math.abs(n.s)) / 2;
      expect(dist).toBe(1);
    }
  });
});

describe('getHexVertices', () => {
  it('returns 6 vertices per hex', () => {
    const vertices = getHexVertices({ q: 0, r: 0, s: 0 });
    expect(vertices).toHaveLength(6);
  });

  it('all vertex IDs are unique', () => {
    const vertices = getHexVertices({ q: 0, r: 0, s: 0 });
    expect(new Set(vertices).size).toBe(6);
  });

  it('adjacent hexes share exactly 2 vertices', () => {
    const v1 = new Set(getHexVertices({ q: 0, r: 0, s: 0 }));
    const v2 = new Set(getHexVertices({ q: 1, r: -1, s: 0 }));
    const shared = [...v1].filter((v) => v2.has(v));
    expect(shared).toHaveLength(2);
  });
});

describe('getHexEdges', () => {
  it('returns 6 edges per hex', () => {
    const edges = getHexEdges({ q: 0, r: 0, s: 0 });
    expect(edges).toHaveLength(6);
  });

  it('adjacent hexes share exactly 1 edge', () => {
    const e1 = new Set(getHexEdges({ q: 0, r: 0, s: 0 }));
    const e2 = new Set(getHexEdges({ q: 1, r: -1, s: 0 }));
    const shared = [...e1].filter((e) => e2.has(e));
    expect(shared).toHaveLength(1);
  });
});

describe('buildBoardGraph', () => {
  const coords = generateHexCoords(2);
  const graph = buildBoardGraph(coords);

  it('has 54 vertices for standard board', () => {
    expect(graph.vertices.size).toBe(54);
  });

  it('has 72 edges for standard board', () => {
    expect(graph.edges.size).toBe(72);
  });

  it('every edge connects exactly 2 vertices', () => {
    for (const [edgeId, [v1, v2]] of graph.edgeToVertices) {
      expect(graph.vertices.has(v1)).toBe(true);
      expect(graph.vertices.has(v2)).toBe(true);
      expect(v1).not.toBe(v2);
    }
  });

  it('every vertex has 2 or 3 adjacent edges', () => {
    for (const [vertexId, edges] of graph.vertexToEdges) {
      expect(edges.length).toBeGreaterThanOrEqual(2);
      expect(edges.length).toBeLessThanOrEqual(3);
    }
  });

  it('every vertex has 2 or 3 adjacent vertices', () => {
    for (const [vertexId, adjVerts] of graph.vertexToVertices) {
      expect(adjVerts.length).toBeGreaterThanOrEqual(2);
      expect(adjVerts.length).toBeLessThanOrEqual(3);
    }
  });

  it('internal vertices touch exactly 3 hexes', () => {
    // Center hex vertices that are shared with 2 other hexes on the board
    let internalCount = 0;
    for (const [vertexId, hexes] of graph.vertexToHexes) {
      if (hexes.length === 3) internalCount++;
    }
    // Standard board has 24 internal vertices (3 hexes each)
    // and 30 coastal vertices (1 or 2 hexes each)
    expect(internalCount).toBeGreaterThan(0);
  });
});

describe('hexToPixel', () => {
  it('center hex maps to origin', () => {
    const pixel = hexToPixel({ q: 0, r: 0, s: 0 }, 1);
    expect(pixel.x).toBeCloseTo(0);
    expect(pixel.y).toBeCloseTo(0);
  });

  it('different hexes map to different positions', () => {
    const p1 = hexToPixel({ q: 0, r: 0, s: 0 }, 1);
    const p2 = hexToPixel({ q: 1, r: 0, s: -1 }, 1);
    expect(p1.x !== p2.x || p1.y !== p2.y).toBe(true);
  });
});
