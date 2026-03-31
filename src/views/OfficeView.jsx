import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import AgentDot from '../components/AgentDot';
import MeetingPanel from '../components/MeetingPanel';
import { getAgentDisplayName, isAgentCeo } from '../utils/agentPersona';
import { useEvents } from '../hooks/useEvents';

const TOOLBAR_H = 52;
const MAP_W = 1620;
const MAP_H = 1060;
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.5;
const DEFAULT_SCALE = 0.96;

const HOUSE_PALETTE = {
  wall: '#b98a56',
  wallShade: '#8c6239',
  wallInner: '#d8b784',
  wood: '#8b5a2b',
  woodDeep: '#5d3717',
  stone: '#6b7280',
  grass: '#365c2b',
  rug: '#7c3f2b',
  hearth: '#f59e0b',
};

const ROOM_STYLES = {
  Engineering: {
    label: 'ESTUDIO DEV',
    color: '#5b8def',
    area: { left: '8%', top: '10%', width: '24%', height: '24%' },
    floor: 'repeating-linear-gradient(90deg, #5b3a1f 0px, #5b3a1f 18px, #684526 18px, #684526 20px)',
  },
  Quality: {
    label: 'OFICINA QA',
    color: '#d29a3a',
    area: { left: '38%', top: '10%', width: '24%', height: '24%' },
    floor: 'repeating-linear-gradient(45deg, #5f4728 0px, #5f4728 16px, #6d5330 16px, #6d5330 20px)',
  },
  'People Ops': {
    label: 'SALA PESSOAS',
    color: '#d96d9f',
    area: { left: '68%', top: '10%', width: '24%', height: '24%' },
    floor: 'repeating-linear-gradient(0deg, #6c354f 0px, #6c354f 18px, #7e4360 18px, #7e4360 22px)',
  },
  Operations: {
    label: 'OFICINA OPS',
    color: '#5cab68',
    area: { left: '8%', top: '47%', width: '24%', height: '18%' },
    floor: 'repeating-linear-gradient(0deg, #355633 0px, #355633 20px, #3f6640 20px, #3f6640 24px)',
  },
  Communications: {
    label: 'LOUNGE SOCIAL',
    color: '#8d6adf',
    area: { left: '38%', top: '47%', width: '24%', height: '18%' },
    floor: 'repeating-linear-gradient(135deg, #4a355f 0px, #4a355f 16px, #57406e 16px, #57406e 20px)',
  },
  Flex: {
    label: 'ESTUDIO FLEX',
    color: '#55b6a5',
    area: { left: '68%', top: '47%', width: '24%', height: '18%' },
    floor: 'repeating-linear-gradient(180deg, #355f59 0px, #355f59 16px, #3f7068 16px, #3f7068 20px)',
  },
  Meeting: {
    label: 'MESA CENTRAL',
    color: '#c48b55',
    area: { left: '18%', top: '68%', width: '64%', height: '20%' },
    floor: 'linear-gradient(180deg, #715338 0%, #5f452d 100%)',
  },
  Hall: {
    label: 'GRANDE HALL',
    color: '#f3d19c',
    area: { left: '18%', top: '70%', width: '64%', height: '14%' },
    floor: 'repeating-linear-gradient(90deg, rgba(126,87,58,0.0) 0px, rgba(126,87,58,0.0) 18px, rgba(92,63,41,0.1) 18px, rgba(92,63,41,0.1) 20px)',
  },
};

const ROOM_FIXTURES = {
  Engineering: [
    { left: '10%', top: '20%', width: '26%', height: '18%', kind: 'bookshelf' },
    { left: '48%', top: '18%', width: '34%', height: '22%', kind: 'desk' },
    { left: '14%', top: '58%', width: '26%', height: '14%', kind: 'bench' },
    { left: '52%', top: '56%', width: '26%', height: '16%', kind: 'desk' },
  ],
  Quality: [
    { left: '12%', top: '18%', width: '26%', height: '18%', kind: 'bench' },
    { left: '50%', top: '18%', width: '22%', height: '18%', kind: 'bench' },
    { left: '32%', top: '54%', width: '36%', height: '14%', kind: 'table' },
  ],
  'People Ops': [
    { left: '12%', top: '20%', width: '24%', height: '18%', kind: 'desk' },
    { left: '42%', top: '16%', width: '18%', height: '30%', kind: 'plant' },
    { left: '66%', top: '20%', width: '18%', height: '18%', kind: 'bookshelf' },
    { left: '26%', top: '56%', width: '48%', height: '12%', kind: 'sofa' },
  ],
  Operations: [
    { left: '12%', top: '20%', width: '24%', height: '18%', kind: 'console' },
    { left: '52%', top: '20%', width: '22%', height: '18%', kind: 'rack' },
    { left: '28%', top: '58%', width: '42%', height: '12%', kind: 'workbench' },
  ],
  Communications: [
    { left: '12%', top: '18%', width: '18%', height: '16%', kind: 'armchair' },
    { left: '38%', top: '18%', width: '24%', height: '22%', kind: 'hearth' },
    { left: '70%', top: '18%', width: '18%', height: '16%', kind: 'armchair' },
    { left: '26%', top: '58%', width: '48%', height: '10%', kind: 'sofa' },
  ],
  Flex: [
    { left: '12%', top: '18%', width: '20%', height: '18%', kind: 'bed' },
    { left: '40%', top: '18%', width: '20%', height: '18%', kind: 'desk' },
    { left: '68%', top: '20%', width: '16%', height: '18%', kind: 'plant' },
    { left: '26%', top: '58%', width: '48%', height: '10%', kind: 'table' },
  ],
};

const DOORS = [
  { left: '31.4%', top: '23.2%', width: '1.8%', height: '8.2%' },
  { left: '61.6%', top: '23.2%', width: '1.8%', height: '8.2%' },
  { left: '31.4%', top: '51.2%', width: '1.8%', height: '7.4%' },
  { left: '61.6%', top: '51.2%', width: '1.8%', height: '7.4%' },
  { left: '46.7%', top: '34.8%', width: '6.6%', height: '1.8%' },
  { left: '46.7%', top: '66.2%', width: '6.6%', height: '1.8%' },
];

const WINDOWS = [
  { left: '13%', top: '7.2%', width: 84, glow: '#93c5fd' },
  { left: '43%', top: '7.2%', width: 84, glow: '#fcd34d' },
  { left: '73%', top: '7.2%', width: 84, glow: '#f9a8d4' },
  { left: '13%', top: '82.2%', width: 84, glow: '#86efac' },
  { left: '43%', top: '82.2%', width: 84, glow: '#c4b5fd' },
  { left: '73%', top: '82.2%', width: 84, glow: '#99f6e4' },
];

const LABELS = [
  { left: '5.8%', top: '5.4%', width: 92, label: 'VARANDA', accent: '#f3d19c' },
  { left: '83.2%', top: '5.4%', width: 122, label: 'HALL SUPERIOR', accent: '#f3d19c' },
  { left: '45.8%', top: '89.8%', width: 122, label: 'CAMINHO DA COZINHA', accent: '#f0ab7b' },
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
  return clean.length > 42 ? `${clean.slice(0, 41)}...` : clean;
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

function RoomShell({ roomKey, agentsInRoom, children }) {
  const room = ROOM_STYLES[roomKey];
  const agents = agentsInRoom || [];
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

  return (
    <div style={{
      position: 'absolute',
      ...room.area,
      borderRadius: 24,
      background: room.floor,
      border: `8px solid ${HOUSE_PALETTE.wallInner}`,
      boxShadow: `0 0 0 3px ${HOUSE_PALETTE.wallShade}, 0 18px 34px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(255,255,255,0.05)`,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        left: 10,
        right: 10,
        top: -6,
        height: 12,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.12)',
        filter: 'blur(5px)',
        opacity: 0.55,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        left: 8,
        right: -10,
        bottom: -12,
        height: 22,
        borderRadius: 20,
        background: 'rgba(33,21,12,0.22)',
        filter: 'blur(8px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${stateColor}18 0%, transparent 58%), linear-gradient(180deg, rgba(255,255,255,0.04), transparent 32%)`,
        pointerEvents: 'none',
        animation: roomState === 'idle' ? 'none' : 'house-room-warmth 3s ease-in-out infinite',
      }} />

      <div style={{
        position: 'absolute',
        top: 10,
        left: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '5px 9px',
        borderRadius: 999,
        background: 'rgba(45,28,16,0.82)',
        border: `1px solid ${room.color}55`,
        zIndex: 4,
      }}>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: 2,
          background: room.color,
          boxShadow: `0 0 10px ${room.color}`,
        }} />
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, letterSpacing: '0.14em', color: room.color }}>
          {room.label}
        </span>
      </div>

      <div style={{
        position: 'absolute',
        top: 10,
        right: 12,
        padding: '5px 8px',
        borderRadius: 999,
        background: 'rgba(45,28,16,0.78)',
        border: `1px solid ${stateColor}55`,
        zIndex: 4,
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.5, letterSpacing: '0.12em', color: stateColor }}>
          {agents.length} EM CASA
        </span>
      </div>

      <div style={{
        position: 'absolute',
        left: 12,
        bottom: 10,
        display: 'flex',
        gap: 6,
        zIndex: 4,
      }}>
        {[
          { label: 'ATV', value: activeCount, color: room.color },
          { label: 'REV', value: reviewCount, color: '#f59e0b' },
          { label: 'BLQ', value: blockedCount, color: '#ef4444' },
        ].map((metric) => (
          <div key={metric.label} style={{
            minWidth: 40,
            padding: '4px 6px',
            borderRadius: 8,
            background: 'rgba(41,25,15,0.74)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#c8aa82', letterSpacing: '0.12em' }}>
              {metric.label}
            </div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: metric.value > 0 ? metric.color : '#d3c1a4' }}>
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
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 16px rgba(0,0,0,0.16)',
    overflow: 'hidden',
  };

  const variants = {
    desk: { background: 'linear-gradient(180deg, #7a4a27 0%, #61381c 100%)' },
    bench: { background: 'linear-gradient(180deg, #927249 0%, #715637 100%)' },
    table: { background: 'linear-gradient(180deg, #8d6337 0%, #6d4b2a 100%)' },
    sofa: { background: 'linear-gradient(180deg, #6f3d32 0%, #562b22 100%)' },
    console: { background: 'linear-gradient(180deg, #58636f 0%, #434c55 100%)' },
    rack: { background: 'linear-gradient(180deg, #46505c 0%, #343b45 100%)' },
    workbench: { background: 'linear-gradient(180deg, #78613f 0%, #5f4b31 100%)' },
    bookshelf: { background: 'linear-gradient(180deg, #6d4222 0%, #583319 100%)' },
    armchair: { background: 'linear-gradient(180deg, #6f4d7a 0%, #583b60 100%)' },
    bed: { background: 'linear-gradient(180deg, #8aa6b2 0%, #6b8591 100%)' },
    hearth: { background: 'radial-gradient(circle at 50% 45%, #f59e0b 0%, #92400e 72%)' },
    plant: { background: 'radial-gradient(circle at 50% 40%, #5fd06b 0%, #295b32 76%)' },
  };

  return (
    <div style={{ ...baseStyles, ...(variants[kind] || variants.table) }}>
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
          border: '1px solid rgba(255,255,255,0.08)',
          animation: 'house-window-glow 2.7s steps(2) infinite',
        }} />
      )}
      {kind === 'bookshelf' && (
        [20, 44, 68].map((shelf) => (
          <div key={shelf} style={{
            position: 'absolute',
            left: '10%',
            right: '10%',
            top: `${shelf}%`,
            height: 4,
            background: 'rgba(39,24,15,0.55)',
          }} />
        ))
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
          border: '1px solid rgba(255,255,255,0.06)',
        }} />
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
  const activeMeeting = participants.length > 0;
  const leader = participants.find((agent) => isAgentCeo(agent)) || participants[0] || null;

  useEffect(() => {
    if (!activeMeeting) {
      setSpeakerIndex(0);
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

  return (
    <div style={{
      position: floating ? 'absolute' : 'absolute',
      ...(floating
        ? {
            right: 18,
            top: 76,
            width: 430,
            height: 420,
          }
        : room.area),
      borderRadius: floating ? 24 : 30,
      background: room.floor,
      border: `10px solid ${HOUSE_PALETTE.wallInner}`,
      boxShadow: `0 0 0 3px ${HOUSE_PALETTE.wallShade}, 0 22px 40px rgba(0,0,0,0.28)`,
      overflow: 'hidden',
      zIndex: floating ? 44 : 'auto',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), transparent 26%)',
      }} />

      <div style={{
        position: 'absolute',
        left: '50%',
        top: 18,
        transform: 'translateX(-50%)',
        width: floating ? 180 : 150,
        height: 28,
        borderRadius: 999,
        background: 'linear-gradient(180deg, rgba(87,56,31,0.96) 0%, rgba(60,38,21,0.96) 100%)',
        border: '1px solid rgba(243,209,156,0.25)',
        boxShadow: '0 8px 14px rgba(0,0,0,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.1, letterSpacing: '0.14em', color: '#f3d19c' }}>
          {room.label}
        </span>
      </div>

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: floating ? 360 : 520,
        height: floating ? 250 : 190,
        borderRadius: 40,
        background: 'radial-gradient(circle at 50% 44%, rgba(255,239,190,0.12) 0%, rgba(126,74,43,0.2) 28%, rgba(74,44,27,0.18) 55%, transparent 72%)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: floating ? 320 : 448,
        height: floating ? 196 : 150,
        borderRadius: 999,
        background: 'linear-gradient(180deg, rgba(96,62,38,0.74) 0%, rgba(62,40,24,0.74) 100%)',
        border: '2px solid rgba(243,209,156,0.12)',
        boxShadow: '0 14px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.05)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: floating ? 282 : 396,
        height: floating ? 152 : 118,
        borderRadius: 999,
        background: 'linear-gradient(180deg, #9d6d3d 0%, #7d522a 100%)',
        border: `4px solid ${HOUSE_PALETTE.woodDeep}`,
        boxShadow: '0 16px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.08)',
      }}>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: -8,
          width: '84%',
          height: 14,
          transform: 'translateX(-50%)',
          borderRadius: 999,
          background: 'rgba(255,255,255,0.12)',
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
          boxShadow: occupied ? `0 0 12px ${chairGlow}55, 0 6px 10px rgba(0,0,0,0.24)` : '0 6px 10px rgba(0,0,0,0.24)',
        }}>
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
              opacity: 0.9,
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
            MESA ATIVA
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
          boxShadow: '0 8px 14px rgba(0,0,0,0.2)',
          zIndex: 6,
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.4, letterSpacing: '0.12em', color: '#fbbf24' }}>
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
    </div>
  );
}

export default function OfficeView({ agents, agentPositions, meeting, updateInMeeting, selectedAgentId, onSelectAgent, onClearSelection }) {
  const { inMeeting, meetingCount, toggleMeeting } = meeting;
  const activeMeeting = meetingCount > 0;
  const { logs } = useEvents(agents);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const viewportRef = useRef(null);
  const prevSelectedRef = useRef(null);

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
      tone: freshest.type === 'bug_reported' ? '#ef4444' : '#8b5cf6',
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
    ? (inMeeting[selectedAgent.id] ? 'Meeting' : (collaborationStage?.participantIds.includes(selectedAgent.id) ? 'Hall' : selectedAgent.zone))
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
      radial-gradient(circle at 50% 12%, rgba(253,224,71,0.07), transparent 24%),
      linear-gradient(180deg, #24341c 0%, #192514 32%, #10160d 100%)
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
    acc[roomKey] = agents.filter((agent) => !inMeeting[agent.id] && agent.zone === roomKey && !collaborationStage?.participantIds.includes(agent.id));
    return acc;
  }, {});
  const hallAgents = agents.filter((agent) => !inMeeting[agent.id] && (agent.zone === 'Hall' || collaborationStage?.participantIds.includes(agent.id)));
  const signalEvents = logs
    .filter((event) => ['agent_mentioned', 'agent_decision', 'bug_reported', 'agent_blocked'].includes(event.type))
    .slice(0, 3);
  const roomSignals = signalEvents
    .map((event) => {
      const pos = agentPositions.get(event.agentId);
      const displayPos = effectivePositions.get(event.agentId) || pos;
      if (!displayPos) return null;
      return {
        id: event.id,
        x: displayPos.x,
        y: displayPos.y,
        label: event.agentName,
        text: shortSignalText(event.title),
        tone: event.type === 'bug_reported'
          ? '#ef4444'
          : event.type === 'agent_mentioned'
            ? '#8b5cf6'
            : '#86efac',
      };
    })
    .filter(Boolean);

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
              radial-gradient(circle at 50% 0%, rgba(255,255,255,0.08), transparent 22%),
              linear-gradient(180deg, #466a35 0%, #314d25 100%)
            `,
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.04), 0 28px 70px rgba(0,0,0,0.38)',
          }} />

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
            boxShadow: `0 0 0 5px ${HOUSE_PALETTE.wallShade}, 0 24px 50px rgba(0,0,0,0.32)`,
          }} />

          <div style={{
            position: 'absolute',
            left: '9%',
            right: '9%',
            top: '10%',
            bottom: '10%',
            borderRadius: 30,
            background: `
              linear-gradient(180deg, #7c5d3b 0%, #6a4d32 100%)
            `,
            boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.05)',
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

          {WINDOWS.map((windowBox, index) => (
            <div key={index} style={{
              position: 'absolute',
              left: windowBox.left,
              top: windowBox.top,
              width: windowBox.width,
              height: 24,
              borderRadius: 8,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.08))',
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
            background: 'rgba(255,255,255,0.08)',
            filter: 'blur(10px)',
            opacity: 0.5,
            pointerEvents: 'none',
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
              borderRadius: 999,
              background: 'rgba(61,39,23,0.86)',
              border: `1px solid ${decor.accent}60`,
              boxShadow: `0 0 16px ${decor.accent}20`,
            }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.6, letterSpacing: '0.16em', color: decor.accent }}>
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
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }} />
          <div style={{
            position: 'absolute',
            left: '64%',
            top: '10%',
            width: '4%',
            height: '72%',
            borderRadius: 18,
            background: 'repeating-linear-gradient(180deg, #6d4d31 0px, #6d4d31 18px, #79583a 18px, #79583a 22px)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }} />
          <div style={{
            position: 'absolute',
            left: '8%',
            top: '36%',
            width: '84%',
            height: '22%',
            borderRadius: 20,
            background: 'repeating-linear-gradient(90deg, #6d4d31 0px, #6d4d31 18px, #79583a 18px, #79583a 22px)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
          }} />

          <div style={{
            position: 'absolute',
            left: ROOM_STYLES.Hall.area.left,
            top: ROOM_STYLES.Hall.area.top,
            width: ROOM_STYLES.Hall.area.width,
            height: ROOM_STYLES.Hall.area.height,
            borderRadius: 26,
            background: `
              radial-gradient(circle at 50% 30%, rgba(252,231,193,0.08) 0%, transparent 38%),
              linear-gradient(180deg, rgba(116,73,43,0.26) 0%, rgba(88,55,33,0.16) 100%),
              ${ROOM_STYLES.Hall.floor}
            `,
            border: selectedRoomKey === 'Hall' ? '2px solid rgba(243,209,156,0.38)' : '1px solid rgba(243,209,156,0.12)',
            boxShadow: selectedRoomKey === 'Hall' ? '0 0 24px rgba(243,209,156,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '28%',
            top: '74.4%',
            width: '44%',
            height: '5.8%',
            borderRadius: 999,
            background: 'linear-gradient(180deg, rgba(131,67,49,0.58) 0%, rgba(99,51,38,0.28) 100%)',
            border: '1px solid rgba(243,209,156,0.08)',
            boxShadow: '0 12px 20px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '34%',
            top: '76.1%',
            width: '8.6%',
            height: '3%',
            borderRadius: 999,
            background: 'linear-gradient(180deg, #8c6340 0%, #6a472d 100%)',
            border: '1px solid rgba(243,209,156,0.12)',
            boxShadow: '0 8px 14px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '57.4%',
            top: '76.1%',
            width: '8.6%',
            height: '3%',
            borderRadius: 999,
            background: 'linear-gradient(180deg, #8c6340 0%, #6a472d 100%)',
            border: '1px solid rgba(243,209,156,0.12)',
            boxShadow: '0 8px 14px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '44%',
            top: '67.8%',
            width: 150,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 999,
            background: 'rgba(61,39,23,0.88)',
            border: '1px solid rgba(243,209,156,0.2)',
            boxShadow: '0 8px 16px rgba(0,0,0,0.18)',
          }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.8, letterSpacing: '0.14em', color: '#f3d19c' }}>
              GRANDE HALL
            </span>
          </div>

          <div style={{
            position: 'absolute',
            left: '29%',
            top: '72.2%',
            width: '10%',
            height: '6.2%',
            borderRadius: 999,
            background: 'linear-gradient(180deg, rgba(126,88,58,0.52) 0%, rgba(97,63,40,0.28) 100%)',
            border: '1px solid rgba(243,209,156,0.12)',
            boxShadow: '0 10px 18px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '61%',
            top: '72.2%',
            width: '10%',
            height: '6.2%',
            borderRadius: 999,
            background: 'linear-gradient(180deg, rgba(126,88,58,0.52) 0%, rgba(97,63,40,0.28) 100%)',
            border: '1px solid rgba(243,209,156,0.12)',
            boxShadow: '0 10px 18px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            left: '44.6%',
            top: '72.6%',
            width: '10.8%',
            height: '5.1%',
            borderRadius: 999,
            background: 'linear-gradient(180deg, rgba(152,95,41,0.72) 0%, rgba(120,70,25,0.34) 100%)',
            border: '1px solid rgba(253,224,71,0.18)',
            boxShadow: '0 0 16px rgba(245,158,11,0.12)',
            pointerEvents: 'none',
          }} />

          <div style={{
            position: 'absolute',
            left: '49.2%',
            top: '74.6%',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,228,148,0.82) 0%, rgba(245,158,11,0.38) 46%, transparent 74%)',
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

          {DOORS.map((door, index) => (
            <div key={index} style={{
              position: 'absolute',
              ...door,
              borderRadius: 8,
              background: 'linear-gradient(180deg, #4b2e17 0%, #362110 100%)',
              border: '2px solid #7a5934',
            }} />
          ))}

          {Object.keys(ROOM_FIXTURES).map((roomKey) => (
            <RoomShell key={roomKey} roomKey={roomKey} agentsInRoom={roomAgents[roomKey]}>
              {ROOM_FIXTURES[roomKey].map((fixture, index) => (
                <Fixture key={`${roomKey}-${index}`} {...fixture} />
              ))}

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
              width: 128,
              height: 62,
              transform: 'translate(-50%, -50%)',
              borderRadius: 999,
              background: `radial-gradient(circle, ${collaborationStage.tone}22 0%, rgba(243,209,156,0.12) 48%, transparent 75%)`,
              border: `1px dashed ${collaborationStage.tone}55`,
              boxShadow: `0 0 22px ${collaborationStage.tone}22`,
              pointerEvents: 'none',
              zIndex: 10,
            }} />
          )}

          {!activeMeeting && roomSignals.map((signal, index) => (
            <div
              key={signal.id}
              style={{
                position: 'absolute',
                left: `${signal.x}%`,
                top: `${signal.y - 7 - index * 1.5}%`,
                transform: 'translate(-50%, -100%)',
                zIndex: 12,
                pointerEvents: 'none',
              }}
            >
              <div style={{
                position: 'absolute',
                left: '50%',
                top: '100%',
                width: 2,
                height: 18,
                transform: 'translateX(-50%)',
                background: `linear-gradient(180deg, ${signal.tone}aa 0%, transparent 100%)`,
              }} />
              <div style={{
                padding: '5px 8px',
                borderRadius: 10,
                background: 'rgba(47,30,18,0.88)',
                border: `1px solid ${signal.tone}55`,
                boxShadow: '0 8px 16px rgba(0,0,0,0.16)',
                minWidth: 92,
                maxWidth: 132,
              }}>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: signal.tone, letterSpacing: '0.05em' }}>
                  {signal.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.2, color: '#f5e6d3', lineHeight: 1.28, marginTop: 2 }}>
                  {signal.text}
                </div>
              </div>
            </div>
          ))}

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
              boxShadow: `0 0 0 3px ${selectedRoom.color}88, 0 0 28px ${selectedRoom.color}55, inset 0 0 0 2px rgba(255,255,255,0.06)`,
              background: `radial-gradient(circle at 50% 50%, ${selectedRoom.color}14 0%, transparent 68%)`,
              pointerEvents: 'none',
              zIndex: 6,
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
            bottom: 34,
            display: 'flex',
            gap: 10,
            zIndex: 10,
          }}>
            {[
              { label: 'CASA', value: 'rota viva', color: '#f3d19c' },
              { label: 'COMODOS', value: `${agents.length} dentro`, color: '#86efac' },
              { label: 'MESA', value: meetingCount > 0 ? `${meetingCount} sentados` : 'pronta', color: meetingCount > 0 ? '#fde68a' : '#d3c1a4' },
              { label: 'ZOOM', value: `${Math.round(scale * 100)}%`, color: '#bfdbfe' },
            ].map((chip) => (
              <div key={chip.label} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
                padding: '8px 10px',
                borderRadius: 10,
                background: 'rgba(43,28,17,0.84)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#c8aa82', letterSpacing: '0.14em' }}>
                  {chip.label}
                </span>
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.5, color: chip.color }}>
                  {chip.value}
                </span>
              </div>
            ))}
          </div>
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
      />
    </div>
  );
}
