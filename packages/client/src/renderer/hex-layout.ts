import { HexCoord, VertexId } from '@catan/shared';

export interface PixelCoord {
  x: number;
  y: number;
}

// Pointy-top hex layout
const SQRT3 = Math.sqrt(3);

export function hexToPixel(coord: HexCoord, size: number): PixelCoord {
  const x = size * (SQRT3 * coord.q + (SQRT3 / 2) * coord.r);
  const y = size * ((3 / 2) * coord.r);
  return { x, y };
}

// Get the 6 corner positions of a hex (pointy-top)
export function hexCorners(center: PixelCoord, size: number): PixelCoord[] {
  const corners: PixelCoord[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30); // pointy-top starts at -30°
    corners.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    });
  }
  return corners;
}

export function hexCornersToPoints(corners: PixelCoord[]): string {
  return corners.map((c) => `${c.x},${c.y}`).join(' ');
}

// Compute vertex pixel position from vertex ID
export function vertexToPixel(vertexId: VertexId, size: number): PixelCoord {
  // Vertex ID format: "v_q1,r1,s1_q2,r2,s2_q3,r3,s3" (3 hex coords sorted)
  const parts = vertexId.slice(2).split('_');
  const coords: PixelCoord[] = parts.map((p) => {
    const [q, r] = p.split(',').map(Number);
    return hexToPixel({ q, r, s: -q - r }, size);
  });
  // Vertex is at the centroid of its 3 adjacent hex centers
  const cx = coords.reduce((s, c) => s + c.x, 0) / coords.length;
  const cy = coords.reduce((s, c) => s + c.y, 0) / coords.length;
  return { x: cx, y: cy };
}

// Parse edge ID to get both vertex positions
// Edge format: "e_v_a,b,c_d,e,f_g,h,i_v_j,k,l_m,n,o_p,q,r"
// Split on "_v_" to get the two vertex coordinate groups
export function edgeToPixels(edgeId: string, size: number): [PixelCoord, PixelCoord] {
  // Remove "e_" prefix, then split on "_v_" to find vertex boundaries
  // The edge is: "e_" + v1 + "_" + v2
  // Both v1 and v2 start with "v_"
  // So the full pattern is: "e_v_..._v_..."
  // Find the second "v_" occurrence
  const content = edgeId.slice(2); // Remove "e_"
  // content = "v_a_b_c_v_d_e_f" where each vertex is "v_x_y_z"
  // Each vertex has exactly 3 coord groups (q,r,s) separated by _
  // So vertex = "v_" + coord1 + "_" + coord2 + "_" + coord3
  // Find where second vertex starts: look for "_v_" after the first "v_"
  const idx = content.indexOf('_v_', 2);
  const v1 = content.slice(0, idx);
  const v2 = content.slice(idx + 1);
  return [vertexToPixel(v1, size), vertexToPixel(v2, size)];
}
