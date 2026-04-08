import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import AgentDot from '../components/AgentDot';
import MeetingPanel from '../components/MeetingPanel';
import { getAgentDisplayName, isAgentCeo } from '../utils/agentPersona';

const TOOLBAR_H = 56;
const MAP_W = 1620;
const MAP_H = 1060;
const MIN_SCALE = 0.38;
const MAX_SCALE = 2.5;
const DEFAULT_SCALE = 1.12;

const HOUSE_PALETTE = {
  wall: '#1b130d',
  wallShade: '#9a6a38',
  wallInner: '#1a1a1a',
  wood: '#7a4a28',
  woodDeep: '#4a2e16',
  stone: '#8a9aa8',
  grass: '#5cb060',
  rug: '#b85a38',
  hearth: '#ff9f40',
};

const ROOM_STYLES = {
  Engineering: {
    label: 'ESTUDIO DEV',
    color: '#7eb8e8',
    area: { left: '5.6%', top: '8.4%', width: '27.8%', height: '27.2%' },
    floor: 'repeating-linear-gradient(90deg, #8eb8d8 0px, #8eb8d8 18px, #9ec8e8 18px, #9ec8e8 20px)',
  },
  Quality: {
    label: 'OFICINA QA',
    color: '#e8c878',
    area: { left: '33.3%', top: '8.4%', width: '27.8%', height: '27.2%' },
    floor: 'repeating-linear-gradient(45deg, #d8b878 0px, #d8b878 16px, #e8c888 16px, #e8c888 20px)',
  },
  'People Ops': {
    label: 'SALA PESSOAS',
    color: '#f0a8b8',
    area: { left: '61%', top: '8.4%', width: '27.8%', height: '27.2%' },
    floor: 'repeating-linear-gradient(0deg, #e898a8 0px, #e898a8 18px, #f0a8b8 18px, #f0a8b8 22px)',
  },
  Operations: {
    label: 'OFICINA OPS',
    color: '#90d890',
    area: { left: '5.6%', top: '41.2%', width: '27.8%', height: '23.4%' },
    floor: 'repeating-linear-gradient(0deg, #78c878 0px, #78c878 20px, #88d888 20px, #88d888 24px)',
  },
  Communications: {
    label: 'LOUNGE SOCIAL',
    color: '#c8a8e8',
    area: { left: '33.3%', top: '41.2%', width: '27.8%', height: '23.4%' },
    floor: 'repeating-linear-gradient(135deg, #b898d8 0px, #b898d8 16px, #c8a8e8 16px, #c8a8e8 20px)',
  },
  Flex: {
    label: 'ESTUDIO FLEX',
    color: '#78d8d0',
    area: { left: '61%', top: '41.2%', width: '27.8%', height: '23.4%' },
    floor: 'repeating-linear-gradient(180deg, #68c8c0 0px, #68c8c0 16px, #78d8d0 16px, #78d8d0 20px)',
  },
  Meeting: {
    label: 'MESA CENTRAL',
    color: '#f0b060',
    area: { left: '17%', top: '68.2%', width: '66%', height: '17.8%' },
    floor: 'linear-gradient(180deg, #e8a050 0%, #d89040 100%)',
  },
  Hall: {
    label: 'GRANDE HALL',
    color: '#f8e0a8',
    area: { left: '15.8%', top: '67.5%', width: '68.4%', height: '18%' },
    floor: 'repeating-linear-gradient(90deg, rgba(200,160,90,0.15) 0px, rgba(200,160,90,0.15) 18px, rgba(220,180,110,0.2) 18px, rgba(220,180,110,0.2) 20px)',
  },
};

const ROOM_FIXTURES = {
  Engineering: [
    { left: '9%', top: '18%', width: '28%', height: '19%', kind: 'bookshelf' },
    { left: '46%', top: '16%', width: '37%', height: '24%', kind: 'desk' },
    { left: '12%', top: '57%', width: '29%', height: '16%', kind: 'bench' },
    { left: '50%', top: '55%', width: '29%', height: '18%', kind: 'desk' },
    { left: '40%', top: '22%', width: '10%', height: '8%', kind: 'ledger' },
    { left: '13%', top: '41%', width: '8%', height: '9%', kind: 'stack' },
    { left: '72%', top: '43%', width: '9%', height: '8%', kind: 'toolrack' },
  ],
  Quality: [
    { left: '10%', top: '17%', width: '28%', height: '19%', kind: 'bench' },
    { left: '49%', top: '17%', width: '24%', height: '19%', kind: 'bench' },
    { left: '28%', top: '53%', width: '42%', height: '15%', kind: 'table' },
    { left: '74%', top: '20%', width: '12%', height: '18%', kind: 'cabinet' },
    { left: '18%', top: '40%', width: '10%', height: '10%', kind: 'paper' },
    { left: '60%', top: '41%', width: '9%', height: '9%', kind: 'paper' },
  ],
  'People Ops': [
    { left: '11%', top: '19%', width: '26%', height: '19%', kind: 'desk' },
    { left: '42%', top: '15%', width: '18%', height: '32%', kind: 'plant' },
    { left: '67%', top: '19%', width: '18%', height: '19%', kind: 'bookshelf' },
    { left: '23%', top: '56%', width: '52%', height: '13%', kind: 'sofa' },
    { left: '14%', top: '42%', width: '12%', height: '10%', kind: 'tea' },
    { left: '72%', top: '44%', width: '10%', height: '10%', kind: 'frame' },
  ],
  Operations: [
    { left: '11%', top: '19%', width: '26%', height: '20%', kind: 'console' },
    { left: '50%', top: '19%', width: '24%', height: '20%', kind: 'rack' },
    { left: '24%', top: '58%', width: '48%', height: '13%', kind: 'workbench' },
    { left: '76%', top: '22%', width: '10%', height: '14%', kind: 'crate' },
    { left: '15%', top: '45%', width: '10%', height: '10%', kind: 'pipe' },
  ],
  Communications: [
    { left: '11%', top: '18%', width: '19%', height: '18%', kind: 'armchair' },
    { left: '37%', top: '17%', width: '27%', height: '24%', kind: 'hearth' },
    { left: '70%', top: '18%', width: '19%', height: '18%', kind: 'armchair' },
    { left: '22%', top: '58%', width: '54%', height: '11%', kind: 'sofa' },
    { left: '75%', top: '52%', width: '10%', height: '11%', kind: 'tea' },
    { left: '18%', top: '44%', width: '10%', height: '10%', kind: 'frame' },
  ],
  Flex: [
    { left: '10%', top: '17%', width: '22%', height: '20%', kind: 'bed' },
    { left: '39%', top: '17%', width: '22%', height: '20%', kind: 'desk' },
    { left: '68%', top: '19%', width: '17%', height: '19%', kind: 'plant' },
    { left: '22%', top: '58%', width: '54%', height: '11%', kind: 'table' },
    { left: '64%', top: '18%', width: '11%', height: '18%', kind: 'trunk' },
    { left: '44%', top: '42%', width: '10%', height: '9%', kind: 'ledger' },
  ],
};

const DOORS = [
  { left: '31.7%', top: '22.2%', width: '2.1%', height: '9.4%', orientation: 'vertical' },
  { left: '59.6%', top: '22.2%', width: '2.1%', height: '9.4%', orientation: 'vertical' },
  { left: '31.7%', top: '50.4%', width: '2.1%', height: '8.8%', orientation: 'vertical' },
  { left: '59.6%', top: '50.4%', width: '2.1%', height: '8.8%', orientation: 'vertical' },
  { left: '45.8%', top: '35.8%', width: '8.4%', height: '2.1%', orientation: 'horizontal' },
  { left: '45.8%', top: '64.8%', width: '8.4%', height: '2.1%', orientation: 'horizontal' },
];

const SHARED_WALLS = [
  { left: '32.8%', top: '8.6%', width: '1.2%', height: '56.2%' },
  { left: '60.5%', top: '8.6%', width: '1.2%', height: '56.2%' },
  { left: '5.8%', top: '35.6%', width: '82.8%', height: '1.2%' },
];

const WINDOWS = [
  { left: '13%', top: '7.2%', width: 84, glow: '#f3d19c' },
  { left: '43%', top: '7.2%', width: 84, glow: '#fcd34d' },
  { left: '73%', top: '7.2%', width: 84, glow: '#f9a8d4' },
  { left: '13%', top: '82.2%', width: 84, glow: '#86efac' },
  { left: '43%', top: '82.2%', width: 84, glow: '#d9b98a' },
  { left: '73%', top: '82.2%', width: 84, glow: '#99f6e4' },
];

const LABELS = [
  { left: '5.8%', top: '5.4%', width: 92, label: 'VARANDA', accent: '#f3d19c' },
  { left: '83.2%', top: '5.4%', width: 122, label: 'HALL SUPERIOR', accent: '#f3d19c' },
  { left: '43.8%', top: '90.2%', width: 150, label: 'SALA COMUM', accent: '#f0ab7b' },
];

const MEETING_CHAIRS = [
  { left: '18%', top: '20%' },
  { left: '50%', top: '12%' },
  { left: '82%', top: '20%' },
  { left: '16%', top: '80%' },
  { left: '50%', top: '87%' },
  { left: '84%', top: '80%' },
];

const HOUSE_ANIM = `
@keyframes house-window-glow {
  0%, 100% { opacity: 0.55; transform: scaleX(1); }
  50% { opacity: 0.95; transform: scaleX(1.03); }
}
@keyframes house-fire-flicker {
  0%, 100% { opacity: 0.7; transform: translateX(-50%) scale(1); }
  35% { opacity: 1; transform: translateX(-50%) scale(1.08); }
  70% { opacity: 0.8; transform: translateX(-50%) scale(0.98); }
}
@keyframes house-room-warmth {
  0%, 100% { opacity: 0.12; }
  50% { opacity: 0.26; }
}
@keyframes house-focus-pulse {
  0%, 100% { opacity: 0.38; transform: scale(1); }
  50% { opacity: 0.72; transform: scale(1.04); }
}
@keyframes house-path-flow {
  0% { background-position: 0 0; }
  100% { background-position: 18px 0; }
}
`;

function percentToStage(area, point) {
  return {
    x: parseFloat(area.left) / 100 * MAP_W + (parseFloat(area.width) / 100 * MAP_W) * (point.x / 100),
    y: parseFloat(area.top) / 100 * MAP_H + (parseFloat(area.height) / 100 * MAP_H) * (point.y / 100),
  };
}

function roomAnchor(roomKey) {
  if (roomKey === 'Hall') return { x: 50, y: 54 };
  if (roomKey === 'Engineering') return { x: 92, y: 50 };
  if (roomKey === 'Quality') return { x: 8, y: 50 };
  if (roomKey === 'People Ops') return { x: 8, y: 50 };
  if (roomKey === 'Operations') return { x: 92, y: 50 };
  if (roomKey === 'Communications') return { x: 50, y: 8 };
  if (roomKey === 'Flex') return { x: 8, y: 50 };
  return { x: 50, y: 10 };
}

function getMeetingLine(agent, isLead) {
  if (isLead) return 'alinhando equipe';
  const role = String(agent.role || '').toLowerCase();
  const task = String(agent.current_task || agent.task || '').toLowerCase();

  if (role.includes('qa') || task.includes('valid')) return 'trouxe validacao';
  if (role.includes('comunic') || task.includes('release')) return 'passa status';
  if (role.includes('people') || role.includes('rh')) return 'organiza equipe';
  if (role.includes('operation') || task.includes('deploy')) return 'revisa operacao';
  if (role.includes('implement') || task.includes('codigo') || task.includes('bug')) return 'reporta progresso';
  if (agent.status === 'blocked') return 'trouxe bloqueio';
  if (agent.status === 'waiting_review') return 'pede revisao';
  return 'acompanha mesa';
}

function shortSignalText(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > 24 ? `${clean.slice(0, 23)}...` : clean;
}

function hasVisibleWork(agent) {
  const currentWork = agent.current_task || agent.task || agent.summary;
  if (!currentWork) return false;
  return ['running', 'waiting_review', 'blocked'].includes(agent.status);
}

function formatCooldown(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds || 0)));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min <= 0) return `${sec}s`;
  return `${min}m ${String(sec).padStart(2, '0')}s`;
}

function relatedAgentIds(event, agents) {
  const haystack = `${event.title || ''} ${event.details || ''} ${event.meta || ''}`.toLowerCase();
  return agents
    .filter((agent) => agent.id !== event.agentId)
    .filter((agent) => {
      const idHit = haystack.includes(String(agent.id).toLowerCase());
      const nameHit = haystack.includes(getAgentDisplayName(agent).toLowerCase());
      return idHit || nameHit;
    })
    .map((agent) => agent.id);
}

function RoomShell({ roomKey, agentsInRoom, taskSummary, children }) {
  const room = ROOM_STYLES[roomKey];
  const agents = agentsInRoom || [];
  const summary = taskSummary || { active: 0, queued: 0 };
  const activeCount = agents.filter((agent) => agent.status === 'running').length;
  const blockedCount = agents.filter((agent) => agent.status === 'blocked').length;
  const reviewCount = agents.filter((agent) => agent.status === 'waiting_review').length;
  const roomState = blockedCount > 0 ? 'alert' : activeCount > 0 ? 'live' : reviewCount > 0 ? 'review' : 'idle';
  const stateColor = roomState === 'alert'
    ? '#ef4444'
    : roomState === 'live'
      ? room.color
      : roomState === 'review'
        ? '#f59e0b'
        : '#a78b6d';
  const stateLabel = roomState === 'alert'
    ? 'PRESSAO'
    : roomState === 'live'
      ? 'ATIVO'
      : roomState === 'review'
        ? 'REVISAO'
        : 'CALMO';
  const roomMood = roomKey === 'Communications' || roomKey === 'People Ops'
    ? { glow: 'rgba(243,209,156,0.08)', corner: 'rgba(245,158,11,0.05)', beam: 'rgba(243,209,156,0.05)' }
    : roomKey === 'Engineering' || roomKey === 'Quality' || roomKey === 'Operations'
      ? { glow: 'rgba(243,209,156,0.05)', corner: 'rgba(167,139,109,0.04)', beam: 'rgba(123,102,82,0.06)' }
      : roomKey === 'Flex'
        ? { glow: 'rgba(243,209,156,0.05)', corner: 'rgba(167,139,109,0.04)', beam: 'rgba(123,102,82,0.06)' }
        : { glow: 'rgba(243,209,156,0.05)', corner: 'rgba(243,209,156,0.04)', beam: 'rgba(123,102,82,0.06)' };

  return (
    <div style={{
      position: 'absolute',
      ...room.area,
      borderRadius: 14,
      background: room.floor,
      border: `6px solid ${HOUSE_PALETTE.wallInner}`,
      boxShadow: `0 0 0 2px ${HOUSE_PALETTE.wallShade}, inset 0 0 0 1px rgba(255,255,255,0.08), inset 0 -22px 28px rgba(24,15,9,0.12)`,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 10,
        background: 'linear-gradient(180deg, rgba(123,102,82,0.12), transparent)',
        opacity: 0.26,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 12,
        background: 'linear-gradient(180deg, transparent, rgba(33,21,12,0.26))',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${roomMood.beam} 0%, transparent 32%)`,
        pointerEvents: 'none',
        animation: roomState === 'idle' ? 'none' : 'house-room-warmth 3s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        left: '50%',
        top: '18%',
        width: '56%',
        height: '30%',
        transform: 'translateX(-50%)',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${roomMood.glow} 0%, transparent 72%)`,
        filter: 'blur(10px)',
        pointerEvents: 'none',
        opacity: roomState === 'idle' ? 0.22 : 0.42,
      }} />
      <div style={{
        position: 'absolute',
        left: '8%',
        top: '10%',
        width: '22%',
        height: '16%',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${roomMood.corner} 0%, transparent 72%)`,
        filter: 'blur(7px)',
        pointerEvents: 'none',
        opacity: 0.42,
      }} />
      <div style={{
        position: 'absolute',
        right: '8%',
        bottom: '12%',
        width: '24%',
        height: '18%',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${roomMood.corner} 0%, transparent 72%)`,
        filter: 'blur(7px)',
        pointerEvents: 'none',
        opacity: 0.3,
      }} />
      <div style={{
        position: 'absolute',
        inset: 8,
        borderRadius: 8,
        border: '1px solid rgba(243,209,156,0.06)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: 8,
        right: 8,
        top: 18,
        height: 8,
        borderRadius: 6,
        background: 'linear-gradient(180deg, rgba(146,106,68,0.22) 0%, rgba(103,72,44,0.08) 100%)',
        border: '1px solid rgba(243,209,156,0.04)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: 8,
        right: 8,
        bottom: 16,
        height: 6,
        borderRadius: 6,
        background: 'linear-gradient(180deg, rgba(83,57,35,0.18) 0%, rgba(47,31,18,0.08) 100%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 1,
        background: 'rgba(123,102,82,0.08)',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
      }} />
      {[
        { left: 8, top: 8 },
        { right: 8, top: 8 },
        { left: 8, bottom: 8 },
        { right: 8, bottom: 8 },
      ].map((corner, index) => (
        <div
          key={`room-corner-${roomKey}-${index}`}
          style={{
            position: 'absolute',
            width: 10,
            height: 10,
            borderRadius: 3,
            background: 'linear-gradient(180deg, rgba(107,72,43,0.72) 0%, rgba(74,49,29,0.72) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: '0 3px 6px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
            ...corner,
          }}
        />
      ))}

      <div style={{
        position: 'absolute',
        top: 10,
        left: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 10px',
        borderRadius: 10,
        background: 'linear-gradient(180deg, rgba(63,42,25,0.92) 0%, rgba(39,26,15,0.92) 100%)',
        border: '1px solid rgba(243,209,156,0.14)',
        boxShadow: '0 6px 12px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.08)',
        zIndex: 4,
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: room.color,
          boxShadow: `0 0 6px ${room.color}`,
        }} />
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.6, letterSpacing: '0.14em', color: '#f2d9b2', textShadow: `0 0 8px ${room.color}22` }}>
          {room.label}
        </span>
      </div>

      <div style={{
        position: 'absolute',
        top: 10,
        right: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 9px',
        borderRadius: 10,
        background: 'linear-gradient(180deg, rgba(58,38,23,0.88) 0%, rgba(35,23,14,0.88) 100%)',
        border: '1px solid rgba(243,209,156,0.1)',
        boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
        zIndex: 4,
      }}>
        <span style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: 5.1,
          letterSpacing: '0.08em',
          color: stateColor,
          background: 'rgba(123,102,82,0.12)',
          border: `1px solid ${stateColor}20`,
          borderRadius: 999,
          padding: '1px 4px',
        }}>
          {stateLabel}
        </span>
      </div>

      {summary.active > 0 && (
        <div style={{
          position: 'absolute',
          top: 38,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderRadius: 9,
          background: 'linear-gradient(180deg, rgba(58,38,23,0.8) 0%, rgba(35,23,14,0.8) 100%)',
          border: '1px solid rgba(243,209,156,0.08)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
          zIndex: 4,
        }}>
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 4.7,
            color: '#f3d19c',
            letterSpacing: '0.08em',
          }}>
            EM FOCO
          </span>
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 5.1,
            color: '#fde68a',
          }}>
            {summary.active}
          </span>
          {summary.queued > 0 && (
            <span style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 4.5,
              color: '#c8aa82',
            }}>
              +{summary.queued} fila
            </span>
          )}
        </div>
      )}

      <div style={{
        position: 'absolute',
        left: 12,
        bottom: 10,
        display: 'flex',
        gap: 6,
        zIndex: 4,
      }}>
        {[
          { label: 'ATV', value: activeCount, color: '#e6c38b' },
          { label: 'REV', value: reviewCount, color: '#f59e0b' },
          { label: 'BLQ', value: blockedCount, color: '#ef4444' },
        ].map((metric) => (
          <div key={metric.label} style={{
            minWidth: 34,
            padding: '3px 5px',
            borderRadius: 9,
            background: 'linear-gradient(180deg, rgba(58,38,23,0.82) 0%, rgba(35,23,14,0.82) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
          }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.4, color: '#c8aa82', letterSpacing: '0.12em' }}>
              {metric.label}
            </div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.4, color: metric.value > 0 ? metric.color : '#d3c1a4' }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {children}
    </div>
  );
}

function Fixture({ kind, left, top, width, height }) {
  const baseStyles = {
    position: 'absolute',
    left,
    top,
    width,
    height,
    borderRadius: kind === 'plant' || kind === 'hearth' ? '999px' : 10,
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 18px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  };

  const variants = {
    desk: { background: 'linear-gradient(180deg, #7a4a27 0%, #61381c 100%)' },
    bench: { background: 'linear-gradient(180deg, #927249 0%, #715637 100%)' },
    table: { background: 'linear-gradient(180deg, #8d6337 0%, #6d4b2a 100%)' },
    sofa: { background: 'linear-gradient(180deg, #7a523d 0%, #5b3928 100%)' },
    console: { background: 'linear-gradient(180deg, #6b7480 0%, #4d5660 100%)' },
    rack: { background: 'linear-gradient(180deg, #5f6752 0%, #454c3c 100%)' },
    workbench: { background: 'linear-gradient(180deg, #78613f 0%, #5f4b31 100%)' },
    bookshelf: { background: 'linear-gradient(180deg, #6d4222 0%, #583319 100%)' },
    armchair: { background: 'linear-gradient(180deg, #78678a 0%, #5b4d68 100%)' },
    bed: { background: 'linear-gradient(180deg, #91a59d 0%, #73857d 100%)' },
    hearth: { background: 'radial-gradient(circle at 50% 45%, #f59e0b 0%, #92400e 72%)' },
    plant: { background: 'radial-gradient(circle at 50% 40%, #63b16b 0%, #2f5a36 76%)' },
    cabinet: { background: 'linear-gradient(180deg, #74614f 0%, #5b4939 100%)' },
    tea: { background: 'linear-gradient(180deg, #9b7445 0%, #7a5833 100%)' },
    crate: { background: 'linear-gradient(180deg, #7d5630 0%, #62411f 100%)' },
    trunk: { background: 'linear-gradient(180deg, #886748 0%, #6a4e35 100%)' },
    ledger: { background: 'linear-gradient(180deg, #bda57b 0%, #9a8058 100%)' },
    frame: { background: 'linear-gradient(180deg, #7d5d43 0%, #61452f 100%)' },
    paper: { background: 'linear-gradient(180deg, #d9ccb3 0%, #bcab86 100%)' },
    stack: { background: 'linear-gradient(180deg, #8d6337 0%, #6f4c2a 100%)' },
    toolrack: { background: 'linear-gradient(180deg, #70563f 0%, #56412f 100%)' },
    pipe: { background: 'linear-gradient(180deg, #6b727c 0%, #50565e 100%)' },
  };

  return (
    <div style={{ ...baseStyles, ...(variants[kind] || variants.table) }}>
      {['desk', 'bench', 'table', 'workbench', 'bookshelf', 'cabinet', 'console', 'rack', 'bed', 'sofa', 'armchair'].includes(kind) && (
        <div style={{
          position: 'absolute',
          left: '6%',
          right: '6%',
          bottom: 2,
          height: 4,
          borderRadius: 999,
          background: 'rgba(26,14,8,0.16)',
          filter: 'blur(1px)',
          pointerEvents: 'none',
        }} />
      )}
      {(kind === 'desk' || kind === 'console' || kind === 'workbench') && (
        <div style={{
          position: 'absolute',
          left: '12%',
          top: '18%',
          width: '28%',
          height: '26%',
          borderRadius: 4,
          background: kind === 'console'
            ? 'linear-gradient(180deg, rgba(134,239,172,0.42) 0%, rgba(34,197,94,0.08) 100%)'
            : 'linear-gradient(180deg, rgba(147,197,253,0.42) 0%, rgba(59,130,246,0.08) 100%)',
            border: '1px solid rgba(255,255,255,0.12)',
            animation: 'house-window-glow 2.7s steps(2) infinite',
        }} />
      )}
      {['desk', 'bench', 'table', 'workbench'].includes(kind) && (
        <>
          <div style={{
            position: 'absolute',
            left: '8%',
            right: '8%',
            top: '14%',
            height: 4,
            borderRadius: 999,
            background: 'rgba(123,102,82,0.16)',
            opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute',
            left: '14%',
            bottom: '-2%',
            width: 4,
            height: '24%',
            borderRadius: 3,
            background: 'rgba(53,31,18,0.44)',
          }} />
          <div style={{
            position: 'absolute',
            right: '14%',
            bottom: '-2%',
            width: 4,
            height: '24%',
            borderRadius: 3,
            background: 'rgba(53,31,18,0.44)',
          }} />
        </>
      )}
      {kind === 'bookshelf' && (
        <>
          {[20, 44, 68].map((shelf) => (
            <div key={shelf} style={{
              position: 'absolute',
              left: '10%',
              right: '10%',
              top: `${shelf}%`,
              height: 4,
              background: 'rgba(39,24,15,0.55)',
            }} />
          ))}
          {[
            { left: '18%', top: '11%', color: '#c49a6c' },
            { left: '35%', top: '11%', color: '#8ea9a4' },
            { left: '57%', top: '11%', color: '#b89198' },
            { left: '24%', top: '35%', color: '#d3c1a4' },
            { left: '49%', top: '35%', color: '#a78b6d' },
            { left: '19%', top: '59%', color: '#8d9fb8' },
            { left: '42%', top: '59%', color: '#c48b55' },
            { left: '62%', top: '59%', color: '#86efac' },
          ].map((book, index) => (
            <div
              key={`book-${index}`}
              style={{
                position: 'absolute',
                left: book.left,
                top: book.top,
                width: 6,
                height: 10,
                borderRadius: 2,
                background: book.color,
                opacity: 0.72,
              }}
            />
          ))}
        </>
      )}
      {kind === 'rack' && (
        [18, 36, 54, 72].map((slot) => (
          <div key={slot} style={{
            position: 'absolute',
            left: `${slot}%`,
            top: '26%',
            width: 4,
            height: '48%',
            borderRadius: 999,
            background: '#86efac',
            opacity: 0.4,
            animation: 'house-window-glow 2.2s ease-in-out infinite',
          }} />
        ))
      )}
      {kind === 'hearth' && (
        <>
          <div style={{
            position: 'absolute',
            inset: '8%',
            borderRadius: 'inherit',
            border: '2px solid rgba(93,55,23,0.45)',
          }} />
          <div style={{
            position: 'absolute',
            inset: '22%',
            borderRadius: 'inherit',
            background: 'radial-gradient(circle at 50% 55%, rgba(254,240,138,0.92) 0%, rgba(245,158,11,0.48) 42%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '-12%',
            width: '56%',
            height: '34%',
            transform: 'translateX(-50%)',
            borderRadius: 999,
            background: 'rgba(253,224,71,0.18)',
            filter: 'blur(10px)',
            animation: 'house-fire-flicker 2.4s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute',
            left: '24%',
            right: '24%',
            bottom: '8%',
            height: 6,
            borderRadius: 999,
            background: 'rgba(67,36,16,0.38)',
          }} />
        </>
      )}
      {kind === 'plant' && (
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: '-10%',
          transform: 'translateX(-50%)',
          width: '42%',
          height: '18%',
          borderRadius: 999,
          background: 'linear-gradient(180deg, #774728 0%, #4f2d15 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
        }} />
      )}
      {kind === 'cabinet' && (
        <>
          <div style={{ position: 'absolute', inset: '12%', borderRadius: 8, border: '1px solid rgba(34,24,16,0.35)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '18%', width: 3, height: '64%', transform: 'translateX(-50%)', background: 'rgba(34,24,16,0.22)' }} />
          <div style={{ position: 'absolute', left: '26%', top: '38%', width: 4, height: 4, borderRadius: 999, background: '#d5c5a4' }} />
          <div style={{ position: 'absolute', right: '26%', top: '38%', width: 4, height: 4, borderRadius: 999, background: '#d5c5a4' }} />
        </>
      )}
      {kind === 'tea' && (
        <>
          <div style={{ position: 'absolute', left: '22%', right: '22%', top: '20%', bottom: '28%', borderRadius: 999, background: 'rgba(123,102,82,0.2)' }} />
          <div style={{ position: 'absolute', left: '40%', top: '12%', width: '20%', height: '18%', borderRadius: 999, background: '#7b6652' }} />
          <div style={{ position: 'absolute', left: '47%', top: '6%', width: 2, height: '10%', background: 'rgba(243,209,156,0.1)', opacity: 0.65 }} />
          <div style={{ position: 'absolute', left: '56%', top: '28%', width: '12%', height: '16%', borderRadius: 999, border: '2px solid rgba(243,209,156,0.18)' }} />
        </>
      )}
      {kind === 'crate' && (
        <>
          <div style={{ position: 'absolute', left: '12%', right: '12%', top: '18%', height: 3, background: 'rgba(39,24,15,0.38)' }} />
          <div style={{ position: 'absolute', left: '12%', right: '12%', bottom: '18%', height: 3, background: 'rgba(39,24,15,0.38)' }} />
          <div style={{ position: 'absolute', left: '48%', top: '14%', bottom: '14%', width: 3, background: 'rgba(39,24,15,0.34)' }} />
        </>
      )}
      {kind === 'trunk' && (
        <>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '42%', height: 3, background: 'rgba(39,24,15,0.34)' }} />
          <div style={{ position: 'absolute', left: '42%', top: '34%', width: 6, height: 6, borderRadius: 2, background: '#d8c59d' }} />
          <div style={{ position: 'absolute', left: '18%', top: '16%', width: '64%', height: 4, borderRadius: 999, background: 'rgba(123,102,82,0.16)' }} />
        </>
      )}
      {kind === 'ledger' && (
        <>
          <div style={{
            position: 'absolute',
            inset: '18%',
            borderRadius: 4,
            background: 'linear-gradient(180deg, #8c7358 0%, #6c563d 100%)',
            border: '1px solid rgba(77,55,31,0.22)',
          }} />
          <div style={{ position: 'absolute', left: '28%', top: '28%', right: '28%', height: 2, background: 'rgba(92,64,34,0.22)' }} />
          <div style={{ position: 'absolute', left: '28%', top: '42%', right: '34%', height: 2, background: 'rgba(92,64,34,0.18)' }} />
          <div style={{ position: 'absolute', left: '28%', top: '56%', right: '30%', height: 2, background: 'rgba(92,64,34,0.18)' }} />
        </>
      )}
      {kind === 'frame' && (
        <>
          <div style={{ position: 'absolute', inset: '12%', borderRadius: 4, border: '2px solid rgba(68,45,26,0.55)' }} />
          <div style={{ position: 'absolute', inset: '24%', borderRadius: 2, background: 'linear-gradient(180deg, #8b6d55 0%, #6b5140 100%)' }} />
          <div style={{ position: 'absolute', left: '38%', top: '34%', width: '24%', height: '22%', borderRadius: 999, background: 'rgba(187,145,152,0.42)' }} />
        </>
      )}
      {kind === 'paper' && (
        <>
          <div style={{ position: 'absolute', left: '18%', top: '18%', width: '44%', height: '54%', borderRadius: 2, background: '#8f7a63', transform: 'rotate(-6deg)' }} />
          <div style={{ position: 'absolute', left: '34%', top: '24%', width: '44%', height: '54%', borderRadius: 2, background: '#7b6652', transform: 'rotate(8deg)' }} />
          <div style={{ position: 'absolute', left: '28%', top: '34%', width: '20%', height: 2, background: 'rgba(92,64,34,0.18)', transform: 'rotate(-6deg)' }} />
          <div style={{ position: 'absolute', left: '45%', top: '46%', width: '18%', height: 2, background: 'rgba(92,64,34,0.16)', transform: 'rotate(8deg)' }} />
        </>
      )}
      {kind === 'stack' && (
        <>
          <div style={{ position: 'absolute', left: '16%', right: '20%', top: '18%', height: '18%', background: '#8d6337' }} />
          <div style={{ position: 'absolute', left: '24%', right: '14%', top: '40%', height: '18%', background: '#73512d' }} />
          <div style={{ position: 'absolute', left: '12%', right: '24%', top: '62%', height: '14%', background: '#a17745' }} />
          <div style={{ position: 'absolute', left: '20%', top: '16%', right: '22%', height: 2, background: 'rgba(123,102,82,0.16)' }} />
        </>
      )}
      {kind === 'toolrack' && (
        <>
          <div style={{ position: 'absolute', left: '12%', right: '12%', top: '20%', height: 3, background: 'rgba(37,24,16,0.42)' }} />
          {[24, 44, 64].map((leftPos) => (
            <div key={leftPos} style={{ position: 'absolute', left: `${leftPos}%`, top: '26%', width: 3, height: '42%', background: '#c7b089' }} />
          ))}
          {[22, 42, 62].map((leftPos) => (
            <div key={`hook-${leftPos}`} style={{ position: 'absolute', left: `${leftPos}%`, top: '24%', width: 7, height: 3, borderRadius: 999, background: 'rgba(53,31,18,0.42)' }} />
          ))}
        </>
      )}
      {kind === 'pipe' && (
        <>
          <div style={{ position: 'absolute', left: '48%', top: '10%', width: 4, height: '70%', background: '#646b74' }} />
          <div style={{ position: 'absolute', left: '24%', top: '26%', right: '24%', height: 4, background: '#737b86' }} />
          <div style={{ position: 'absolute', left: '43%', top: '20%', width: 14, height: 14, borderRadius: '50%', border: '3px solid rgba(80,86,94,0.8)' }} />
        </>
      )}
      {(kind === 'desk' || kind === 'bench' || kind === 'table' || kind === 'workbench') && (
        <>
          <div style={{
            position: 'absolute',
            left: '8%',
            right: '8%',
            bottom: '10%',
            height: 3,
            background: 'rgba(35,22,14,0.18)',
          }} />
          <div style={{
            position: 'absolute',
            left: '14%',
            bottom: '-2%',
            width: 4,
            height: '24%',
            background: 'rgba(57,35,20,0.42)',
          }} />
          <div style={{
            position: 'absolute',
            right: '14%',
            bottom: '-2%',
            width: 4,
            height: '24%',
            background: 'rgba(57,35,20,0.42)',
          }} />
        </>
      )}
      <div style={{
        position: 'absolute',
        inset: 3,
        borderRadius: 'inherit',
        border: '1px dashed rgba(255,255,255,0.08)',
      }} />
    </div>
  );
}

function MeetingRoom({ agents, inMeeting, agentPositions, selectedAgentId, onSelectAgent, floating = false }) {
  const room = ROOM_STYLES.Meeting;
  const participants = useMemo(
    () => agents.filter((a) => inMeeting[a.id]).sort((a, b) => Number(isAgentCeo(b)) - Number(isAgentCeo(a))),
    [agents, inMeeting]
  );
  const [speakerIndex, setSpeakerIndex] = useState(0);
  const [meetingFeed, setMeetingFeed] = useState([]);
  const activeMeeting = participants.length > 0;
  const leader = participants.find((agent) => isAgentCeo(agent)) || participants[0] || null;

  useEffect(() => {
    if (!activeMeeting) {
      setSpeakerIndex(0);
      setMeetingFeed([]);
      return undefined;
    }

    const interval = setInterval(() => {
      setSpeakerIndex((prev) => (participants.length > 1 ? (prev + 1) % participants.length : 0));
    }, 2600);

    return () => clearInterval(interval);
  }, [activeMeeting, participants.length]);

  const rotatingSpeaker = participants.length > 1 ? participants[speakerIndex % participants.length] : null;
  const speakingIds = new Set(
    [leader?.id, rotatingSpeaker?.id].filter(Boolean)
  );

  useEffect(() => {
    if (!activeMeeting || participants.length === 0) return;
    const activeSpeaker = rotatingSpeaker || leader || participants[0];
    if (!activeSpeaker) return;

    const line = getMeetingLine(activeSpeaker, activeSpeaker.id === leader?.id);
    setMeetingFeed((prev) => {
      const nextEntry = {
        id: `${activeSpeaker.id}-${speakerIndex}-${line}`,
        agentId: activeSpeaker.id,
        name: getAgentDisplayName(activeSpeaker),
        line,
      };
      if (prev[0]?.id === nextEntry.id) return prev;
      return [nextEntry, ...prev].slice(0, 4);
    });
  }, [activeMeeting, participants, rotatingSpeaker, leader, speakerIndex]);

  return (
    <div style={{
      position: floating ? 'absolute' : 'absolute',
      ...(floating
        ? {
            right: 20,
            top: 74,
            width: 456,
            height: 438,
          }
        : room.area),
      borderRadius: floating ? 18 : 18,
      background: `
        linear-gradient(180deg, rgba(124,93,59,0.14) 0%, rgba(88,61,38,0.08) 100%),
        ${room.floor}
      `,
      border: `6px solid ${HOUSE_PALETTE.wallInner}`,
      boxShadow: `0 0 0 2px ${HOUSE_PALETTE.wallShade}, inset 0 1px 0 rgba(255,255,255,0.08)`,
      overflow: 'hidden',
      zIndex: floating ? 44 : 'auto',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(123,102,82,0.1), transparent 24%)',
      }} />
      {activeMeeting && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 54%, rgba(245,158,11,0.1) 0%, rgba(251,191,36,0.05) 30%, transparent 68%)',
          pointerEvents: 'none',
          animation: 'house-room-warmth 2.6s ease-in-out infinite',
        }} />
      )}

      <div style={{
        position: 'absolute',
        left: '50%',
        top: 16,
        transform: 'translateX(-50%)',
        width: floating ? 170 : 168,
        height: 24,
        borderRadius: 999,
        background: 'linear-gradient(180deg, rgba(87,56,31,0.96) 0%, rgba(60,38,21,0.96) 100%)',
        border: '1px solid rgba(243,209,156,0.25)',
        boxShadow: '0 6px 12px rgba(0,0,0,0.16)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.7, letterSpacing: '0.12em', color: '#f3d19c' }}>
          {room.label}
        </span>
      </div>

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: floating ? 366 : 540,
        height: floating ? 242 : 200,
        borderRadius: 22,
        background: 'linear-gradient(180deg, rgba(105,71,44,0.24) 0%, rgba(74,44,27,0.12) 100%)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: floating ? 286 : 396,
        height: floating ? 126 : 118,
        borderRadius: 18,
        background: 'linear-gradient(180deg, rgba(117,78,48,0.28) 0%, rgba(88,58,36,0.12) 100%)',
        border: '1px solid rgba(243,209,156,0.08)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: floating ? 324 : 460,
        height: floating ? 188 : 158,
        borderRadius: 24,
        background: 'linear-gradient(180deg, rgba(96,62,38,0.74) 0%, rgba(62,40,24,0.74) 100%)',
        border: '2px solid rgba(243,209,156,0.12)',
        boxShadow: '0 12px 20px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: floating ? 286 : 396,
        height: floating ? 144 : 118,
        borderRadius: 999,
        background: 'linear-gradient(180deg, #9d6d3d 0%, #7d522a 100%)',
        border: `4px solid ${HOUSE_PALETTE.woodDeep}`,
        boxShadow: '0 14px 22px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: -8,
          width: '84%',
          height: 14,
          transform: 'translateX(-50%)',
          borderRadius: 999,
          background: 'rgba(123,102,82,0.18)',
          filter: 'blur(6px)',
          opacity: 0.45,
        }} />
        <div style={{
          position: 'absolute',
          inset: 8,
          borderRadius: 999,
          background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 22px, rgba(0,0,0,0.08) 22px, rgba(0,0,0,0.08) 24px)',
        }} />
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 42,
          height: 42,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(253,224,71,0.26) 0%, rgba(243,209,156,0.12) 45%, transparent 72%)',
          border: '1px solid rgba(243,209,156,0.18)',
          boxShadow: '0 0 18px rgba(253,224,71,0.14)',
        }} />
      </div>

      {MEETING_CHAIRS.map((chair, index) => {
        const occupant = participants[index] || null;
        const occupied = !!occupant;
        const chairGlow = occupied ? (isAgentCeo(occupant) ? '#fbbf24' : '#f3d19c') : 'transparent';
        const speaking = occupant && speakingIds.has(occupant.id);
        return (
        <div key={index} style={{
          position: 'absolute',
          left: chair.left,
          top: chair.top,
          width: floating ? 30 : 26,
          height: floating ? 30 : 26,
          transform: 'translate(-50%, -50%)',
          borderRadius: 8,
          background: 'linear-gradient(180deg, #6b4a2d 0%, #52351e 100%)',
          border: `2px solid ${occupied ? chairGlow : HOUSE_PALETTE.woodDeep}`,
          boxShadow: occupied
            ? `0 0 ${speaking ? 20 : 12}px ${chairGlow}66, 0 6px 10px rgba(0,0,0,0.24)`
            : '0 6px 10px rgba(0,0,0,0.24)',
        }}>
          {occupied && (
            <div style={{
              position: 'absolute',
              inset: -4,
              borderRadius: 10,
              background: `radial-gradient(circle, ${chairGlow}22 0%, transparent 72%)`,
              opacity: speaking ? 1 : 0.62,
              animation: speaking ? 'house-focus-pulse 1.2s ease-in-out infinite' : 'none',
            }} />
          )}
          {occupied && (
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 10,
              height: 10,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: chairGlow,
              boxShadow: `0 0 10px ${chairGlow}`,
              opacity: speaking ? 1 : 0.9,
            }} />
          )}
        </div>
      )})}

      {activeMeeting && (
        <div style={{
          position: 'absolute',
          right: 16,
          bottom: 14,
          padding: '5px 8px',
          borderRadius: 8,
          background: 'rgba(54,35,20,0.82)',
          border: '1px solid rgba(245,158,11,0.26)',
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#fde68a', letterSpacing: '0.12em' }}>
            RODA ABERTA
          </span>
        </div>
      )}

      {leader && (
        <div style={{
          position: 'absolute',
          left: '50%',
          top: floating ? 56 : 54,
          transform: 'translateX(-50%)',
          padding: '4px 9px',
          borderRadius: 999,
          background: 'rgba(64,41,23,0.9)',
          border: '1px solid rgba(251,191,36,0.3)',
          boxShadow: '0 6px 12px rgba(0,0,0,0.18)',
          zIndex: 6,
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, letterSpacing: '0.1em', color: '#fbbf24' }}>
            {`${getAgentDisplayName(leader)} CONDUZ`}
          </span>
        </div>
      )}

      {participants.map((a) => {
        const pos = agentPositions.get(a.id) || { x: 50, y: 50 };
        const speaking = speakingIds.has(a.id);
        return (
          <AgentDot
            key={a.id}
            agent={a}
            inMeeting={true}
            selected={selectedAgentId === a.id}
            onSelect={onSelectAgent}
            meetingSpeech={speaking ? getMeetingLine(a, a.id === leader?.id) : ''}
            spotlight={speaking}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, isMoving: !!pos.isMoving }}
          />
        );
      })}

      {activeMeeting && meetingFeed.length > 0 && (
        <div style={{
          position: 'absolute',
          left: 18,
          right: 18,
          bottom: 18,
          display: 'grid',
          gap: 6,
          zIndex: 8,
          pointerEvents: 'none',
        }}>
          {meetingFeed.map((entry, index) => (
            <div
              key={entry.id}
              style={{
                alignSelf: index === 0 ? 'stretch' : 'center',
                justifySelf: index === 0 ? 'stretch' : 'center',
                maxWidth: index === 0 ? '100%' : '82%',
                padding: '6px 10px',
                borderRadius: 10,
                background: index === 0 ? 'rgba(53,34,22,0.9)' : 'rgba(53,34,22,0.68)',
                border: `1px solid ${index === 0 ? 'rgba(243,209,156,0.26)' : 'rgba(243,209,156,0.12)'}`,
                boxShadow: index === 0 ? '0 8px 14px rgba(0,0,0,0.16)' : 'none',
                opacity: index === 0 ? 1 : 0.72 - index * 0.12,
              }}
            >
              <div style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 4.9,
                color: '#f3d19c',
                letterSpacing: '0.08em',
                marginBottom: 2,
              }}>
                {entry.name}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.4,
                color: '#f5e6d3',
                lineHeight: 1.25,
              }}>
                {entry.line}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OfficeView({ agents, agentPositions, meeting, updateInMeeting, llmStatus, logs = [], tasks = [], taskStats = {}, selectedAgentId, commandSignal, onSelectAgent, onClearSelection }) {
  const { inMeeting, meetingCount, toggleMeeting } = meeting;
  const activeMeeting = meetingCount > 0;
  const recentMeetingEvent = useMemo(() => {
    const event = logs.find((entry) => ['meeting_started', 'meeting_ended', 'agent_joined_meeting', 'agent_returned_to_station'].includes(entry.type));
    if (!event) return null;
    const ageMs = Date.now() - new Date(event.time).getTime();
    if (ageMs > 2 * 60 * 1000) return null;
    if (event.type === 'meeting_started') {
      return { kind: 'active', label: 'MESA ACIONADA', text: event.title || 'A casa chamou a reuniao.' };
    }
    if (event.type === 'meeting_ended') {
      return { kind: 'idle', label: 'MESA ENCERRADA', text: event.title || 'A reuniao foi encerrada.' };
    }
    if (event.type === 'agent_joined_meeting') {
      return { kind: 'active', label: 'AGENTE NA MESA', text: event.title || 'Um agente acabou de chegar.' };
    }
    return { kind: 'idle', label: 'RETORNO AO POSTO', text: event.title || 'Um agente voltou ao posto.' };
  }, [logs]);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const viewportRef = useRef(null);
  const prevSelectedRef = useRef(null);
  const prevCommandAtRef = useRef(null);

  const collaborationStage = useMemo(() => {
    if (activeMeeting) return null;

    const freshest = logs.find((event) => {
      if (!['agent_mentioned', 'bug_reported', 'agent_blocked'].includes(event.type)) return false;
      if (!(event.time instanceof Date) || Number.isNaN(event.time.getTime())) return false;
      return Date.now() - event.time.getTime() <= 1000 * 45;
    });

    if (!freshest) return null;

    const participantIds = [freshest.agentId, ...relatedAgentIds(freshest, agents)]
      .filter((id, index, arr) => id && arr.indexOf(id) === index)
      .filter((id) => !inMeeting[id])
      .slice(0, 4);

    if (participantIds.length < 2) return null;

    const freshestTime = freshest.time.getTime();
    const hasNewerWorkEvent = logs.some((event) => {
      if (!(event.time instanceof Date) || Number.isNaN(event.time.getTime())) return false;
      if (event.time.getTime() <= freshestTime) return false;
      if (!['task_started', 'task_completed', 'agent_decision'].includes(event.type)) return false;
      return participantIds.includes(event.agentId);
    });

    if (hasNewerWorkEvent) return null;

    const hallSlots = [
      { x: 43, y: 74 },
      { x: 50, y: 72 },
      { x: 57, y: 74 },
      { x: 47, y: 79 },
      { x: 53, y: 79 },
    ];

    const stagedPositions = new Map();
    participantIds.forEach((id, index) => {
      const slot = hallSlots[index % hallSlots.length];
      stagedPositions.set(id, {
        x: slot.x,
        y: slot.y,
        isMoving: false,
        facing: index % 2 === 0 ? 'right' : 'left',
      });
    });

    return {
      event: freshest,
      participantIds,
      stagedPositions,
      center: { x: 50, y: 76 },
      tone: freshest.type === 'bug_reported' ? '#ef4444' : '#f3d19c',
    };
  }, [activeMeeting, logs, agents, inMeeting]);

  const effectivePositions = useMemo(() => {
    const next = new Map(agentPositions);
    if (!collaborationStage) return next;
    collaborationStage.stagedPositions.forEach((pos, id) => {
      next.set(id, pos);
    });
    return next;
  }, [agentPositions, collaborationStage]);

  useEffect(() => { updateInMeeting(inMeeting); }, [inMeeting, updateInMeeting]);

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || null;
  const selectedRoomKey = selectedAgent
    ? (inMeeting[selectedAgent.id] ? 'Meeting' : (collaborationStage?.participantIds?.includes(selectedAgent.id) ? 'Hall' : selectedAgent.zone))
    : null;
  const selectedRoom = selectedRoomKey && selectedRoomKey !== 'Meeting' ? ROOM_STYLES[selectedRoomKey] : null;
  const selectedPos = selectedAgentId ? effectivePositions.get(selectedAgentId) : null;

  const selectedStagePoint = selectedRoom && selectedPos
    ? (
      selectedRoomKey === 'Hall'
        ? { x: (selectedPos.x / 100) * MAP_W, y: (selectedPos.y / 100) * MAP_H }
        : percentToStage(selectedRoom.area, { x: selectedPos.x, y: selectedPos.y })
    )
    : null;
  const selectedAnchorPoint = selectedRoom
    ? (
      selectedRoomKey === 'Hall'
        ? { x: MAP_W * 0.5, y: MAP_H * 0.77 }
        : percentToStage(selectedRoom.area, roomAnchor(selectedRoomKey))
    )
    : null;
  const selectedTrail = selectedStagePoint && selectedAnchorPoint
    ? (() => {
        const dx = selectedStagePoint.x - selectedAnchorPoint.x;
        const dy = selectedStagePoint.y - selectedAnchorPoint.y;
        const length = Math.max(Math.hypot(dx, dy), 12);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return {
          left: selectedAnchorPoint.x,
          top: selectedAnchorPoint.y,
          width: length,
          angle,
        };
      })()
    : null;
  const selectedCard = selectedAgent && selectedStagePoint
    ? {
        left: Math.min(Math.max(selectedStagePoint.x + 26, 110), MAP_W - 270),
        top: Math.min(Math.max(selectedStagePoint.y - 76, 90), MAP_H - 140),
      }
    : null;
  const selectedMeetingSeat = selectedRoomKey === 'Meeting' && selectedPos
    ? MEETING_CHAIRS.reduce((closest, chair) => {
        const cx = parseFloat(chair.left);
        const cy = parseFloat(chair.top);
        const dist = Math.hypot(cx - selectedPos.x, cy - selectedPos.y);
        return !closest || dist < closest.dist ? { ...chair, dist } : closest;
      }, null)
    : null;
  const nowMs = Date.now();
  const activeCommandSignal = commandSignal && nowMs - commandSignal.at < 90000 ? commandSignal : null;
  const commandSignalPos = activeCommandSignal
    ? (effectivePositions.get(activeCommandSignal.agentId) || agentPositions.get(activeCommandSignal.agentId))
    : null;
  const recentFallback = llmStatus?.last_fallback
    ? (() => {
        const ageMs = nowMs - new Date(llmStatus.last_fallback.at).getTime();
        return ageMs < 10 * 60 * 1000 ? { ...llmStatus.last_fallback, ageMs } : null;
      })()
    : null;
  const cooldownSeconds = llmStatus?.primary_llm ? (llmStatus?.rate_limited?.[llmStatus.primary_llm]?.cooldown_seconds || 0) : 0;
  const isCoolingDown = cooldownSeconds > 0;
  const fallbackMinutes = recentFallback ? Math.max(1, Math.round(recentFallback.ageMs / 60000)) : null;
  const roomTaskSummary = useMemo(() => {
    const summary = {
      Engineering: { active: 0, queued: 0 },
      Quality: { active: 0, queued: 0 },
      'People Ops': { active: 0, queued: 0 },
      Operations: { active: 0, queued: 0 },
      Communications: { active: 0, queued: 0 },
      Flex: { active: 0, queued: 0 },
      Hall: { active: 0, queued: 0 },
    };

    tasks.forEach((task) => {
      const status = String(task.status || '').toLowerCase();
      const assignedAgent = agents.find((agent) => agent.id === task.assigned_to);
      const roomKey = assignedAgent?.zone || 'Hall';
      if (!summary[roomKey]) summary[roomKey] = { active: 0, queued: 0 };

      if (status === 'in_progress') summary[roomKey].active += 1;
      else if (status === 'todo') summary[roomKey].queued += 1;
    });

    return summary;
  }, [tasks, agents]);
  const idleAgentsCount = useMemo(
    () => agents.filter((agent) => !inMeeting[agent.id] && agent.zone === 'Hall').length,
    [agents, inMeeting]
  );
  const pendingTaskCount = Number(taskStats?.pending || 0);

  useEffect(() => {
    if (!selectedAgentId) {
      prevSelectedRef.current = null;
      return;
    }

    if (prevSelectedRef.current === selectedAgentId) return;

    const pos = effectivePositions.get(selectedAgentId);
    if (!pos) return;

    const nextScale = Math.max(scale, 1.08);
    const pointX = (pos.x / 100) * MAP_W;
    const pointY = (pos.y / 100) * MAP_H;

    setScale(nextScale);
    setPan({
      x: -((pointX - MAP_W / 2) * nextScale),
      y: -((pointY - MAP_H / 2) * nextScale),
    });
    prevSelectedRef.current = selectedAgentId;
  }, [selectedAgentId, effectivePositions, scale]);

  useEffect(() => {
    if (!activeCommandSignal?.agentId || !commandSignalPos) return;
    if (prevCommandAtRef.current === activeCommandSignal.at) return;

    const nextScale = Math.max(scale, 1.18);
    const pointX = (commandSignalPos.x / 100) * MAP_W;
    const pointY = (commandSignalPos.y / 100) * MAP_H;

    setScale(nextScale);
    setPan({
      x: -((pointX - MAP_W / 2) * nextScale),
      y: -((pointY - MAP_H / 2) * nextScale),
    });
    prevCommandAtRef.current = activeCommandSignal.at;
  }, [activeCommandSignal, commandSignalPos, scale]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;

    setScale((prevScale) => {
      const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prevScale * delta));
      if (nextScale === prevScale) return prevScale;

      setPan((prevPan) => {
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;
        const worldX = (cursorX - prevPan.x) / prevScale;
        const worldY = (cursorY - prevPan.y) / prevScale;
        return {
          x: cursorX - worldX * nextScale,
          y: cursorY - worldY * nextScale,
        };
      });

      return nextScale;
    });
  }, []);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPan: pan };
    setDragging(true);
  }, [pan]);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

  const onContextMenu = useCallback((e) => {
    e.preventDefault();
    setPan({ x: 0, y: 0 });
    setScale(DEFAULT_SCALE);
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return undefined;
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  useEffect(() => {
    if (!dragging) return undefined;

    const handleMouseMove = (e) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPan({
        x: dragRef.current.startPan.x + dx,
        y: dragRef.current.startPan.y + dy,
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      setDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging]);

  const viewportStyle = {
    width: '100%',
    height: `calc(100vh - ${TOOLBAR_H}px)`,
    overflow: 'hidden',
    position: 'relative',
    background: `
      repeating-linear-gradient(0deg, transparent, transparent 14px, rgba(60, 100, 140, 0.05) 14px, rgba(60, 100, 140, 0.05) 15px),
      repeating-linear-gradient(90deg, transparent, transparent 14px, rgba(60, 100, 140, 0.05) 14px, rgba(60, 100, 140, 0.05) 15px),
      linear-gradient(180deg, #b0cfe0 0%, #c8dce8 50%, #b8d4e0 100%)
    `,
    cursor: dragging ? 'grabbing' : 'grab',
  };

  const stageStyle = {
    position: 'absolute',
    top: '50%',
    left: activeMeeting ? '39%' : '50%',
    width: MAP_W,
    height: MAP_H,
    transformOrigin: 'center center',
    transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
    willChange: 'transform',
  };

  const roomAgents = Object.keys(ROOM_FIXTURES).reduce((acc, roomKey) => {
    acc[roomKey] = agents.filter((agent) => !inMeeting[agent.id] && agent.zone === roomKey && !collaborationStage?.participantIds?.includes(agent.id));
    return acc;
  }, {});
  const hallAgents = agents.filter((agent) => !inMeeting[agent.id] && (agent.zone === 'Hall' || collaborationStage?.participantIds?.includes(agent.id)));
  const collaborationTrails = useMemo(() => {
    if (!collaborationStage) return [];
    return collaborationStage.participantIds
      .map((id, index) => {
        const from = agentPositions.get(id);
        const to = collaborationStage.stagedPositions.get(id);
        if (!from || !to) return null;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4) return null;
        return {
          id,
          left: from.x,
          top: from.y,
          width: dist,
          angle: Math.atan2(dy, dx) * (180 / Math.PI),
          delay: index * 0.12,
        };
      })
      .filter(Boolean);
  }, [agentPositions, collaborationStage]);
  const recentWorkSignals = useMemo(() => {
    const next = new Map();
    logs.forEach((event) => {
      if (!['task_started', 'task_completed', 'agent_decision'].includes(event.type)) return;
      const ageMs = nowMs - event.time.getTime();
      if (ageMs > 70000) return;
      if (!next.has(event.agentId)) {
        next.set(event.agentId, {
          ageMs,
          kind: event.type === 'task_completed' ? 'OK' : event.type === 'task_started' ? 'FOCO' : 'RET',
        });
      }
    });
    return next;
  }, [logs, nowMs]);
  const signalEvents = logs
    .filter((event) => nowMs - event.time.getTime() < 90000)
    .filter((event) => ['agent_mentioned', 'agent_decision', 'bug_reported', 'agent_blocked'].includes(event.type))
    .slice(0, 2);
  const roomSignals = signalEvents
    .map((event, index) => {
      const pos = agentPositions.get(event.agentId);
      const displayPos = effectivePositions.get(event.agentId) || pos;
      if (!displayPos) return null;
      const ageMs = nowMs - event.time.getTime();
      const ageRatio = Math.min(1, ageMs / 90000);
      const anchorX = Math.min(91, Math.max(9, displayPos.x + (displayPos.x > 74 ? -4.5 : displayPos.x < 26 ? 4.5 : 0)));
      const anchorY = Math.min(88, Math.max(11, displayPos.y - 5.8 - (index % 2) * 2.4));
      return {
        id: event.id,
        x: anchorX,
        y: anchorY,
        text: shortSignalText(event.title),
        kind: event.type === 'bug_reported'
          ? 'BUG'
          : event.type === 'agent_mentioned'
            ? 'AJUDA'
            : event.type === 'agent_blocked'
              ? 'BLQ'
              : 'DEC',
        tone: event.type === 'bug_reported'
          ? '#ef4444'
          : event.type === 'agent_mentioned'
            ? '#f3d19c'
            : event.type === 'agent_blocked'
              ? '#f59e0b'
              : '#86efac',
        opacity: 1 - ageRatio * 0.45,
        stemHeight: 8 - ageRatio * 2,
      };
    })
    .filter(Boolean);
  const commandRoomKey = activeCommandSignal
    ? (
      activeCommandSignal.action && /ajuda|colabora|colabor|reuniao|meeting/i.test(activeCommandSignal.action)
        ? 'Hall'
        : (agents.find((agent) => agent.id === activeCommandSignal.agentId)?.zone || null)
    )
    : null;
  const commandRoom = commandRoomKey ? ROOM_STYLES[commandRoomKey] : null;

  return (
    <div
      ref={viewportRef}
      style={viewportStyle}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onContextMenu={onContextMenu}
      onClick={onClearSelection}
    >
      <div style={stageStyle}>
        <div style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}>
          <style>{HOUSE_ANIM}</style>

          <div style={{
            position: 'absolute',
            inset: 24,
            borderRadius: 44,
            background: `
              radial-gradient(circle at 50% 0%, rgba(243,209,156,0.08), transparent 24%),
              radial-gradient(circle at 18% 22%, rgba(120,200,100,0.35) 0%, transparent 20%),
              radial-gradient(circle at 82% 26%, rgba(100,180,90,0.3) 0%, transparent 18%),
              linear-gradient(180deg, #6ec86a 0%, #4aa848 48%, #3d9040 100%)
            `,
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.12), 0 28px 70px rgba(40,100,60,0.25)',
          }} />

          <div style={{
            position: 'absolute',
            left: '6.2%',
            right: '6.2%',
            top: '7.2%',
            height: 22,
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(71,103,52,0.72) 0%, rgba(44,68,31,0.22) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: '0 8px 14px rgba(0,0,0,0.1)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '6.8%',
            right: '6.8%',
            bottom: '6.8%',
            height: 30,
            borderRadius: 22,
            background: 'linear-gradient(180deg, rgba(109,87,56,0.44) 0%, rgba(86,66,43,0.18) 100%)',
            border: '1px solid rgba(243,209,156,0.06)',
            boxShadow: '0 8px 18px rgba(0,0,0,0.1)',
            pointerEvents: 'none',
          }} />

          {[
            { left: '6.6%', top: '18%', width: 68, height: 28 },
            { right: '6.8%', top: '20%', width: 74, height: 30 },
            { left: '8.4%', bottom: '12.4%', width: 84, height: 34 },
            { right: '8.2%', bottom: '11.8%', width: 82, height: 32 },
          ].map((patch, index) => (
            <div
              key={`yard-patch-${index}`}
              style={{
                position: 'absolute',
                borderRadius: 999,
                background: 'radial-gradient(circle at 50% 50%, rgba(95,142,69,0.4) 0%, rgba(67,104,47,0.18) 55%, transparent 76%)',
                filter: 'blur(2px)',
                pointerEvents: 'none',
                ...patch,
              }}
            />
          ))}

          {[
            { left: '12.8%', top: '7.9%' },
            { left: '45.4%', top: '7.9%' },
            { left: '77.8%', top: '7.9%' },
            { left: '13.8%', bottom: '7.6%' },
            { left: '46.4%', bottom: '7.6%' },
            { left: '78.2%', bottom: '7.6%' },
          ].map((stone, index) => (
            <div
              key={`yard-stone-${index}`}
              style={{
                position: 'absolute',
                width: 54,
                height: 16,
                borderRadius: 10,
                background: 'linear-gradient(180deg, rgba(151,124,87,0.34) 0%, rgba(102,80,54,0.18) 100%)',
                border: '1px solid rgba(243,209,156,0.07)',
                boxShadow: '0 4px 8px rgba(0,0,0,0.08)',
                pointerEvents: 'none',
                ...stone,
              }}
            />
          ))}

          <div style={{
            position: 'absolute',
            left: '7%',
            right: '7%',
            top: '8%',
            bottom: '8%',
            borderRadius: 42,
            background: `
              linear-gradient(180deg, ${HOUSE_PALETTE.wall} 0%, ${HOUSE_PALETTE.wallInner} 100%)
            `,
            boxShadow: `0 0 0 5px ${HOUSE_PALETTE.wallShade}, 0 24px 50px rgba(80,60,30,0.22)`,
          }} />

          <div style={{
            position: 'absolute',
            left: '9%',
            right: '9%',
            top: '10%',
            bottom: '10%',
            borderRadius: 30,
            background: `
              linear-gradient(180deg, #a87848 0%, #8a6238 100%)
            `,
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)',
          }} />

          <div style={{
            position: 'absolute',
            left: '16%',
            top: '14%',
            width: '18%',
            height: '12%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(243,209,156,0.12) 0%, rgba(243,209,156,0.04) 42%, transparent 72%)',
            filter: 'blur(10px)',
            pointerEvents: 'none',
            opacity: 0.8,
          }} />
          <div style={{
            position: 'absolute',
            left: '41%',
            top: '14%',
            width: '18%',
            height: '12%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(243,209,156,0.12) 0%, rgba(243,209,156,0.04) 42%, transparent 72%)',
            filter: 'blur(10px)',
            pointerEvents: 'none',
            opacity: 0.8,
          }} />
          <div style={{
            position: 'absolute',
            left: '66%',
            top: '14%',
            width: '18%',
            height: '12%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(243,209,156,0.12) 0%, rgba(243,209,156,0.04) 42%, transparent 72%)',
            filter: 'blur(10px)',
            pointerEvents: 'none',
            opacity: 0.8,
          }} />

          <div style={{
            position: 'absolute',
            left: '10.4%',
            right: '10.4%',
            top: '11.4%',
            bottom: '11.4%',
            borderRadius: 22,
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(61,39,23,0.18)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '9%',
            right: '9%',
            top: '9%',
            height: 18,
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(61,39,23,0.88) 0%, rgba(61,39,23,0.16) 100%)',
            boxShadow: '0 6px 18px rgba(0,0,0,0.16)',
            pointerEvents: 'none',
          }} />

          {['10.5%', '33.4%', '63.6%', '86.6%'].map((left, index) => (
            <div key={`post-top-${index}`} style={{
              position: 'absolute',
              left,
              top: '10.4%',
              width: 12,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(180deg, #6a4427 0%, #4c2f1b 100%)',
              boxShadow: '0 8px 14px rgba(0,0,0,0.18)',
            }} />
          ))}

          {['10.5%', '33.4%', '63.6%', '86.6%'].map((left, index) => (
            <div key={`post-bottom-${index}`} style={{
              position: 'absolute',
              left,
              bottom: '10.4%',
              width: 12,
              height: 34,
              borderRadius: 8,
              background: 'linear-gradient(180deg, #6a4427 0%, #4c2f1b 100%)',
              boxShadow: '0 8px 14px rgba(0,0,0,0.18)',
            }} />
          ))}

          <div style={{
            position: 'absolute',
            left: '10.8%',
            top: '11.8%',
            width: '20%',
            height: '3%',
            borderRadius: 10,
            background: 'linear-gradient(180deg, rgba(116,78,50,0.5) 0%, rgba(88,58,36,0.22) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: '0 6px 10px rgba(0,0,0,0.06)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            right: '10.8%',
            top: '11.8%',
            width: '24%',
            height: '3%',
            borderRadius: 10,
            background: 'linear-gradient(180deg, rgba(116,78,50,0.5) 0%, rgba(88,58,36,0.22) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: '0 6px 10px rgba(0,0,0,0.06)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '36.8%',
            top: '11.2%',
            width: '26.4%',
            height: '2.4%',
            borderRadius: 10,
            background: 'linear-gradient(180deg, rgba(150,99,57,0.52) 0%, rgba(119,72,31,0.2) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            pointerEvents: 'none',
          }} />
          {['12.2%', '26.8%', '71.8%', '86.8%'].map((left, index) => (
            <div
              key={`upper-lamp-${index}`}
              style={{
                position: 'absolute',
                left,
                top: '10.6%',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(252,211,77,0.78) 0%, rgba(252,211,77,0.12) 68%, transparent 74%)',
                opacity: 0.68,
                pointerEvents: 'none',
              }}
            />
          ))}

          {WINDOWS.map((windowBox, index) => (
            <div key={index} style={{
              position: 'absolute',
              left: windowBox.left,
              top: windowBox.top,
              width: windowBox.width,
              height: 24,
              borderRadius: 8,
              background: 'linear-gradient(180deg, rgba(123,102,82,0.18), rgba(61,39,23,0.12))',
              border: '3px solid #6e4b26',
              boxShadow: `0 0 18px ${windowBox.glow}50`,
              overflow: 'hidden',
              animation: 'house-window-glow 3.4s ease-in-out infinite',
            }}>
          <div style={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
                width: 3,
                transform: 'translateX(-50%)',
              background: 'rgba(110,75,38,0.75)',
            }} />
          </div>
          ))}

          <div style={{
            position: 'absolute',
            left: '9%',
            right: '9%',
            top: '10%',
            height: 20,
            borderRadius: 999,
            background: 'rgba(123,102,82,0.16)',
            filter: 'blur(10px)',
            opacity: 0.5,
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '40%',
            top: '58%',
            width: '20%',
            height: '18%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.03) 40%, transparent 72%)',
            filter: 'blur(14px)',
            pointerEvents: 'none',
            opacity: 0.75,
          }} />

          {LABELS.map((decor, index) => (
            <div key={index} style={{
              position: 'absolute',
              left: decor.left,
              top: decor.top,
              width: decor.width,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 10,
              background: 'linear-gradient(180deg, rgba(71,47,28,0.92) 0%, rgba(45,30,18,0.92) 100%)',
              border: '1px solid rgba(243,209,156,0.14)',
              boxShadow: `0 6px 14px rgba(0,0,0,0.12), 0 0 12px ${decor.accent}12`,
            }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.4, letterSpacing: '0.16em', color: '#efd6ae' }}>
                {decor.label}
              </span>
            </div>
          ))}

          <div style={{
            position: 'absolute',
            left: '34%',
            top: '10%',
            width: '4%',
            height: '72%',
            borderRadius: 18,
            background: 'repeating-linear-gradient(180deg, #6d4d31 0px, #6d4d31 18px, #79583a 18px, #79583a 22px)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          }} />
          <div style={{
            position: 'absolute',
            left: '64%',
            top: '10%',
            width: '4%',
            height: '72%',
            borderRadius: 18,
            background: 'repeating-linear-gradient(180deg, #6d4d31 0px, #6d4d31 18px, #79583a 18px, #79583a 22px)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          }} />
          <div style={{
            position: 'absolute',
            left: '8%',
            top: '36%',
            width: '84%',
            height: '22%',
            borderRadius: 20,
            background: 'repeating-linear-gradient(90deg, #6d4d31 0px, #6d4d31 18px, #79583a 18px, #79583a 22px)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
          }} />

          {['31.2%', '59.2%'].map((left, index) => (
            <div key={`crossing-threshold-${index}`} style={{
              position: 'absolute',
              left,
              top: '34.9%',
              width: '3.2%',
              height: '2.6%',
              borderRadius: 8,
              background: 'linear-gradient(180deg, rgba(76,48,28,0.92) 0%, rgba(52,32,18,0.92) 100%)',
              border: '1px solid rgba(243,209,156,0.1)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
              pointerEvents: 'none',
            }} />
          ))}

          {['31.2%', '59.2%'].map((left, index) => (
            <div key={`lower-threshold-${index}`} style={{
              position: 'absolute',
              left,
              top: '57.2%',
              width: '3.2%',
              height: '2.6%',
              borderRadius: 8,
              background: 'linear-gradient(180deg, rgba(76,48,28,0.92) 0%, rgba(52,32,18,0.92) 100%)',
              border: '1px solid rgba(243,209,156,0.1)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.12)',
              pointerEvents: 'none',
            }} />
          ))}

          <div style={{
            position: 'absolute',
            left: ROOM_STYLES.Hall.area.left,
            top: ROOM_STYLES.Hall.area.top,
            width: ROOM_STYLES.Hall.area.width,
            height: ROOM_STYLES.Hall.area.height,
            borderRadius: 18,
            background: `
              linear-gradient(180deg, rgba(129,93,60,0.14) 0%, rgba(88,55,33,0.08) 100%),
              ${ROOM_STYLES.Hall.floor}
            `,
            border: selectedRoomKey === 'Hall' ? '2px solid rgba(243,209,156,0.38)' : '1px solid rgba(243,209,156,0.12)',
            boxShadow: selectedRoomKey === 'Hall' ? '0 0 24px rgba(243,209,156,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.08)',
            pointerEvents: 'none',
            opacity: collaborationStage ? 1 : 0.92,
          }} />

          <div style={{
            position: 'absolute',
            left: '42.8%',
            top: '69.3%',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            borderRadius: 999,
            background: 'rgba(61,39,23,0.88)',
            border: `1px solid ${collaborationStage ? `${collaborationStage.tone}55` : 'rgba(243,209,156,0.16)'}`,
            boxShadow: collaborationStage ? `0 0 16px ${collaborationStage.tone}20` : 'none',
            pointerEvents: 'none',
          }}>
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: collaborationStage ? collaborationStage.tone : '#f3d19c',
              boxShadow: collaborationStage ? `0 0 10px ${collaborationStage.tone}` : '0 0 8px rgba(243,209,156,0.4)',
            }} />
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, letterSpacing: '0.12em', color: collaborationStage ? '#f5e6d3' : '#f3d19c' }}>
              {collaborationStage ? 'SALA EM COLABORACAO' : `${idleAgentsCount} OCIOSOS - ${pendingTaskCount} NA FILA`}
            </span>
          </div>

          <div style={{
            position: 'absolute',
            left: '27%',
            top: '73.2%',
            width: '46%',
            height: '9.2%',
            borderRadius: 16,
            background: 'linear-gradient(180deg, rgba(118,83,55,0.42) 0%, rgba(93,61,39,0.18) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '18.8%',
            top: '83.1%',
            width: '18%',
            height: '7.8%',
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(123,87,58,0.24) 0%, rgba(82,54,34,0.14) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            right: '18.8%',
            top: '83.1%',
            width: '18%',
            height: '7.8%',
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(123,87,58,0.24) 0%, rgba(82,54,34,0.14) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '22.2%',
            top: '84.5%',
            width: '11%',
            height: '3%',
            borderRadius: 12,
            background: 'linear-gradient(180deg, #8d633d 0%, #664221 100%)',
            border: '1px solid rgba(243,209,156,0.1)',
            boxShadow: '0 8px 14px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            right: '22.2%',
            top: '84.5%',
            width: '11%',
            height: '3%',
            borderRadius: 12,
            background: 'linear-gradient(180deg, #8d633d 0%, #664221 100%)',
            border: '1px solid rgba(243,209,156,0.1)',
            boxShadow: '0 8px 14px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '28.4%',
            top: '86.7%',
            width: '7.2%',
            height: '4.4%',
            borderRadius: 16,
            background: 'linear-gradient(180deg, rgba(116,78,50,0.34) 0%, rgba(82,54,34,0.14) 100%)',
            border: '1px solid rgba(243,209,156,0.07)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            right: '28.4%',
            top: '86.7%',
            width: '7.2%',
            height: '4.4%',
            borderRadius: 16,
            background: 'linear-gradient(180deg, rgba(116,78,50,0.34) 0%, rgba(82,54,34,0.14) 100%)',
            border: '1px solid rgba(243,209,156,0.07)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '28.8%',
            top: '74.2%',
            width: '11%',
            height: '2.4%',
            borderRadius: 10,
            background: 'linear-gradient(180deg, #86603d 0%, #654329 100%)',
            border: '1px solid rgba(243,209,156,0.12)',
            boxShadow: '0 6px 10px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '60.6%',
            top: '74.2%',
            width: '11%',
            height: '2.4%',
            borderRadius: 10,
            background: 'linear-gradient(180deg, #86603d 0%, #654329 100%)',
            border: '1px solid rgba(243,209,156,0.12)',
            boxShadow: '0 6px 10px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '45.3%',
            top: '67.1%',
            width: 124,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: 'rgba(61,39,23,0.88)',
            border: '1px solid rgba(243,209,156,0.2)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.18)',
          }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.8, letterSpacing: '0.14em', color: '#f3d19c' }}>
              SALA COMUM
            </span>
          </div>

          <div style={{
            position: 'absolute',
            left: '42.4%',
            top: '75.2%',
            width: '15.2%',
            height: '3.2%',
            borderRadius: 10,
            background: 'linear-gradient(180deg, rgba(150,99,57,0.72) 0%, rgba(119,72,31,0.36) 100%)',
            border: '1px solid rgba(253,224,71,0.16)',
            boxShadow: '0 0 14px rgba(245,158,11,0.1)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '45.2%',
            top: '74.2%',
            width: '9.8%',
            height: '1.2%',
            borderRadius: 8,
            background: 'rgba(123,102,82,0.16)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '31.8%',
            top: '78.4%',
            width: '9%',
            height: '3.4%',
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(116,78,50,0.5) 0%, rgba(88,58,36,0.22) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '40.4%',
            top: '83.5%',
            width: '19.2%',
            height: '6.2%',
            borderRadius: 16,
            background: 'linear-gradient(180deg, rgba(132,91,58,0.22) 0%, rgba(84,56,35,0.1) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '43.8%',
            top: '84.3%',
            width: '12.4%',
            height: '2.8%',
            borderRadius: 12,
            background: 'linear-gradient(180deg, #8d633d 0%, #664221 100%)',
            border: '1px solid rgba(243,209,156,0.1)',
            boxShadow: '0 8px 14px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '31.2%',
            top: '73.8%',
            width: '2.2%',
            height: '4.4%',
            borderRadius: 8,
            background: 'linear-gradient(180deg, #715133 0%, #50341f 100%)',
            border: '1px solid rgba(243,209,156,0.1)',
            boxShadow: '0 6px 10px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '66.6%',
            top: '73.8%',
            width: '2.2%',
            height: '4.4%',
            borderRadius: 8,
            background: 'linear-gradient(180deg, #715133 0%, #50341f 100%)',
            border: '1px solid rgba(243,209,156,0.1)',
            boxShadow: '0 6px 10px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '31.75%',
            top: '72.8%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(243,209,156,0.3) 0%, rgba(243,209,156,0.08) 68%, transparent 74%)',
            pointerEvents: 'none',
            opacity: 0.7,
          }} />
          <div style={{
            position: 'absolute',
            left: '67.15%',
            top: '72.8%',
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(243,209,156,0.3) 0%, rgba(243,209,156,0.08) 68%, transparent 74%)',
            pointerEvents: 'none',
            opacity: 0.7,
          }} />
          <div style={{
            position: 'absolute',
            left: '59.2%',
            top: '78.4%',
            width: '9%',
            height: '3.4%',
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(116,78,50,0.5) 0%, rgba(88,58,36,0.22) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.06)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '49%',
            top: '75.2%',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(243,209,156,0.22) 0%, rgba(245,158,11,0.16) 46%, transparent 74%)',
            filter: 'blur(2px)',
            pointerEvents: 'none',
            opacity: collaborationStage ? 0.92 : 0.52,
          }} />

          <div style={{
            position: 'absolute',
            left: '45.8%',
            bottom: '7.8%',
            width: 120,
            height: 18,
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(80,53,32,0.9) 0%, rgba(52,34,22,0.9) 100%)',
            border: '1px solid rgba(243,209,156,0.18)',
            boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
          }} />

          {SHARED_WALLS.map((wall, index) => (
            <div key={`wall-${index}`} style={{
              position: 'absolute',
              ...wall,
              borderRadius: 10,
              background: `linear-gradient(180deg, ${HOUSE_PALETTE.wallInner} 0%, ${HOUSE_PALETTE.wall} 100%)`,
              boxShadow: `0 0 0 2px ${HOUSE_PALETTE.wallShade}, inset 0 1px 0 rgba(255,255,255,0.1)`,
              pointerEvents: 'none',
              zIndex: 1,
            }} />
          ))}

          {DOORS.map((door, index) => {
            const vertical = door.orientation === 'vertical';
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  ...door,
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: vertical ? '-4% -32%' : '-32% -4%',
                  borderRadius: vertical ? 10 : 8,
                  background: `linear-gradient(180deg, ${HOUSE_PALETTE.wallInner} 0%, ${HOUSE_PALETTE.wall} 100%)`,
                  boxShadow: `0 0 0 2px ${HOUSE_PALETTE.wallShade}`,
                }} />
                <div style={{
                  position: 'absolute',
                  inset: vertical ? '10% 16%' : '16% 10%',
                  borderRadius: 8,
                  background: vertical
                    ? 'linear-gradient(90deg, rgba(57,34,18,0.96) 0%, rgba(86,54,30,0.96) 48%, rgba(47,28,15,0.96) 100%)'
                    : 'linear-gradient(180deg, rgba(57,34,18,0.96) 0%, rgba(86,54,30,0.96) 48%, rgba(47,28,15,0.96) 100%)',
                  border: '1px solid #7a5934',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.18)',
                }} />
                <div style={{
                  position: 'absolute',
                  left: vertical ? '50%' : '10%',
                  top: vertical ? '12%' : '50%',
                  width: vertical ? 2 : '80%',
                  height: vertical ? '76%' : 2,
                  transform: vertical ? 'translateX(-50%)' : 'translateY(-50%)',
                  background: 'rgba(123,102,82,0.16)',
                  opacity: 0.7,
                }} />
                <div style={{
                  position: 'absolute',
                  left: vertical ? '-18%' : '12%',
                  top: vertical ? '50%' : '-18%',
                  width: vertical ? '136%' : '76%',
                  height: vertical ? '14%' : '136%',
                  transform: 'translateY(-50%)',
                  borderRadius: 999,
                  background: vertical
                    ? 'linear-gradient(90deg, rgba(47,29,18,0.24) 0%, rgba(0,0,0,0.02) 52%, rgba(47,29,18,0.24) 100%)'
                    : 'linear-gradient(180deg, rgba(47,29,18,0.24) 0%, rgba(0,0,0,0.02) 52%, rgba(47,29,18,0.24) 100%)',
                  opacity: 0.75,
                }} />
              </div>
            );
          })}

          {Object.keys(ROOM_FIXTURES).map((roomKey) => (
            <RoomShell key={roomKey} roomKey={roomKey} agentsInRoom={roomAgents[roomKey]} taskSummary={roomTaskSummary[roomKey]}>
              {ROOM_FIXTURES[roomKey].map((fixture, index) => (
                <Fixture key={`${roomKey}-${index}`} {...fixture} />
              ))}

              {roomAgents[roomKey]
                .filter((agent) => hasVisibleWork(agent))
                .map((agent) => {
                  const pos = effectivePositions.get(agent.id) || { x: 50, y: 50 };
                  const targetX = pos.targetX ?? pos.x;
                  const targetY = pos.targetY ?? pos.y;
                  const pathWidth = Math.hypot(targetX - pos.x, targetY - pos.y);
                  const pathAngle = Math.atan2(targetY - pos.y, targetX - pos.x) * (180 / Math.PI);
                  const workSignal = recentWorkSignals.get(agent.id);
                  const workSignalOpacity = workSignal ? Math.max(0.42, 1 - workSignal.ageMs / 70000) : 0;

                  return (
                    <div key={`work-${agent.id}`}>
                      {pos.isMoving && pathWidth > 1.5 && (
                        <div style={{
                          position: 'absolute',
                          left: `${pos.x}%`,
                          top: `${pos.y}%`,
                          width: `${pathWidth}%`,
                          height: 2,
                          transform: `translateY(-50%) rotate(${pathAngle}deg)`,
                          transformOrigin: '0 50%',
                          borderRadius: 999,
                          background: 'linear-gradient(90deg, rgba(243,209,156,0.12) 0%, rgba(243,209,156,0.48) 50%, rgba(243,209,156,0.08) 100%)',
                          boxShadow: '0 0 10px rgba(243,209,156,0.16)',
                          pointerEvents: 'none',
                          zIndex: 2,
                        }} />
                      )}
                      <div style={{
                        position: 'absolute',
                        left: `${targetX}%`,
                        top: `${targetY}%`,
                        width: 30,
                        height: 30,
                        transform: 'translate(-50%, -50%)',
                        borderRadius: 12,
                        border: pos.isMoving ? '2px solid rgba(252,211,77,0.7)' : '2px solid rgba(134,239,172,0.55)',
                        background: pos.isMoving
                          ? 'radial-gradient(circle, rgba(252,211,77,0.22) 0%, rgba(252,211,77,0.08) 56%, transparent 72%)'
                          : 'radial-gradient(circle, rgba(134,239,172,0.16) 0%, rgba(134,239,172,0.04) 56%, transparent 72%)',
                        boxShadow: pos.isMoving
                          ? '0 0 18px rgba(252,211,77,0.24)'
                          : '0 0 14px rgba(134,239,172,0.18)',
                        animation: 'house-focus-pulse 1.9s ease-in-out infinite',
                        pointerEvents: 'none',
                        zIndex: 2,
                      }} />
                      {!pos.isMoving && (
                        <div style={{
                          position: 'absolute',
                          left: `${targetX}%`,
                          top: `${targetY}%`,
                          width: 44,
                          height: 18,
                          transform: 'translate(-50%, -50%)',
                          borderRadius: 999,
                          background: 'radial-gradient(circle, rgba(134,239,172,0.18) 0%, rgba(134,239,172,0.05) 58%, transparent 74%)',
                          opacity: 0.7,
                          animation: 'house-room-warmth 1.7s ease-in-out infinite',
                          pointerEvents: 'none',
                          zIndex: 1,
                        }} />
                      )}
                      {workSignal && !pos.isMoving && (
                        <div style={{
                          position: 'absolute',
                          left: `${targetX}%`,
                          top: `${targetY - 4.6}%`,
                          transform: 'translate(-50%, -100%)',
                          pointerEvents: 'none',
                          zIndex: 3,
                          opacity: workSignalOpacity,
                        }}>
                          <div style={{
                            padding: '2px 5px',
                            borderRadius: 999,
                            background: 'rgba(47,30,18,0.92)',
                            border: '1px solid rgba(243,209,156,0.16)',
                            boxShadow: '0 6px 10px rgba(0,0,0,0.14)',
                            fontFamily: 'var(--font-pixel)',
                            fontSize: 4.6,
                            color: workSignal.kind === 'OK' ? '#86efac' : '#f3d19c',
                            letterSpacing: '0.04em',
                          }}>
                            {workSignal.kind}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              {roomAgents[roomKey].map((agent) => {
                const pos = effectivePositions.get(agent.id) || { x: 50, y: 50 };
                return (
                  <AgentDot
                    key={agent.id}
                    agent={agent}
                    inMeeting={false}
                    selected={selectedAgentId === agent.id}
                    onSelect={onSelectAgent}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, isMoving: !!pos.isMoving }}
                  />
                );
              })}
            </RoomShell>
          ))}

          {hallAgents.map((agent) => {
            const pos = effectivePositions.get(agent.id) || { x: 50, y: 50 };
            return (
              <AgentDot
                key={agent.id}
                agent={agent}
                inMeeting={false}
                selected={selectedAgentId === agent.id}
                onSelect={onSelectAgent}
                style={{ left: `${pos.x}%`, top: `${pos.y}%`, isMoving: !!pos.isMoving }}
              />
            );
          })}

          {!activeMeeting && collaborationStage && (
            <div style={{
              position: 'absolute',
              left: `${collaborationStage.center.x}%`,
              top: `${collaborationStage.center.y}%`,
              width: 138,
              height: 70,
              transform: 'translate(-50%, -50%)',
              borderRadius: 999,
              background: `radial-gradient(circle, ${collaborationStage.tone}22 0%, rgba(243,209,156,0.12) 48%, transparent 75%)`,
              border: `1px dashed ${collaborationStage.tone}55`,
              boxShadow: `0 0 22px ${collaborationStage.tone}22`,
              pointerEvents: 'none',
              zIndex: 10,
              animation: 'house-focus-pulse 1.8s ease-in-out infinite',
            }} />
          )}

          {!activeMeeting && collaborationTrails.map((trail) => (
            <div
              key={`collab-${trail.id}`}
              style={{
                position: 'absolute',
                left: `${trail.left}%`,
                top: `${trail.top}%`,
                width: `${trail.width}%`,
                height: 3,
                transform: `translateY(-50%) rotate(${trail.angle}deg)`,
                transformOrigin: '0 50%',
                borderRadius: 999,
                background: `linear-gradient(90deg, ${collaborationStage.tone}10 0%, ${collaborationStage.tone}55 55%, ${collaborationStage.tone}15 100%)`,
                boxShadow: `0 0 10px ${collaborationStage.tone}22`,
                pointerEvents: 'none',
                zIndex: 9,
                opacity: 0.78,
              }}
            >
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 999,
                background: 'repeating-linear-gradient(90deg, rgba(243,209,156,0.08) 0px, rgba(243,209,156,0.08) 10px, transparent 10px, transparent 20px)',
                animation: 'house-path-flow 1.3s linear infinite',
                animationDelay: `${trail.delay}s`,
              }} />
            </div>
          ))}

          {!activeMeeting && roomSignals.map((signal, index) => (
            <div
              key={signal.id}
              style={{
                position: 'absolute',
                left: `${signal.x}%`,
                top: `${signal.y}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: 12,
                pointerEvents: 'none',
                opacity: signal.opacity,
              }}
            >
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '100%',
                width: 2,
                height: signal.stemHeight,
                transform: 'translateX(-50%)',
                background: `linear-gradient(180deg, ${signal.tone}aa 0%, transparent 100%)`,
              }} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 6px',
                borderRadius: 999,
                background: 'rgba(47,30,18,0.93)',
                border: `1px solid ${signal.tone}55`,
                boxShadow: '0 8px 16px rgba(0,0,0,0.16)',
                minWidth: 0,
                maxWidth: 128,
                whiteSpace: 'nowrap',
              }}>
                <span style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: 4.3,
                  color: '#1b130d',
                  background: signal.tone,
                  borderRadius: 999,
                  padding: '1px 4px',
                  letterSpacing: '0.05em',
                  flexShrink: 0,
                }}>
                  {signal.kind}
                </span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.2, color: '#f5e6d3', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {signal.text}
                </div>
              </div>
            </div>
          ))}

          {activeCommandSignal && commandSignalPos && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(91, Math.max(9, commandSignalPos.x))}%`,
                top: `${Math.min(86, Math.max(12, commandSignalPos.y - 8.2))}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: 13,
                pointerEvents: 'none',
              }}
            >
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '100%',
                width: 2,
                height: 12,
                transform: 'translateX(-50%)',
                background: 'linear-gradient(180deg, rgba(243,209,156,0.85) 0%, transparent 100%)',
              }} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 7px',
                borderRadius: 999,
                background: 'rgba(52,33,19,0.96)',
                border: '1px solid rgba(243,209,156,0.44)',
                boxShadow: '0 10px 18px rgba(0,0,0,0.2), 0 0 14px rgba(243,209,156,0.14)',
                maxWidth: 168,
                whiteSpace: 'nowrap',
              }}>
                <span style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: 4.5,
                  color: '#1b130d',
                  background: '#f3d19c',
                  borderRadius: 999,
                  padding: '2px 5px',
                  flexShrink: 0,
                }}>
                  ORDEM
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.6, color: '#f3d19c', letterSpacing: '0.05em' }}>
                    {activeCommandSignal.status}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.3, color: '#f5e6d3', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {shortSignalText(activeCommandSignal.action || activeCommandSignal.command)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selectedRoom && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(7, 5, 3, 0.32)',
              backdropFilter: 'blur(1.5px)',
              pointerEvents: 'none',
              zIndex: 5,
            }} />
          )}

          {selectedRoom && (
            <div style={{
              position: 'absolute',
              ...selectedRoom.area,
              borderRadius: selectedRoomKey === 'Meeting' ? 30 : 24,
              boxShadow: `0 0 0 3px ${selectedRoom.color}88, 0 0 28px ${selectedRoom.color}55, inset 0 0 0 2px rgba(255,255,255,0.08)`,
              background: `radial-gradient(circle at 50% 50%, ${selectedRoom.color}14 0%, transparent 68%)`,
              pointerEvents: 'none',
              zIndex: 6,
            }} />
          )}

          {activeCommandSignal && commandRoom && (
            <div style={{
              position: 'absolute',
              ...commandRoom.area,
              borderRadius: commandRoomKey === 'Meeting' ? 30 : 24,
              boxShadow: '0 0 0 2px rgba(243,209,156,0.55), 0 0 34px rgba(243,209,156,0.18), inset 0 0 0 1px rgba(255,255,255,0.08)',
              background: 'radial-gradient(circle at 50% 50%, rgba(243,209,156,0.14) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 6,
              animation: 'house-focus-pulse 1.4s ease-in-out 3',
            }} />
          )}

          {selectedTrail && (
            <div style={{
              position: 'absolute',
              left: selectedTrail.left,
              top: selectedTrail.top,
              width: selectedTrail.width,
              height: 6,
              transform: `translateY(-50%) rotate(${selectedTrail.angle}deg)`,
              transformOrigin: '0 50%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, rgba(243,209,156,0.08) 0%, rgba(243,209,156,0.52) 38%, rgba(243,209,156,0.18) 100%)',
              boxShadow: '0 0 0 1px rgba(243,209,156,0.18), 0 0 12px rgba(243,209,156,0.18)',
              animation: 'house-path-flow 1.2s linear infinite',
              pointerEvents: 'none',
              zIndex: 7,
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                inset: 1,
                borderRadius: 999,
                background: 'repeating-linear-gradient(90deg, rgba(255,246,216,0.32) 0px, rgba(255,246,216,0.32) 10px, transparent 10px, transparent 22px)',
              }} />
              <div style={{
                position: 'absolute',
                right: -2,
                top: '50%',
                width: 10,
                height: 10,
                transform: 'translateY(-50%) rotate(45deg)',
                borderTop: '2px solid rgba(243,209,156,0.7)',
                borderRight: '2px solid rgba(243,209,156,0.7)',
                background: 'rgba(43,28,17,0.4)',
                boxSizing: 'border-box',
              }} />
            </div>
          )}

          {selectedStagePoint && (
            <div style={{
              position: 'absolute',
              left: selectedStagePoint.x,
              top: selectedStagePoint.y,
              width: 22,
              height: 22,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              border: '2px solid rgba(243,209,156,0.8)',
              background: 'rgba(243,209,156,0.08)',
              boxShadow: '0 0 18px rgba(243,209,156,0.3)',
              animation: 'house-focus-pulse 1.8s ease-in-out infinite',
              pointerEvents: 'none',
              zIndex: 8,
            }} />
          )}

          {selectedMeetingSeat && !activeMeeting && (
            <div style={{
              position: 'absolute',
              left: selectedMeetingSeat.left,
              top: selectedMeetingSeat.top,
              width: 42,
              height: 42,
              transform: 'translate(-50%, -50%)',
              borderRadius: 12,
              border: '2px solid rgba(243,209,156,0.66)',
              boxShadow: '0 0 18px rgba(243,209,156,0.28)',
              background: 'rgba(243,209,156,0.08)',
              animation: 'house-focus-pulse 1.8s ease-in-out infinite',
              pointerEvents: 'none',
              zIndex: 8,
            }} />
          )}

          {selectedCard && (
            <div style={{
              position: 'absolute',
              left: selectedCard.left,
              top: selectedCard.top,
              width: 230,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'linear-gradient(180deg, rgba(46,30,19,0.96) 0%, rgba(28,19,13,0.96) 100%)',
              border: '1px solid rgba(243,209,156,0.26)',
              boxShadow: '0 16px 28px rgba(0,0,0,0.28)',
              zIndex: 9,
              pointerEvents: 'none',
            }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.2, color: '#f3d19c', letterSpacing: '0.08em' }}>
                {getAgentDisplayName(selectedAgent)}
              </div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#d7c8b3', marginTop: 4 }}>
                {selectedRoomKey === 'Meeting' ? 'Em reuniao' : `Comodo: ${selectedAgent.zone || selectedAgent.team || '-'}`}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.2, color: '#f0e2cd', lineHeight: 1.42, marginTop: 6 }}>
                {selectedAgent.current_task || selectedAgent.task || selectedAgent.summary || selectedAgent.current_action || 'Sem tarefa visivel'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {['COMANDAR', 'SEGUIR', selectedRoomKey === 'Meeting' ? 'ASSENTO' : 'CHAMAR'].map((action) => (
                  <span
                    key={action}
                    style={{
                      fontFamily: 'var(--font-pixel)',
                      fontSize: 4.8,
                      color: '#f3d19c',
                      border: '1px solid rgba(243,209,156,0.18)',
                      background: 'rgba(243,209,156,0.07)',
                      borderRadius: 999,
                      padding: '3px 6px',
                    }}
                  >
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{
            position: 'absolute',
            left: 42,
            bottom: 26,
            display: 'flex',
            gap: 8,
            zIndex: 10,
          }}>
            {[
              { label: 'CASA', value: 'viva', color: '#f3d19c' },
              { label: 'COMODOS', value: `${agents.length}`, color: '#86efac' },
              { label: 'MESA', value: meetingCount > 0 ? `${meetingCount} reunidos` : 'pronta', color: meetingCount > 0 ? '#fde68a' : '#d3c1a4' },
              { label: 'ZOOM', value: `${Math.round(scale * 100)}%`, color: '#bfdbfe' },
            ].map((chip) => (
              <div key={chip.label} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                padding: '6px 8px',
                borderRadius: 9,
                background: 'rgba(43,28,17,0.68)',
                border: '1px solid rgba(243,209,156,0.08)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
              }}>
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.5, color: '#c8aa82', letterSpacing: '0.14em' }}>
                  {chip.label}
                </span>
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.4, color: chip.color }}>
                  {chip.value}
                </span>
              </div>
            ))}
          </div>

          {recentFallback && (
            <div style={{
              position: 'absolute',
              right: 42,
              bottom: isCoolingDown ? 78 : 28,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 10px',
              borderRadius: 10,
              background: 'rgba(52,33,19,0.76)',
              border: '1px solid rgba(250,204,21,0.22)',
              boxShadow: '0 8px 14px rgba(0,0,0,0.14)',
              zIndex: 11,
            }}>
              <span style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 4.5,
                color: '#1b130d',
                background: '#facc15',
                borderRadius: 999,
                padding: '3px 6px',
                letterSpacing: '0.06em',
              }}>
                FALLBACK
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#fde68a', letterSpacing: '0.06em' }}>
                  {recentFallback.from} {'->'} {recentFallback.to}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.4, color: '#ead7ba', lineHeight: 1.25 }}>
                  {recentFallback.reason || 'Primaria indisponivel'} · {fallbackMinutes} min
                </span>
              </div>
            </div>
          )}

          {isCoolingDown && (
            <div style={{
              position: 'absolute',
              right: 42,
              bottom: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '8px 10px',
              borderRadius: 10,
              background: 'rgba(67,34,14,0.76)',
              border: '1px solid rgba(251,146,60,0.24)',
              boxShadow: '0 8px 14px rgba(0,0,0,0.14)',
              zIndex: 11,
            }}>
              <span style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 4.5,
                color: '#1b130d',
                background: '#fb923c',
                borderRadius: 999,
                padding: '3px 6px',
                letterSpacing: '0.06em',
              }}>
                AQUECENDO
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#fdba74', letterSpacing: '0.06em' }}>
                  {llmStatus.primary_llm} volta em {formatCooldown(cooldownSeconds)}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.4, color: '#ead7ba', lineHeight: 1.25 }}>
                  Operacao segue na rota local
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {activeMeeting && (
        <MeetingRoom
          agents={agents}
          inMeeting={inMeeting}
          agentPositions={agentPositions}
          selectedAgentId={selectedAgentId}
          onSelectAgent={onSelectAgent}
          floating={true}
        />
      )}

      <MeetingPanel
        agents={agents}
        inMeeting={inMeeting}
        meetingCount={meetingCount}
        toggleMeeting={toggleMeeting}
        meetingSignal={recentMeetingEvent}
      />
    </div>
  );
}
