import { describe, it, expect } from 'vitest';
import { generateBoard, findDesertHex, numberPips } from '../board-generator.js';
import { Terrain } from '../../types/resource.js';

describe('generateBoard', () => {
  const { board, graph } = generateBoard(42);

  it('generates 19 hex tiles', () => {
    expect(board.hexes).toHaveLength(19);
  });

  it('has exactly 1 desert tile', () => {
    const deserts = board.hexes.filter((h) => h.terrain === Terrain.Desert);
    expect(deserts).toHaveLength(1);
  });

  it('desert has no number token', () => {
    const desert = board.hexes.find((h) => h.terrain === Terrain.Desert)!;
    expect(desert.numberToken).toBeNull();
  });

  it('robber starts on desert', () => {
    const desert = board.hexes.find((h) => h.terrain === Terrain.Desert)!;
    expect(desert.hasRobber).toBe(true);
    const others = board.hexes.filter((h) => h.terrain !== Terrain.Desert);
    for (const hex of others) {
      expect(hex.hasRobber).toBe(false);
    }
  });

  it('has 18 number tokens (all non-desert)', () => {
    const withNumbers = board.hexes.filter((h) => h.numberToken !== null);
    expect(withNumbers).toHaveLength(18);
  });

  it('number tokens are in range 2-12 (no 7)', () => {
    for (const hex of board.hexes) {
      if (hex.numberToken !== null) {
        expect(hex.numberToken).toBeGreaterThanOrEqual(2);
        expect(hex.numberToken).toBeLessThanOrEqual(12);
        expect(hex.numberToken).not.toBe(7);
      }
    }
  });

  it('has correct terrain distribution', () => {
    const counts: Record<string, number> = {};
    for (const hex of board.hexes) {
      counts[hex.terrain] = (counts[hex.terrain] || 0) + 1;
    }
    expect(counts[Terrain.Hills]).toBe(3);
    expect(counts[Terrain.Forest]).toBe(4);
    expect(counts[Terrain.Mountains]).toBe(3);
    expect(counts[Terrain.Fields]).toBe(4);
    expect(counts[Terrain.Pasture]).toBe(4);
    expect(counts[Terrain.Desert]).toBe(1);
  });

  it('generates 9 harbors', () => {
    expect(board.harbors).toHaveLength(9);
  });

  it('harbors have correct type distribution', () => {
    const generic = board.harbors.filter((h) => h.type === 'generic');
    expect(generic).toHaveLength(4);
    const specific = board.harbors.filter((h) => h.type !== 'generic');
    expect(specific).toHaveLength(5);
  });

  it('same seed produces same board', () => {
    const { board: board2 } = generateBoard(42);
    expect(board2.hexes.map((h) => h.terrain)).toEqual(board.hexes.map((h) => h.terrain));
    expect(board2.hexes.map((h) => h.numberToken)).toEqual(board.hexes.map((h) => h.numberToken));
  });

  it('different seeds produce different boards', () => {
    const { board: board2 } = generateBoard(123);
    const terrains1 = board.hexes.map((h) => h.terrain).join(',');
    const terrains2 = board2.hexes.map((h) => h.terrain).join(',');
    expect(terrains1).not.toBe(terrains2);
  });
});

describe('numberPips', () => {
  it('returns correct pip counts', () => {
    expect(numberPips(2)).toBe(1);
    expect(numberPips(3)).toBe(2);
    expect(numberPips(6)).toBe(5);
    expect(numberPips(7)).toBe(6);
    expect(numberPips(8)).toBe(5);
    expect(numberPips(12)).toBe(1);
  });
});

describe('findDesertHex', () => {
  it('returns the desert hex coordinate', () => {
    const { board } = generateBoard(42);
    const desert = findDesertHex(board.hexes);
    const desertTile = board.hexes.find(
      (h) => h.coord.q === desert.q && h.coord.r === desert.r && h.coord.s === desert.s
    )!;
    expect(desertTile.terrain).toBe(Terrain.Desert);
  });
});
