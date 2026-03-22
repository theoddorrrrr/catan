import React from 'react';
import { ResourceType } from '@catan/shared';

const RESOURCE_COLORS: Record<ResourceType, string> = {
  [ResourceType.Brick]: '#c45a2c',
  [ResourceType.Lumber]: '#2d6a2d',
  [ResourceType.Ore]: '#8a8a8a',
  [ResourceType.Grain]: '#e8c44a',
  [ResourceType.Wool]: '#7ec850',
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  [ResourceType.Brick]: 'Brick',
  [ResourceType.Lumber]: 'Lumber',
  [ResourceType.Ore]: 'Ore',
  [ResourceType.Grain]: 'Grain',
  [ResourceType.Wool]: 'Wool',
};

/** Inline SVG resource icon — works in both HTML and SVG contexts */
export function ResourceIcon({
  resource,
  size = 16,
  style,
}: {
  resource: ResourceType;
  size?: number;
  style?: React.CSSProperties;
}) {
  const color = RESOURCE_COLORS[resource];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ display: 'inline-block', verticalAlign: 'middle', ...style }}
      aria-label={RESOURCE_LABELS[resource]}
    >
      {resource === ResourceType.Brick && (
        // Brick: two stacked rectangles
        <>
          <rect x="2" y="4" width="20" height="7" rx="1" fill={color} />
          <rect x="5" y="13" width="17" height="7" rx="1" fill={color} opacity="0.8" />
          <line x1="12" y1="4" x2="12" y2="11" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
        </>
      )}
      {resource === ResourceType.Lumber && (
        // Tree
        <>
          <polygon points="12,2 4,16 20,16" fill={color} />
          <polygon points="12,7 6,18 18,18" fill={color} opacity="0.8" />
          <rect x="10" y="17" width="4" height="5" rx="1" fill="#8B5E3C" />
        </>
      )}
      {resource === ResourceType.Ore && (
        // Gem / rock
        <>
          <polygon points="12,2 3,10 7,22 17,22 21,10" fill={color} />
          <polygon points="12,2 8,10 12,8 16,10" fill="#aaa" opacity="0.6" />
          <line x1="3" y1="10" x2="21" y2="10" stroke="#fff" strokeWidth="0.5" opacity="0.3" />
        </>
      )}
      {resource === ResourceType.Grain && (
        // Wheat sheaf
        <>
          <ellipse cx="8" cy="6" rx="3" ry="5" fill={color} transform="rotate(-15,8,6)" />
          <ellipse cx="16" cy="6" rx="3" ry="5" fill={color} transform="rotate(15,16,6)" />
          <ellipse cx="12" cy="5" rx="3" ry="5.5" fill={color} />
          <rect x="11" y="10" width="2" height="12" rx="1" fill="#b8860b" />
        </>
      )}
      {resource === ResourceType.Wool && (
        // Fluffy cloud / sheep wool
        <>
          <circle cx="9" cy="12" r="5" fill={color} />
          <circle cx="15" cy="12" r="5" fill={color} />
          <circle cx="12" cy="8" r="5" fill={color} />
          <circle cx="7" cy="9" r="3" fill={color} opacity="0.8" />
          <circle cx="17" cy="9" r="3" fill={color} opacity="0.8" />
        </>
      )}
    </svg>
  );
}

/** SVG-native resource icon for use inside <svg> elements (harbors, etc.) */
export function SvgResourceIcon({
  resource,
  x,
  y,
  size = 16,
}: {
  resource: ResourceType;
  x: number;
  y: number;
  size?: number;
}) {
  const color = RESOURCE_COLORS[resource];
  const s = size / 24; // scale factor
  return (
    <g transform={`translate(${x - size / 2},${y - size / 2}) scale(${s})`}>
      {resource === ResourceType.Brick && (
        <>
          <rect x="2" y="4" width="20" height="7" rx="1" fill={color} />
          <rect x="5" y="13" width="17" height="7" rx="1" fill={color} opacity="0.8" />
        </>
      )}
      {resource === ResourceType.Lumber && (
        <>
          <polygon points="12,2 4,16 20,16" fill={color} />
          <rect x="10" y="17" width="4" height="5" rx="1" fill="#8B5E3C" />
        </>
      )}
      {resource === ResourceType.Ore && (
        <polygon points="12,2 3,10 7,22 17,22 21,10" fill={color} />
      )}
      {resource === ResourceType.Grain && (
        <>
          <ellipse cx="12" cy="5" rx="3" ry="5.5" fill={color} />
          <ellipse cx="8" cy="6" rx="3" ry="5" fill={color} transform="rotate(-15,8,6)" />
          <ellipse cx="16" cy="6" rx="3" ry="5" fill={color} transform="rotate(15,16,6)" />
          <rect x="11" y="10" width="2" height="12" rx="1" fill="#b8860b" />
        </>
      )}
      {resource === ResourceType.Wool && (
        <>
          <circle cx="9" cy="12" r="5" fill={color} />
          <circle cx="15" cy="12" r="5" fill={color} />
          <circle cx="12" cy="8" r="5" fill={color} />
        </>
      )}
    </g>
  );
}

export { RESOURCE_COLORS, RESOURCE_LABELS };
