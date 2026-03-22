import React, { useState, useEffect, useRef } from 'react';
import { ResourceType, ResourceBundle, ALL_RESOURCES } from '@catan/shared';
import { ResourceIcon } from './ResourceIcon';

interface AnimationEntry {
  id: number;
  resource: ResourceType;
  count: number;
  x: number; // horizontal offset within container
}

interface ResourceAnimationProps {
  distributions: Record<string, ResourceBundle> | null;
  humanPlayerId: string | null;
}

let nextId = 0;

export function ResourceAnimation({ distributions, humanPlayerId }: ResourceAnimationProps) {
  const [entries, setEntries] = useState<AnimationEntry[]>([]);
  const lastDistRef = useRef<Record<string, ResourceBundle> | null>(null);

  useEffect(() => {
    if (!distributions || distributions === lastDistRef.current) return;
    lastDistRef.current = distributions;

    // Find relevant player's resources
    const targetId = humanPlayerId || Object.keys(distributions)[0];
    if (!targetId) return;
    const bundle = distributions[targetId];
    if (!bundle) return;

    const newEntries: AnimationEntry[] = [];
    let offset = 0;
    for (const r of ALL_RESOURCES) {
      if (bundle[r] > 0) {
        newEntries.push({
          id: nextId++,
          resource: r,
          count: bundle[r],
          x: offset * 50,
        });
        offset++;
      }
    }

    if (newEntries.length > 0) {
      setEntries((prev) => [...prev, ...newEntries]);
      // Remove after animation
      setTimeout(() => {
        setEntries((prev) => prev.filter((e) => !newEntries.some((ne) => ne.id === e.id)));
      }, 1800);
    }
  }, [distributions, humanPlayerId]);

  if (entries.length === 0) return null;

  const totalWidth = entries.length * 50;
  const startX = `calc(50% - ${totalWidth / 2}px)`;

  return (
    <div style={{
      position: 'absolute',
      top: '30%',
      left: startX,
      zIndex: 15,
      pointerEvents: 'none',
    }}>
      <style>{`
        @keyframes floatDown {
          0% { transform: translateY(-20px); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(80px); opacity: 0; }
        }
      `}</style>
      {entries.map((entry) => (
        <div
          key={entry.id}
          style={{
            position: 'absolute',
            left: `${entry.x}px`,
            animation: 'floatDown 1.8s ease-out forwards',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(0,0,0,0.6)',
            borderRadius: '12px',
            padding: '4px 10px',
          }}
        >
          <ResourceIcon resource={entry.resource} size={20} />
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '1.1em' }}>
            +{entry.count}
          </span>
        </div>
      ))}
    </div>
  );
}
