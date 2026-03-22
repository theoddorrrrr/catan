import React, { useState } from 'react';
import {
  GameState,
  Player,
  ResourceType,
  ALL_RESOURCES,
  ResourceBundle,
  emptyResources,
  totalResources,
  hasResources,
} from '@catan/shared';
import { ResourceIcon } from './ResourceIcon';
import { PLAYER_COLORS } from '../renderer/colors';

interface DomesticTradeDialogProps {
  state: GameState;
  humanPlayerId: string;
  onPropose: (offering: ResourceBundle, requesting: ResourceBundle) => void;
  onClose: () => void;
}

export function DomesticTradeDialog({ state, humanPlayerId, onPropose, onClose }: DomesticTradeDialogProps) {
  const [offering, setOffering] = useState<ResourceBundle>(emptyResources());
  const [requesting, setRequesting] = useState<ResourceBundle>(emptyResources());
  const player = state.players.find((p) => p.id === humanPlayerId)!;

  const offeringTotal = totalResources(offering);
  const requestingTotal = totalResources(requesting);
  const canPropose = offeringTotal > 0 && requestingTotal > 0 && hasResources(player.resources, offering);

  // Find which bots could potentially accept (have the requested resources)
  const potentialAcceptors = state.players.filter(
    (p) => p.id !== humanPlayerId && hasResources(p.resources, requesting)
  );

  function adjustOffer(resource: ResourceType, delta: number) {
    setOffering((prev) => {
      const newVal = prev[resource] + delta;
      if (newVal < 0 || newVal > player.resources[resource]) return prev;
      return { ...prev, [resource]: newVal };
    });
  }

  function adjustRequest(resource: ResourceType, delta: number) {
    setRequesting((prev) => {
      const newVal = prev[resource] + delta;
      if (newVal < 0 || newVal > 19) return prev;
      return { ...prev, [resource]: newVal };
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
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        padding: '24px',
        minWidth: '380px',
        maxWidth: '90vw',
        color: '#eee',
        border: '2px solid #3498db',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 16px', color: '#3498db' }}>Propose Trade</h3>

        {/* Offering section */}
        <p style={{ color: '#aaa', fontSize: '0.85em', margin: '0 0 8px' }}>You give:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {ALL_RESOURCES.map((r) => (
            <ResourceRow
              key={`offer-${r}`}
              resource={r}
              value={offering[r]}
              max={player.resources[r]}
              onAdjust={(delta) => adjustOffer(r, delta)}
              showHave={player.resources[r]}
            />
          ))}
        </div>

        {/* Requesting section */}
        <p style={{ color: '#aaa', fontSize: '0.85em', margin: '0 0 8px' }}>You receive:</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {ALL_RESOURCES.map((r) => (
            <ResourceRow
              key={`req-${r}`}
              resource={r}
              value={requesting[r]}
              max={19}
              onAdjust={(delta) => adjustRequest(r, delta)}
            />
          ))}
        </div>

        {/* Potential acceptors hint */}
        {requestingTotal > 0 && (
          <div style={{ fontSize: '0.8em', color: '#888', marginBottom: '12px' }}>
            {potentialAcceptors.length > 0 ? (
              <span>
                Can accept:{' '}
                {potentialAcceptors.map((p) => (
                  <span key={p.id} style={{ color: PLAYER_COLORS[p.color], fontWeight: 'bold', marginRight: '6px' }}>
                    {p.name}
                  </span>
                ))}
              </span>
            ) : (
              <span style={{ color: '#e74c3c' }}>No player has the requested resources</span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
          <button
            onClick={() => canPropose && onPropose(offering, requesting)}
            disabled={!canPropose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: canPropose ? '#3498db' : '#333',
              color: canPropose ? '#fff' : '#666',
              cursor: canPropose ? 'pointer' : 'not-allowed',
              fontWeight: 'bold',
            }}
          >
            Propose Trade
          </button>
        </div>
      </div>
    </div>
  );
}

// Shared result dialog shown after trade is proposed
interface TradeResultProps {
  accepted: boolean;
  acceptedByName?: string;
  onClose: () => void;
}

export function TradeResultDialog({ accepted, acceptedByName, onClose }: TradeResultProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a2e',
        borderRadius: '12px',
        padding: '24px',
        minWidth: '280px',
        color: '#eee',
        textAlign: 'center',
        border: `2px solid ${accepted ? '#27ae60' : '#e74c3c'}`,
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 8px', color: accepted ? '#27ae60' : '#e74c3c' }}>
          {accepted ? 'Trade Accepted!' : 'Trade Rejected'}
        </h3>
        <p style={{ color: '#aaa', fontSize: '0.9em', margin: '0 0 16px' }}>
          {accepted ? `${acceptedByName} accepted your trade.` : 'No player accepted your trade offer.'}
        </p>
        <button onClick={onClose} style={{
          padding: '8px 20px',
          borderRadius: '6px',
          border: 'none',
          background: '#444',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}>
          OK
        </button>
      </div>
    </div>
  );
}

function ResourceRow({ resource, value, max, onAdjust, showHave }: {
  resource: ResourceType;
  value: number;
  max: number;
  onAdjust: (delta: number) => void;
  showHave?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <ResourceIcon resource={resource} size={18} />
      <span style={{ width: '55px', fontSize: '0.82em' }}>{resource}</span>
      {showHave !== undefined && (
        <span style={{ color: '#888', fontSize: '0.75em', width: '28px' }}>({showHave})</span>
      )}
      <button onClick={() => onAdjust(-1)} disabled={value <= 0} style={stepBtnStyle(value <= 0)}>−</button>
      <span style={{
        minWidth: '22px',
        textAlign: 'center',
        fontWeight: 'bold',
        color: value > 0 ? '#3498db' : '#555',
        fontSize: '0.95em',
      }}>
        {value}
      </span>
      <button onClick={() => onAdjust(1)} disabled={value >= max} style={stepBtnStyle(value >= max)}>+</button>
    </div>
  );
}

function stepBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '26px',
    height: '26px',
    borderRadius: '4px',
    border: 'none',
    background: disabled ? '#222' : '#444',
    color: disabled ? '#555' : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    fontSize: '1em',
  };
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '6px',
  border: 'none',
  background: '#333',
  color: '#ccc',
  cursor: 'pointer',
};
