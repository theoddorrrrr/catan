import React, { useState } from 'react';
import { ResourceType } from '@catan/shared';
import { ResourceIcon, RESOURCE_LABELS } from './ResourceIcon';

interface HelpGuideProps {
  onClose: () => void;
}

type TabId = 'base';

const TABS: { id: TabId; label: string }[] = [
  { id: 'base', label: 'Base Game' },
];

export function HelpGuide({ onClose }: HelpGuideProps) {
  const [activeTab, setActiveTab] = useState<TabId>('base');

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '1.3em', color: '#f1c40f' }}>Game Guide</h2>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>

        {/* Tabs */}
        <div style={tabBarStyle}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...tabStyle,
                borderBottom: activeTab === tab.id ? '2px solid #f1c40f' : '2px solid transparent',
                color: activeTab === tab.id ? '#f1c40f' : '#888',
              }}
            >
              {tab.label}
            </button>
          ))}
          <span style={{ color: '#555', fontSize: '0.8em', marginLeft: 'auto', fontStyle: 'italic' }}>
            More expansions coming soon
          </span>
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {activeTab === 'base' && <BaseGameGuide />}
        </div>
      </div>
    </div>
  );
}

function BaseGameGuide() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Overview */}
      <Section title="Overview">
        <p>
          Settlers of Catan is a strategy board game where players compete to build the most successful colony on the island of Catan.
          The first player to reach <strong>10 Victory Points</strong> wins the game.
        </p>
        <p>
          Earn VP by building <strong>settlements</strong> (1 VP), upgrading to <strong>cities</strong> (2 VP),
          holding the <strong>Longest Road</strong> (2 VP), having the <strong>Largest Army</strong> (2 VP),
          or collecting <strong>Victory Point</strong> development cards (1 VP each).
        </p>
      </Section>

      {/* Setup */}
      <Section title="Setup Phase">
        <p>
          Each player places <strong>2 settlements</strong> and <strong>2 roads</strong> in turn order.
          The second round goes in reverse order. After placing your second settlement, you receive
          one of each resource from the adjacent hexes.
        </p>
      </Section>

      {/* Resources */}
      <Section title="Resources">
        <p>There are 5 resource types, each produced by a specific terrain:</p>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', margin: '8px 0' }}>
          {[
            { r: ResourceType.Brick, terrain: 'Hills' },
            { r: ResourceType.Lumber, terrain: 'Forest' },
            { r: ResourceType.Ore, terrain: 'Mountains' },
            { r: ResourceType.Grain, terrain: 'Fields' },
            { r: ResourceType.Wool, terrain: 'Pasture' },
          ].map(({ r, terrain }) => (
            <div key={r} style={resourceItemStyle}>
              <ResourceIcon resource={r} size={20} />
              <span style={{ fontWeight: 'bold' }}>{RESOURCE_LABELS[r]}</span>
              <span style={{ color: '#888', fontSize: '0.85em' }}>({terrain})</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Turn Flow */}
      <Section title="Turn Flow">
        <ol style={listStyle}>
          <li><strong>Roll Dice</strong> — Roll two dice. All players with settlements/cities on hexes matching the number collect resources.</li>
          <li><strong>Trade & Build</strong> — Trade with the bank or other players, then build roads, settlements, cities, or buy development cards.</li>
          <li><strong>End Turn</strong> — Pass to the next player.</li>
        </ol>
      </Section>

      {/* Building Costs */}
      <Section title="Building Costs">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <CostRow label="Road" resources={[ResourceType.Brick, ResourceType.Lumber]} />
          <CostRow label="Settlement" resources={[ResourceType.Brick, ResourceType.Lumber, ResourceType.Grain, ResourceType.Wool]} />
          <CostRow label="City" resources={[ResourceType.Ore, ResourceType.Ore, ResourceType.Ore, ResourceType.Grain, ResourceType.Grain]} note="Upgrades a settlement" />
          <CostRow label="Dev Card" resources={[ResourceType.Ore, ResourceType.Grain, ResourceType.Wool]} />
        </div>
      </Section>

      {/* Trading */}
      <Section title="Trading">
        <p><strong>Bank Trade:</strong> Trade 4 of the same resource for 1 of any other resource.</p>
        <p><strong>Harbor Trade:</strong> If you have a settlement on a harbor, you get better rates:</p>
        <ul style={listStyle}>
          <li><strong>3:1 Harbor</strong> — Trade any 3 of the same resource for 1 of any other</li>
          <li><strong>2:1 Harbor</strong> — Trade 2 of the specific resource for 1 of any other</li>
        </ul>
        <p><strong>Player Trade:</strong> Propose a trade to other players. They can accept or decline.</p>
      </Section>

      {/* Development Cards */}
      <Section title="Development Cards">
        <p>Buy from the deck for <InlineCost resources={[ResourceType.Ore, ResourceType.Grain, ResourceType.Wool]} />.
          You <strong>cannot play a card on the same turn you bought it</strong>. You may play <strong>one card per turn</strong>.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '8px 0' }}>
          <DevCardRow icon="⚔" name="Knight" count={14} desc="Move the robber to a new hex and steal one resource from an adjacent player." />
          <DevCardRow icon="⭐" name="Victory Point" count={5} desc="Worth 1 VP. Revealed only when you win." />
          <DevCardRow icon="🛤" name="Road Building" count={2} desc="Place 2 roads for free." />
          <DevCardRow icon="🎁" name="Year of Plenty" count={2} desc="Take any 2 resources from the bank." />
          <DevCardRow icon="💰" name="Monopoly" count={2} desc="Name a resource — all players give you all of that resource." />
        </div>
      </Section>

      {/* The Robber */}
      <Section title="The Robber">
        <p>When a <strong>7</strong> is rolled:</p>
        <ol style={listStyle}>
          <li>Any player with <strong>8 or more</strong> resource cards must discard half (rounded down).</li>
          <li>The roller <strong>moves the robber</strong> to any hex.</li>
          <li>The roller <strong>steals 1 random resource</strong> from a player who has a settlement/city on that hex.</li>
        </ol>
        <p>The hex with the robber <strong>does not produce resources</strong> when its number is rolled.</p>
        <p>Playing a <strong>Knight</strong> card also lets you move the robber and steal.</p>
      </Section>

      {/* Special Awards */}
      <Section title="Special Awards">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={awardStyle}>
            <span style={{ fontSize: '1.2em' }}>🛤</span>
            <div>
              <strong style={{ color: '#f1c40f' }}>Longest Road (2 VP)</strong>
              <p style={{ margin: '2px 0 0', color: '#aaa' }}>
                First player to build a continuous road of <strong>5+ segments</strong>.
                Lost if another player builds a longer road.
              </p>
            </div>
          </div>
          <div style={awardStyle}>
            <span style={{ fontSize: '1.2em' }}>⚔</span>
            <div>
              <strong style={{ color: '#f1c40f' }}>Largest Army (2 VP)</strong>
              <p style={{ margin: '2px 0 0', color: '#aaa' }}>
                First player to play <strong>3+ Knight</strong> cards.
                Lost if another player plays more knights.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Harbors */}
      <Section title="Harbors">
        <p>
          Harbors are located along the coast. Build a settlement on a harbor vertex to unlock better trade rates with the bank.
        </p>
        <ul style={listStyle}>
          <li><strong>Generic Harbor (3:1)</strong> — Trade any 3 identical resources for 1 of your choice</li>
          <li><strong>Specific Harbor (2:1)</strong> — Trade 2 of the harbor's resource for 1 of your choice</li>
        </ul>
      </Section>

      {/* Winning */}
      <Section title="Winning the Game">
        <p>The first player to reach <strong>10 Victory Points</strong> on their turn wins!</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', margin: '8px 0' }}>
          <VPSource label="Settlement" vp={1} />
          <VPSource label="City" vp={2} />
          <VPSource label="Longest Road" vp={2} />
          <VPSource label="Largest Army" vp={2} />
          <VPSource label="Victory Point Card" vp={1} note="each" />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 8px', fontSize: '1.05em', color: '#3498db', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
        {title}
      </h3>
      <div style={{ fontSize: '0.9em', color: '#ccc', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

function CostRow({ label, resources, note }: { label: string; resources: ResourceType[]; note?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontWeight: 'bold', minWidth: '90px', color: '#ddd' }}>{label}</span>
      <div style={{ display: 'flex', gap: '3px' }}>
        {resources.map((r, i) => (
          <ResourceIcon key={`${r}-${i}`} resource={r} size={18} />
        ))}
      </div>
      {note && <span style={{ fontSize: '0.8em', color: '#888' }}>({note})</span>}
    </div>
  );
}

function InlineCost({ resources }: { resources: ResourceType[] }) {
  return (
    <span style={{ display: 'inline-flex', gap: '2px', verticalAlign: 'middle' }}>
      {resources.map((r, i) => (
        <ResourceIcon key={`${r}-${i}`} resource={r} size={14} />
      ))}
    </span>
  );
}

function DevCardRow({ icon, name, count, desc }: { icon: string; name: string; count: number; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '4px 0' }}>
      <span style={{ fontSize: '1.1em', minWidth: '20px' }}>{icon}</span>
      <div>
        <strong style={{ color: '#ddd' }}>{name}</strong>
        <span style={{ color: '#666', fontSize: '0.85em' }}> ({count} in deck)</span>
        <p style={{ margin: '2px 0 0', color: '#aaa', fontSize: '0.9em' }}>{desc}</p>
      </div>
    </div>
  );
}

function VPSource({ label, vp, note }: { label: string; vp: number; note?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        background: '#f1c40f', color: '#000', fontWeight: 'bold',
        borderRadius: '4px', padding: '1px 6px', fontSize: '0.85em', minWidth: '30px', textAlign: 'center',
      }}>
        {vp} VP
      </span>
      <span style={{ color: '#ddd' }}>{label}</span>
      {note && <span style={{ color: '#888', fontSize: '0.85em' }}>({note})</span>}
    </div>
  );
}

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  padding: '8px',
};

const modalStyle: React.CSSProperties = {
  background: '#1a1a2e',
  borderRadius: '12px',
  border: '1px solid #333',
  width: '100%',
  maxWidth: '640px',
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px 10px',
  borderBottom: '1px solid #333',
  flexShrink: 0,
};

const closeBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  fontSize: '1.3em',
  cursor: 'pointer',
  padding: '4px 8px',
  borderRadius: '4px',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex',
  gap: '4px',
  padding: '0 16px',
  borderBottom: '1px solid #333',
  alignItems: 'center',
  flexShrink: 0,
  flexWrap: 'wrap',
};

const tabStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: '8px 12px',
  cursor: 'pointer',
  fontSize: '0.9em',
  fontWeight: 'bold',
};

const contentStyle: React.CSSProperties = {
  padding: '12px 16px',
  overflowY: 'auto',
  flex: 1,
  WebkitOverflowScrolling: 'touch',
};

const listStyle: React.CSSProperties = {
  paddingLeft: '20px',
  margin: '6px 0',
};

const resourceItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  background: 'rgba(0,0,0,0.2)',
  borderRadius: '6px',
  fontSize: '0.9em',
};

const awardStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-start',
  padding: '6px 8px',
  background: 'rgba(0,0,0,0.2)',
  borderRadius: '6px',
};
