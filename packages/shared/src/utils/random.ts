// Seeded PRNG using xoshiro128** algorithm
// Allows deterministic game replay when given the same seed

export class SeededRandom {
  private s: Uint32Array;

  constructor(seed: number) {
    // Initialize state from seed using splitmix32
    this.s = new Uint32Array(4);
    let s = seed >>> 0;
    for (let i = 0; i < 4; i++) {
      s += 0x9e3779b9;
      let t = s;
      t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
      this.s[i] = (t ^ (t >>> 15)) >>> 0;
    }
  }

  // Returns a number in [0, 1)
  next(): number {
    const s = this.s;
    const result = Math.imul(s[1] * 5, 7) >>> 0;
    const t = s[1] << 9;

    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = (s[3] << 11) | (s[3] >>> 21);

    return (result >>> 0) / 0x100000000;
  }

  // Returns an integer in [min, max] inclusive
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  // Fisher-Yates shuffle
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
