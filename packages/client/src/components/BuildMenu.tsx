import React, { useState, useRef, useEffect } from 'react';
import { Player, hasResources, BUILDING_COSTS, ResourceType, ALL_RESOURCES } from '@catan/shared';
import { ResourceIcon } from './ResourceIcon';

interface BuildOption {
  id: string;
  label: string;
  icon: string;
  cost: Record<ResourceType, number>;
  enabled: boolean;
  active: boolean;
}

interface BuildMenuProps {
  player: Player;
  canBuild: boolean;
  devCardDeckSize: number;
  devCardsEnabled: boolean;
  activeMode: string;
  onSelectMode: (mode: string) => void;
  onBuyDevCard: () => void;
}

export function BuildMenu({
  player,
  canBuild,
  devCardDeckSize,
  devCardsEnabled,
  activeMode,
  onSelectMode,
  onBuyDevCard,
}: BuildMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!canBuild) return null;

  const options: BuildOption[] = [
    {
      id: 'buildRoad',
      label: 'Road',
      icon: '🛤',
      cost: BUILDING_COSTS.road as Record<ResourceType, number>,
      enabled: hasResources(player.resources, BUILDING_COSTS.road) && player.remainingRoads > 0,
      active: activeMode === 'buildRoad',
    },
    {
      id: 'buildSettlement',
      label: 'Settlement',
      icon: '🏠',
      cost: BUILDING_COSTS.settlement as Record<ResourceType, number>,
      enabled: hasResources(player.resources, BUILDING_COSTS.settlement) && player.remainingSettlements > 0,
      active: activeMode === 'buildSettlement',
    },
    {
      id: 'buildCity',
      label: 'City',
      icon: '🏰',
      cost: BUILDING_COSTS.city as Record<ResourceType, number>,
      enabled: hasResources(player.resources, BUILDING_COSTS.city) && player.remainingCities > 0 && player.settlements.length > 0,
      active: activeMode === 'buildCity',
    },
    {
      id: 'buyDevCard',
      label: 'Dev Card',
      icon: '📜',
      cost: BUILDING_COSTS.devCard as Record<ResourceType, number>,
      enabled: devCardsEnabled && hasResources(player.resources, BUILDING_COSTS.devCard) && devCardDeckSize > 0,
      active: false,
    },
  ];

  const anyActive = options.some((o) => o.active);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '6px 14px',
          borderRadius: '6px',
          border: 'none',
          background: anyActive ? '#f1c40f' : '#2c3e50',
          color: anyActive ? '#000' : '#fff',
          fontWeight: 'bold',
          cursor: 'pointer',
          fontSize: '0.9em',
        }}
      >
        🔨 Build {open ? '▲' : '▼'}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: 0,
          marginBottom: '4px',
          background: '#1a1a2e',
          border: '1px solid #444',
          borderRadius: '8px',
          padding: '6px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          minWidth: '260px',
          zIndex: 50,
          boxShadow: '0 -4px 16px rgba(0,0,0,0.5)',
        }}>
          {options.map((opt) => (
            <button
              key={opt.id}
              disabled={!opt.enabled}
              onClick={() => {
                if (opt.id === 'buyDevCard') {
                  onBuyDevCard();
                } else {
                  onSelectMode(opt.active ? 'none' : opt.id);
                }
                setOpen(false);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '8px 6px',
                borderRadius: '6px',
                border: opt.active ? '2px solid #f1c40f' : '1px solid #444',
                background: opt.active ? 'rgba(241,196,15,0.15)' : 'rgba(0,0,0,0.2)',
                color: opt.enabled ? '#fff' : '#555',
                cursor: opt.enabled ? 'pointer' : 'not-allowed',
                opacity: opt.enabled ? 1 : 0.5,
              }}
            >
              <span style={{ fontSize: '1.3em' }}>{opt.icon}</span>
              <span style={{ fontSize: '0.8em', fontWeight: 'bold' }}>{opt.label}</span>
              <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {ALL_RESOURCES.filter((r) => opt.cost[r] > 0).map((r) => (
                  <span key={r} style={{ display: 'flex', alignItems: 'center', gap: '1px', fontSize: '0.7em' }}>
                    <ResourceIcon resource={r} size={10} />
                    {opt.cost[r]}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
