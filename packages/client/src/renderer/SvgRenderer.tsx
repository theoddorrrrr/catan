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
  HarborType,
  ResourceType,
  numberPips,
} from '@catan/shared';
import { BoardGraph } from '@catan/shared';
import { hexToPixel, hexCorners, hexCornersToPoints, vertexToPixel, edgeToPixels } from './hex-layout';
import {
  TERRAIN_COLORS, TERRAIN_COLORS_LIGHT, TERRAIN_ICONS,
  PLAYER_COLORS, PLAYER_COLORS_DARK, NUMBER_COLORS,
  HARBOR_RESOURCE, RESOURCE_COLORS,
} from './colors';

interface SvgRendererProps {
  state: GameState;
  graph: BoardGraph;
  hexSize?: number;
  highlightVertices?: Set<VertexId>;
  highlightEdges?: Set<EdgeId>;
  highlightHexes?: Set<string>;
  onVertexClick?: (vertexId: VertexId) => void;
  onEdgeClick?: (edgeId: EdgeId) => void;
  onHexClick?: (coord: HexCoord) => void;
}

export function SvgRenderer({
  state,
  graph,
  hexSize = 50,
  highlightVertices,
  highlightEdges,
  highlightHexes,
  onVertexClick,
  onEdgeClick,
  onHexClick,
}: SvgRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 600, h: 600 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

  // Calculate board bounds once
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
  }, [hexSize]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    setHasDragged(false);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !svgRef.current) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) setHasDragged(true);
      const svg = svgRef.current;
      const scaleX = viewBox.w / svg.clientWidth;
      const scaleY = viewBox.h / svg.clientHeight;
      setViewBox((v) => ({ ...v, x: v.x - dx * scaleX, y: v.y - dy * scaleY }));
      setDragStart({ x: e.clientX, y: e.clientY });
    },
    [dragging, dragStart, viewBox.w, viewBox.h]
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

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

  const interactive = !!(highlightVertices?.size || highlightEdges?.size || highlightHexes?.size);

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
      {/* Gradient definitions for terrain */}
      <defs>
        {Object.values(Terrain).map((terrain) => (
          <radialGradient key={terrain} id={`grad-${terrain}`} cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor={TERRAIN_COLORS_LIGHT[terrain]} />
            <stop offset="100%" stopColor={TERRAIN_COLORS[terrain]} />
          </radialGradient>
        ))}
      </defs>

      <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="#1a5fa0" />

      {/* Hex tiles - minimalistic style */}
      {state.board.hexes.map((hex) => {
        const center = hexToPixel(hex.coord, hexSize);
        const corners = hexCorners(center, hexSize);
        const points = hexCornersToPoints(corners);
        const hk = hexKey(hex.coord);
        const isHighlighted = highlightHexes?.has(hk);
        const iconPath = TERRAIN_ICONS[hex.terrain];

        return (
          <g key={`hex-${hk}`}>
            <polygon
              points={points}
              fill={`url(#grad-${hex.terrain})`}
              stroke={isHighlighted ? '#f1c40f' : 'rgba(0,0,0,0.15)'}
              strokeWidth={isHighlighted ? 3 : 1}
              style={isHighlighted ? { cursor: 'pointer' } : undefined}
              onClick={(e) => {
                if (!hasDragged && isHighlighted && onHexClick) {
                  e.stopPropagation();
                  onHexClick(hex.coord);
                }
              }}
            />
            {/* Terrain icon (subtle, behind number) */}
            {hex.terrain !== Terrain.Desert && (
              <path
                d={iconPath}
                transform={`translate(${center.x},${center.y - hexSize * 0.25}) scale(${hexSize * 0.03})`}
                fill="rgba(255,255,255,0.2)"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={0.5}
                style={{ pointerEvents: 'none' }}
              />
            )}
            {hex.numberToken && (
              <>
                <circle cx={center.x} cy={center.y + hexSize * 0.08} r={hexSize * 0.24}
                  fill="rgba(245,240,220,0.95)" stroke="rgba(0,0,0,0.2)" strokeWidth={0.5} />
                <text
                  x={center.x} y={center.y + hexSize * 0.08 + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fontSize={hexSize * 0.26}
                  fontWeight={hex.numberToken === 6 || hex.numberToken === 8 ? 'bold' : 'normal'}
                  fill={NUMBER_COLORS[hex.numberToken] || '#444'}
                  style={{ pointerEvents: 'none' }}
                >
                  {hex.numberToken}
                </text>
                <text
                  x={center.x} y={center.y + hexSize * 0.08 + hexSize * 0.16}
                  textAnchor="middle" fontSize={hexSize * 0.08}
                  fill={NUMBER_COLORS[hex.numberToken] || '#888'}
                  style={{ pointerEvents: 'none' }}
                >
                  {'•'.repeat(numberPips(hex.numberToken))}
                </text>
              </>
            )}
            {hex.hasRobber && (
              <>
                <circle
                  cx={center.x} cy={center.y} r={hexSize * 0.18}
                  fill="rgba(0,0,0,0.75)" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5}
                  style={{ pointerEvents: 'none' }}
                />
                <text x={center.x} y={center.y + 1} textAnchor="middle" dominantBaseline="central"
                  fontSize={hexSize * 0.16} fill="#fff" style={{ pointerEvents: 'none' }}>
                  R
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Harbors */}
      {state.board.harbors.map((harbor, i) => {
        const v1Pos = vertexToPixel(harbor.vertices[0], hexSize);
        const v2Pos = vertexToPixel(harbor.vertices[1], hexSize);
        const edgeMidX = (v1Pos.x + v2Pos.x) / 2;
        const edgeMidY = (v1Pos.y + v2Pos.y) / 2;

        // Compute outward direction: perpendicular to the edge, pointing away from board center
        const edgeDx = v2Pos.x - v1Pos.x;
        const edgeDy = v2Pos.y - v1Pos.y;
        // Two perpendicular candidates
        let perpX = -edgeDy;
        let perpY = edgeDx;
        const perpLen = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
        perpX /= perpLen;
        perpY /= perpLen;
        // Pick the one pointing away from board center (0,0)
        if (edgeMidX * perpX + edgeMidY * perpY < 0) {
          perpX = -perpX;
          perpY = -perpY;
        }

        const outDist = hexSize * 0.6;
        const iconX = edgeMidX + perpX * outDist;
        const iconY = edgeMidY + perpY * outDist;

        const harborResource = HARBOR_RESOURCE[harbor.type];
        const isSpecific = harborResource !== null;
        const circleR = hexSize * (isSpecific ? 0.22 : 0.18);
        const bgColor = isSpecific ? RESOURCE_COLORS[harborResource] : '#f5f0dc';
        return (
          <g key={`harbor-${i}`} style={{ pointerEvents: 'none' }}>
            {/* Lines from each vertex outward to the harbor icon */}
            <line x1={v1Pos.x} y1={v1Pos.y} x2={iconX} y2={iconY}
              stroke={isSpecific ? bgColor : '#f5f0dc'} strokeWidth={1.5} opacity={0.5} />
            <line x1={v2Pos.x} y1={v2Pos.y} x2={iconX} y2={iconY}
              stroke={isSpecific ? bgColor : '#f5f0dc'} strokeWidth={1.5} opacity={0.5} />
            <circle cx={iconX} cy={iconY} r={circleR}
              fill={isSpecific ? bgColor : '#f5f0dc'}
              stroke={isSpecific ? '#fff' : '#8b7355'} strokeWidth={1} />
            <text
              x={iconX} y={iconY + (isSpecific ? circleR * 0.55 : 1)}
              textAnchor="middle" dominantBaseline="central"
              fontSize={hexSize * (isSpecific ? 0.09 : 0.13)}
              fill={isSpecific ? '#fff' : '#5c4033'}
              fontWeight="bold"
            >
              {isSpecific ? '2:1' : '3:1'}
            </text>
            {isSpecific && (
              <text
                x={iconX} y={iconY - circleR * 0.2}
                textAnchor="middle" dominantBaseline="central"
                fontSize={hexSize * 0.14}
                fill="#fff"
              >
                {harborResource === ResourceType.Brick && '🧱'}
                {harborResource === ResourceType.Lumber && '🌲'}
                {harborResource === ResourceType.Ore && '⛏'}
                {harborResource === ResourceType.Grain && '🌾'}
                {harborResource === ResourceType.Wool && '🐑'}
              </text>
            )}
          </g>
        );
      })}

      {/* Roads */}
      {[...roadMap.entries()].map(([edgeId, color]) => {
        const [p1, p2] = edgeToPixels(edgeId, hexSize);
        return (
          <line
            key={`road-${edgeId}`}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke={PLAYER_COLORS[color]}
            strokeWidth={hexSize * 0.1}
            strokeLinecap="round"
            style={{ pointerEvents: 'none' }}
          />
        );
      })}

      {/* Highlighted edges (clickable build targets) */}
      {highlightEdges && [...highlightEdges].map((edgeId) => {
        if (roadMap.has(edgeId)) return null;
        const [p1, p2] = edgeToPixels(edgeId, hexSize);
        return (
          <line
            key={`hl-edge-${edgeId}`}
            x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke="#f1c40f"
            strokeWidth={hexSize * 0.12}
            strokeLinecap="round"
            opacity={0.6}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              if (!hasDragged && onEdgeClick) {
                e.stopPropagation();
                onEdgeClick(edgeId);
              }
            }}
          />
        );
      })}

      {/* Settlements */}
      {[...settlementMap.entries()].map(([vertexId, color]) => {
        const pos = vertexToPixel(vertexId, hexSize);
        const s = hexSize * 0.15;
        return (
          <rect
            key={`settle-${vertexId}`}
            x={pos.x - s} y={pos.y - s}
            width={s * 2} height={s * 2}
            fill={PLAYER_COLORS[color]}
            stroke={PLAYER_COLORS_DARK[color]}
            strokeWidth={2} rx={2}
          />
        );
      })}

      {/* Cities */}
      {[...cityMap.entries()].map(([vertexId, color]) => {
        const pos = vertexToPixel(vertexId, hexSize);
        const s = hexSize * 0.2;
        return (
          <g key={`city-${vertexId}`}>
            <rect
              x={pos.x - s} y={pos.y - s * 0.8}
              width={s * 2} height={s * 1.6}
              fill={PLAYER_COLORS[color]}
              stroke={PLAYER_COLORS_DARK[color]}
              strokeWidth={2} rx={3}
            />
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

      {/* Highlighted vertices (clickable build targets) */}
      {highlightVertices && [...highlightVertices].map((vertexId) => {
        const pos = vertexToPixel(vertexId, hexSize);
        return (
          <circle
            key={`hl-vertex-${vertexId}`}
            cx={pos.x} cy={pos.y}
            r={hexSize * 0.15}
            fill="#f1c40f"
            opacity={0.7}
            stroke="#fff"
            strokeWidth={2}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              if (!hasDragged && onVertexClick) {
                e.stopPropagation();
                onVertexClick(vertexId);
              }
            }}
          />
        );
      })}
    </svg>
  );
}
