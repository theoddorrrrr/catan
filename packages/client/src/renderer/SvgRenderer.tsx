import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  GameState,
  HexTile,
  HexCoord,
  VertexId,
  EdgeId,
  hexKey,
  PlayerColor,
  Terrain,
  numberPips,
} from '@catan/shared';
import { BoardGraph } from '@catan/shared';
import { hexToPixel, hexCorners, hexCornersToPoints, vertexToPixel, edgeToPixels } from './hex-layout';
import { TERRAIN_COLORS, PLAYER_COLORS, PLAYER_COLORS_DARK, NUMBER_COLORS } from './colors';

interface SvgRendererProps {
  state: GameState;
  graph: BoardGraph;
  hexSize?: number;
}

export function SvgRenderer({ state, graph, hexSize = 50 }: SvgRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 600, h: 600 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate board bounds
  useEffect(() => {
    const padding = hexSize * 2;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const hex of state.board.hexes) {
      const center = hexToPixel(hex.coord, hexSize);
      const corners = hexCorners(center, hexSize);
      for (const c of corners) {
        minX = Math.min(minX, c.x);
        minY = Math.min(minY, c.y);
        maxX = Math.max(maxX, c.x);
        maxY = Math.max(maxY, c.y);
      }
    }
    setViewBox({
      x: minX - padding,
      y: minY - padding,
      w: maxX - minX + padding * 2,
      h: maxY - minY + padding * 2,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexSize]); // Board hexes don't change after creation

  // Pan via mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !svgRef.current) return;
      const svg = svgRef.current;
      const dx = (e.clientX - dragStart.x) * (viewBox.w / svg.clientWidth);
      const dy = (e.clientY - dragStart.y) * (viewBox.h / svg.clientHeight);
      setViewBox((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [dragging, dragStart, viewBox.w, viewBox.h]
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Zoom via wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const newW = viewBox.w * factor;
      const newH = viewBox.h * factor;
      const dx = (viewBox.w - newW) / 2;
      const dy = (viewBox.h - newH) / 2;
      setViewBox({ x: viewBox.x + dx, y: viewBox.y + dy, w: newW, h: newH });
    },
    [viewBox]
  );

  // Build player building lookups
  const settlementMap = new Map<VertexId, PlayerColor>();
  const cityMap = new Map<VertexId, PlayerColor>();
  const roadMap = new Map<EdgeId, PlayerColor>();

  for (const player of state.players) {
    for (const v of player.settlements) settlementMap.set(v, player.color);
    for (const v of player.cities) cityMap.set(v, player.color);
    for (const e of player.roads) roadMap.set(e, player.color);
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      style={{ width: '100%', height: '100%', touchAction: 'none', cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Background */}
      <rect
        x={viewBox.x}
        y={viewBox.y}
        width={viewBox.w}
        height={viewBox.h}
        fill="#1a6fc4"
      />

      {/* Hex tiles */}
      {state.board.hexes.map((hex) => {
        const center = hexToPixel(hex.coord, hexSize);
        const corners = hexCorners(center, hexSize);
        const points = hexCornersToPoints(corners);
        const key = hexKey(hex.coord);

        return (
          <g key={key}>
            <polygon
              points={points}
              fill={TERRAIN_COLORS[hex.terrain]}
              stroke="#5c4033"
              strokeWidth={2}
            />
            {/* Number token */}
            {hex.numberToken && (
              <>
                <circle cx={center.x} cy={center.y} r={hexSize * 0.28} fill="#f5f0dc" stroke="#333" strokeWidth={1} />
                <text
                  x={center.x}
                  y={center.y + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={hexSize * 0.28}
                  fontWeight={hex.numberToken === 6 || hex.numberToken === 8 ? 'bold' : 'normal'}
                  fill={NUMBER_COLORS[hex.numberToken] || '#333'}
                >
                  {hex.numberToken}
                </text>
                {/* Pips */}
                <text
                  x={center.x}
                  y={center.y + hexSize * 0.18}
                  textAnchor="middle"
                  fontSize={hexSize * 0.1}
                  fill={NUMBER_COLORS[hex.numberToken] || '#666'}
                >
                  {'•'.repeat(numberPips(hex.numberToken))}
                </text>
              </>
            )}
            {/* Robber */}
            {hex.hasRobber && (
              <circle
                cx={center.x}
                cy={center.y}
                r={hexSize * 0.2}
                fill="rgba(0,0,0,0.7)"
                stroke="#000"
                strokeWidth={2}
              />
            )}
          </g>
        );
      })}

      {/* Harbor indicators */}
      {state.board.harbors.map((harbor, i) => {
        const v1Pos = vertexToPixel(harbor.vertices[0], hexSize);
        const v2Pos = vertexToPixel(harbor.vertices[1], hexSize);
        const midX = (v1Pos.x + v2Pos.x) / 2;
        const midY = (v1Pos.y + v2Pos.y) / 2;
        const label = harbor.type === 'generic' ? '3:1' : `2:1\n${harbor.type}`;

        return (
          <g key={`harbor-${i}`}>
            <line x1={v1Pos.x} y1={v1Pos.y} x2={v2Pos.x} y2={v2Pos.y} stroke="#f5f0dc" strokeWidth={2} strokeDasharray="4,4" />
            <circle cx={midX} cy={midY} r={hexSize * 0.18} fill="#f5f0dc" stroke="#8b7355" strokeWidth={1} />
            <text x={midX} y={midY + 1} textAnchor="middle" dominantBaseline="central" fontSize={hexSize * 0.12} fill="#5c4033">
              {harbor.type === 'generic' ? '3:1' : '2:1'}
            </text>
          </g>
        );
      })}

      {/* Roads */}
      {[...roadMap.entries()].map(([edgeId, color]) => {
        const [p1, p2] = edgeToPixels(edgeId, hexSize);
        return (
          <line
            key={edgeId}
            x1={p1.x} y1={p1.y}
            x2={p2.x} y2={p2.y}
            stroke={PLAYER_COLORS[color]}
            strokeWidth={hexSize * 0.1}
            strokeLinecap="round"
          />
        );
      })}

      {/* Settlements */}
      {[...settlementMap.entries()].map(([vertexId, color]) => {
        const pos = vertexToPixel(vertexId, hexSize);
        const s = hexSize * 0.15;
        return (
          <g key={`s-${vertexId}`}>
            <rect
              x={pos.x - s} y={pos.y - s}
              width={s * 2} height={s * 2}
              fill={PLAYER_COLORS[color]}
              stroke={PLAYER_COLORS_DARK[color]}
              strokeWidth={2}
              rx={2}
            />
          </g>
        );
      })}

      {/* Cities */}
      {[...cityMap.entries()].map(([vertexId, color]) => {
        const pos = vertexToPixel(vertexId, hexSize);
        const s = hexSize * 0.2;
        return (
          <g key={`c-${vertexId}`}>
            <rect
              x={pos.x - s} y={pos.y - s * 0.8}
              width={s * 2} height={s * 1.6}
              fill={PLAYER_COLORS[color]}
              stroke={PLAYER_COLORS_DARK[color]}
              strokeWidth={2}
              rx={3}
            />
            {/* Tower */}
            <rect
              x={pos.x - s * 0.4} y={pos.y - s * 1.3}
              width={s * 0.8} height={s * 0.5}
              fill={PLAYER_COLORS[color]}
              stroke={PLAYER_COLORS_DARK[color]}
              strokeWidth={1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}
