import React, { useState } from 'react';
import { Player, ResourceType, ALL_RESOURCES, ResourceBundle, emptyResources, totalResources, hasResources } from '@catan/shared';
import { ResourceIcon } from './ResourceIcon';

interface DiscardDialogProps {
  player: Player;
  mustDiscard: number;
  onDiscard: (resources: ResourceBundle) => void;
}

export function DiscardDialog({ player, mustDiscard, onDiscard }: DiscardDialogProps) {
  const [selected, setSelected] = useState<ResourceBundle>(emptyResources());
  const selectedTotal = totalResources(selected);
  const remaining = mustDiscard - selectedTotal;

  function adjust(resource: ResourceType, delta: number) {
    setSelected((prev) => {
      const newVal = prev[resource] + delta;
      if (newVal < 0 || newVal > player.resources[resource]) return prev;
      const newSelected = { ...prev, [resource]: newVal };
      if (totalResources(newSelected) > mustDiscard) return prev;
      return newSelected;
    });
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        padding: '24px',
        minWidth: '340px',
        maxWidth: '90vw',
        color: '#eee',
        border: '2px solid #e74c3c',
      }}>
        <h3 style={{ margin: '0 0 4px', color: '#e74c3c' }}>Robber! Discard Cards</h3>
        <p style={{ color: '#aaa', fontSize: '0.85em', margin: '0 0 16px' }}>
          You have {totalResources(player.resources)} cards. Select {mustDiscard} to discard ({remaining} more).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {ALL_RESOURCES.map((r) => {
            const have = player.resources[r];
            if (have === 0) return null;
            return (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ResourceIcon resource={r} size={20} />
                <span style={{ width: '60px', fontSize: '0.85em' }}>{r}</span>
                <span style={{ color: '#888', fontSize: '0.8em', width: '30px' }}>({have})</span>
                <button
                  onClick={() => adjust(r, -1)}
                  disabled={selected[r] <= 0}
                  style={stepBtnStyle(selected[r] <= 0)}
                >
                  −
                </button>
                <span style={{
                  minWidth: '24px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: selected[r] > 0 ? '#e74c3c' : '#555',
                }}>
                  {selected[r]}
                </span>
                <button
                  onClick={() => adjust(r, 1)}
                  disabled={selected[r] >= have || selectedTotal >= mustDiscard}
                  style={stepBtnStyle(selected[r] >= have || selectedTotal >= mustDiscard)}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => remaining === 0 && onDiscard(selected)}
          disabled={remaining !== 0}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            border: 'none',
            background: remaining === 0 ? '#e74c3c' : '#333',
            color: remaining === 0 ? '#fff' : '#666',
            fontWeight: 'bold',
            cursor: remaining === 0 ? 'pointer' : 'not-allowed',
            fontSize: '0.95em',
          }}
        >
          {remaining === 0 ? 'Discard Selected' : `Select ${remaining} more`}
        </button>
      </div>
    </div>
  );
}

function stepBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    border: 'none',
    background: disabled ? '#222' : '#444',
    color: disabled ? '#555' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    fontSize: '1em',
  };
}
