import { useState } from 'react';
import { getAgentDisplayName, isAgentCeo } from '../utils/agentPersona';

/* Gather-like per-team hues + Minish-warm saturation (original) */
const TEAM_COLORS = {
  Engineering: '#5b9fd4',
  Operations: '#5cb85c',
  Communications: '#a78bfa',
  'People Ops': '#f472b8',
  Quality: '#fbbf24',
  Flex: '#2dd4bf',
};

const LLM_COLORS = {
  'openai-codex': '#10a37f',
  'minimax-m2.7': '#ff6b6b',
  'minimax-portal': '#f59e0b',
  'ollama-local': '#8b5cf6',
  'lmstudio-local': '#3b82f6',
};

const PIXEL_ANIM = `
@keyframes px-walk-cycle {
  0% { transform: translate(-50%, -50%) translateY(0) translateX(0); }
  25% { transform: translate(-50%, -50%) translateY(-1px) translateX(0.5px); }
  50% { transform: translate(-50%, -50%) translateY(-2px) translateX(0); }
  75% { transform: translate(-50%, -50%) translateY(-1px) translateX(-0.5px); }
  100% { transform: translate(-50%, -50%) translateY(0) translateX(0); }
}
@keyframes px-idle-hop {
  0%,100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-1px); }
}
@keyframes px-work-lean {
  0%,100% { transform: translate(-50%, -50%) translateY(0) skewX(0deg); }
  50% { transform: translate(-50%, -50%) translateY(-1px) skewX(-1.5deg); }
}
@keyframes px-work-settle {
  0%,100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(1px); }
}
@keyframes px-lantern {
  0%,100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.95; transform: translateX(-50%) scale(1.08); }
}
@keyframes px-select-ring {
  0%,100% { transform: translateX(-50%) scale(1); opacity: 0.65; }
  50% { transform: translateX(-50%) scale(1.08); opacity: 1; }
}
@keyframes px-work-lantern {
  0%,100% { opacity: 0.24; transform: translateX(-50%) scale(0.96); }
  50% { opacity: 0.56; transform: translateX(-50%) scale(1.06); }
}
@keyframes px-walk-shadow {
  0%,100% { transform: translateX(-50%) scaleX(1); opacity: 0.72; }
  50% { transform: translateX(-50%) scaleX(0.82); opacity: 0.92; }
}
@keyframes px-boot-left {
  0%,100% { transform: translate(0, 0); opacity: 0.92; }
  50% { transform: translate(-1px, 1px); opacity: 0.7; }
}
@keyframes px-boot-right {
  0%,100% { transform: translate(0, 1px); opacity: 0.7; }
  50% { transform: translate(1px, 0); opacity: 0.96; }
}
@keyframes px-work-arm {
  0%,100% { transform: translate(0, 0); opacity: 0.82; }
  50% { transform: translate(1px, 1px); opacity: 1; }
}
@keyframes px-meeting-bob {
  0%,100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-1px); }
}
@keyframes px-speak-tilt {
  0%,100% { transform: translate(-50%, -50%) rotate(0deg); }
  50% { transform: translate(-50%, -50%) rotate(-2deg); }
}
@keyframes px-collab-nod {
  0%,100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(1px); }
}
`;

function resolveLLMColor(provider) {
  if (!provider) return '#6b7280';
  if (LLM_COLORS[provider]) return LLM_COLORS[provider];
  if (provider.startsWith('ollama-local')) return LLM_COLORS['ollama-local'];
  return '#9ca3af';
}

function shade(hex, amount) {
  const value = hex.replace('#', '');
  const num = parseInt(value, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function cssShadow(points, color, size) {
  return points.map(([x, y]) => `${x * size}px ${y * size}px 0 ${color}`).join(', ');
}

function hashCode(value) {
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (Math.imul(31, hash) + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function roleVariant(agent) {
  const role = String(agent?.role || '').toLowerCase();
  const team = String(agent?.team || '').toLowerCase();
  if (agent?.id === 'ceo' || team === 'leadership' || role.includes('chief executive')) return 'ceo';
  if (team.includes('quality') || role.includes('qa')) return 'qa';
  if (team.includes('operation') || role.includes('ops') || role.includes('infra')) return 'ops';
  if (team.includes('communication') || role.includes('comunic')) return 'social';
  if (team.includes('people') || role.includes('rh') || role.includes('people')) return 'people';
  if (team.includes('engineering') || role.includes('implement')) return 'dev';
  return 'base';
}

function shortTask(text, fallback = '') {
  if (!text) return fallback;
  const clean = String(text).replace(/[_-]/g, ' ').trim();
  if (!clean) return fallback;
  return clean.length > 18 ? `${clean.slice(0, 17)}...` : clean;
}

function bubbleTextFor(agent, inMeeting, isMoving, meetingSpeech) {
  if (meetingSpeech) return meetingSpeech;
  if (inMeeting) return '';
  if (agent.status === 'blocked') return 'bloqueado';
  if (agent.status === 'waiting_review') return 'revisao?';
  return '';
}

function hasFocusedWork(agent, isMoving, inMeeting) {
  if (inMeeting || isMoving) return false;
  if (!agent) return false;
  const hasTask = !!(agent.current_task || agent.task || agent.summary);
  return hasTask && ['running', 'waiting_review'].includes(agent.status);
}

const FRONT_PARTS = {
  hat: [[2, 0], [3, 0], [4, 0], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1]],
  skin: [[2, 2], [3, 2], [4, 2], [2, 3], [3, 3], [4, 3]],
  eyes: [[2, 3], [4, 3]],
  body: [[2, 4], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5], [2, 6], [3, 6], [4, 6]],
  boots: [[2, 7], [4, 7], [2, 8], [4, 8]],
};

const SIDE_PARTS = {
  hat: [[2, 0], [3, 0], [4, 0], [2, 1], [3, 1], [4, 1]],
  skin: [[2, 2], [3, 2], [2, 3], [3, 3]],
  eyes: [[3, 3]],
  body: [[2, 4], [3, 4], [2, 5], [3, 5], [2, 6], [3, 6], [4, 5]],
  boots: [[2, 7], [3, 7], [2, 8], [3, 8]],
};

const BACK_PARTS = {
  hat: [[2, 0], [3, 0], [4, 0], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [2, 2], [3, 2], [4, 2]],
  hair: [[2, 3], [3, 3], [4, 3]],
  body: [[2, 4], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5], [2, 6], [3, 6], [4, 6]],
  boots: [[2, 7], [4, 7], [2, 8], [4, 8]],
};

const SKIN_VARIANTS = ['#f1c79d', '#e8ba92', '#d6a07a', '#f4d4b3'];
const HAIR_VARIANTS = ['#4b2f24', '#6f4228', '#2f241f', '#8a5c3b', '#7a5a1d'];
const BOOT_VARIANTS = ['#2d1f16', '#3b2818', '#4c3220'];

const ROLE_ACCESSORIES = {
  base: { sash: [], chest: [], hem: [], hair: [], shoulder: [] },
  dev: { sash: [[1, 4], [4, 4]], chest: [[2, 5], [3, 5]], hem: [[1, 6], [4, 6]], hair: [], shoulder: [] },
  qa: { sash: [[1, 2], [2, 2], [3, 2], [4, 2]], chest: [[1, 5], [4, 5]], hem: [[2, 6], [3, 6]], hair: [], shoulder: [] },
  ops: { sash: [[0, 4], [5, 4]], chest: [[1, 5], [2, 5], [3, 5], [4, 5]], hem: [[1, 6], [4, 6]], hair: [], shoulder: [[1, 4], [4, 4]] },
  social: { sash: [[1, 4], [2, 4], [3, 4], [4, 4]], chest: [[1, 5], [4, 5]], hem: [[0, 6], [5, 6]], hair: [[0, 3], [5, 3]], shoulder: [] },
  people: { sash: [[2, 4], [3, 4]], chest: [[2, 5], [3, 5]], hem: [[1, 6], [2, 6], [3, 6], [4, 6]], hair: [[1, 3], [4, 3]], shoulder: [] },
  ceo: { sash: [[1, 4], [2, 4], [3, 4], [4, 4]], chest: [[2, 5], [3, 5]], hem: [[1, 6], [4, 6]], hair: [], shoulder: [[1, 4], [4, 4]] },
};

function SpriteFigure({ agent, color, facing = 'down', isMoving, isBlocked, isDone, isCeo, isWorking, inMeeting, spotlight, isCollaborating }) {
  const pixel = isCeo ? 5 : 4;
  const width = 8 * pixel;
  const height = 10 * pixel;
  const seed = hashCode(`${agent.id}:${agent.team}:${agent.role || ''}`);
  const variant = roleVariant(agent);
  const tunic = isCeo ? '#fbbf24' : color;
  const tunicShade = shade(tunic, -28);
  const hat = isCeo ? '#c9891a' : shade(color, 14);
  const skin = SKIN_VARIANTS[seed % SKIN_VARIANTS.length];
  const hair = HAIR_VARIANTS[(seed >> 2) % HAIR_VARIANTS.length];
  const boots = BOOT_VARIANTS[(seed >> 3) % BOOT_VARIANTS.length];
  const eye = '#1f1720';
  const outline = '#3d2918';
  const cuff = '#f7edd8';
  const accessoryLight = variant === 'qa'
    ? '#d8e7f9'
    : variant === 'ops'
      ? '#c8f0d0'
      : variant === 'social'
        ? '#f0c8ff'
        : variant === 'people'
          ? '#ffd4e8'
          : variant === 'ceo'
            ? '#f5e29e'
            : '#d7e5ff';
  const accessoryDark = variant === 'ops'
    ? '#32453b'
    : variant === 'social'
      ? '#5f3471'
      : variant === 'people'
        ? '#793d58'
        : variant === 'ceo'
          ? '#8c6222'
          : '#32486b';
  const accessories = ROLE_ACCESSORIES[variant] || ROLE_ACCESSORIES.base;
  const parts = facing === 'left' || facing === 'right'
    ? SIDE_PARTS
    : facing === 'up'
      ? BACK_PARTS
      : FRONT_PARTS;

  const spriteStyle = {
    position: 'relative',
    width,
    height,
    imageRendering: 'pixelated',
    transform: facing === 'left' ? 'scaleX(-1)' : 'none',
    filter: isBlocked || isDone ? 'saturate(0.45) brightness(0.8)' : 'none',
    animation: isMoving
      ? 'px-walk-cycle 0.44s steps(2) infinite'
      : spotlight
        ? 'px-speak-tilt 0.9s ease-in-out infinite'
        : inMeeting
          ? 'px-meeting-bob 2.2s ease-in-out infinite'
          : isCollaborating
            ? 'px-collab-nod 1.4s ease-in-out infinite'
      : isWorking
        ? 'px-work-lean 1.2s ease-in-out infinite'
        : 'px-idle-hop 4.8s ease-in-out infinite',
  };

  const workLean = isWorking ? pixel : 0;

  return (
    <div style={spriteStyle}>
      <div style={{
        position: 'absolute',
        inset: 0,
        width: pixel,
        height: pixel,
        boxShadow: cssShadow([...parts.hat, ...(parts.skin || []), ...(parts.hair || []), ...parts.body, ...parts.boots], outline, pixel),
        opacity: 0.85,
        transform: 'translate(0.8px, 0.8px)',
      }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.hat, hat, pixel) }} />
      {parts.skin && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.skin, skin, pixel) }} />
      )}
      {parts.hair && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.hair, hair, pixel) }} />
      )}
      {accessories.hair.length > 0 && facing !== 'up' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(accessories.hair, hair, pixel) }} />
      )}
      {parts.eyes && facing !== 'up' && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.eyes, eye, pixel) }} />
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.body, tunic, pixel) }} />
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: pixel,
        height: pixel,
        boxShadow: cssShadow(parts.body.filter(([, y]) => y >= 5), tunicShade, pixel),
        opacity: 0.7,
      }} />
      {facing !== 'up' && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: pixel,
          height: pixel,
          boxShadow: cssShadow(parts.body.filter(([, y]) => y === 4), cuff, pixel),
          opacity: 0.75,
        }} />
      )}
      {accessories.shoulder.length > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(accessories.shoulder, accessoryDark, pixel), opacity: 0.82 }} />
      )}
      {accessories.sash.length > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(accessories.sash, accessoryLight, pixel), opacity: 0.95 }} />
      )}
      {accessories.chest.length > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(accessories.chest, accessoryLight, pixel), opacity: 0.9 }} />
      )}
      {accessories.hem.length > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(accessories.hem, accessoryDark, pixel), opacity: 0.88 }} />
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.boots, boots, pixel) }} />
      {(isMoving || isWorking) && facing !== 'up' && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: pixel,
            height: pixel,
            boxShadow: cssShadow(
              facing === 'left' || facing === 'right'
                ? [[2, 7 + (isMoving ? 0 : 0)], [3, 8]]
                : [[2, 7], [4, 8]],
              shade(boots, 18),
              pixel,
            ),
            transform: `translate(${workLean}px, ${isMoving ? -pixel : 0}px)`,
            opacity: isMoving ? 0.9 : 0.72,
          }}
        />
      )}
      {isWorking && !isMoving && facing !== 'up' && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: pixel,
              height: pixel,
              boxShadow: cssShadow(
                facing === 'left' || facing === 'right'
                  ? [[4, 5], [4, 6]]
                  : [[1, 5], [5, 5]],
                accessoryLight,
                pixel,
              ),
              animation: 'px-work-arm 0.9s ease-in-out infinite',
              opacity: 0.72,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: pixel,
              height: pixel,
              boxShadow: cssShadow(
                facing === 'left' || facing === 'right'
                  ? [[2, 8], [3, 8]]
                  : [[2, 8], [4, 8]],
                shade(boots, 28),
                pixel,
              ),
              animation: 'px-work-settle 1.1s ease-in-out infinite',
              opacity: 0.82,
            }}
          />
        </>
      )}
      {isMoving && facing !== 'up' && (
        <>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: pixel,
              height: pixel,
              boxShadow: cssShadow(
                facing === 'left' || facing === 'right'
                  ? [[2, 7], [2, 8]]
                  : [[2, 7], [2, 8]],
                shade(boots, 22),
                pixel,
              ),
              animation: 'px-boot-left 0.44s steps(2) infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: pixel,
              height: pixel,
              boxShadow: cssShadow(
                facing === 'left' || facing === 'right'
                  ? [[3, 7], [3, 8]]
                  : [[4, 7], [4, 8]],
                shade(boots, 18),
                pixel,
              ),
              animation: 'px-boot-right 0.44s steps(2) infinite',
            }}
          />
        </>
      )}
    </div>
  );
}

export default function AgentDot({ agent, style, inMeeting, selected = false, onSelect, meetingSpeech = '', spotlight = false }) {
  const [hov, setHov] = useState(false);

  const teamColor = TEAM_COLORS[agent.team] || TEAM_COLORS[agent.zone] || '#7c6f64';
  const isContractor = agent.employmentStatus === 'contractor' || agent.employmentStatus === 'dynamic';
  const color = isContractor ? TEAM_COLORS.Flex : teamColor;
  const llmColor = resolveLLMColor(agent.llm_provider);
  const statusTone = agent.status === 'blocked'
    ? '#ef4444'
    : agent.status === 'waiting_review'
      ? '#f59e0b'
      : agent.status === 'running'
        ? '#86efac'
        : '#d6c5ab';
  const isMoving = !!(style && style.isMoving);
  const facing = style?.facing || 'down';
  const isCeo = isAgentCeo(agent);
  const firstName = getAgentDisplayName(agent);
  const bubbleText = bubbleTextFor(agent, inMeeting, isMoving, meetingSpeech);
  const showBubble = !!bubbleText && (meetingSpeech || hov || selected);
  const showPlate = hov || isMoving || agent.status === 'blocked' || selected || isCeo;
  const isWorking = hasFocusedWork(agent, isMoving, inMeeting);
  const isCollaborating = !inMeeting && !isMoving && !isWorking && ['waiting_review', 'blocked'].includes(agent.status);

  return (
    <div
      style={{
        ...style,
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        zIndex: selected ? 40 : (isCeo ? 28 : 20),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(agent);
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <style>{PIXEL_ANIM}</style>

      <div style={{
        position: 'absolute',
        bottom: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        width: isCeo ? 38 : 32,
        height: isCeo ? 10 : 8,
        borderRadius: '50%',
        background: 'rgba(24,14,9,0.38)',
        filter: 'blur(1.5px)',
        opacity: isMoving ? 0.74 : isWorking ? 1 : 0.96,
        animation: isMoving
          ? 'px-walk-shadow 0.44s steps(2) infinite'
          : isWorking
            ? 'px-work-settle 1.1s ease-in-out infinite'
            : inMeeting || isCollaborating
              ? 'px-work-settle 1.8s ease-in-out infinite'
              : 'none',
      }} />

      <div style={{
        position: 'absolute',
        bottom: 13,
        left: '50%',
        transform: 'translateX(-50%)',
        width: isCeo ? 28 : 22,
        height: 4,
        borderRadius: 999,
        background: isWorking
          ? 'rgba(134,239,172,0.26)'
          : 'rgba(243,209,156,0.14)',
        opacity: isMoving ? 0.2 : isWorking ? 0.74 : 0.5,
      }} />

      <div style={{
        position: 'absolute',
        top: isCeo ? 12 : 10,
        left: '50%',
        transform: 'translateX(-50%)',
        width: spotlight ? 52 : (isCeo ? 42 : 34),
        height: spotlight ? 52 : (isCeo ? 42 : 34),
        borderRadius: '50%',
        background: `radial-gradient(circle, ${
          spotlight
            ? 'rgba(243,209,156,0.18)'
            : selected
              ? 'rgba(243,209,156,0.42)'
              : (isCeo ? 'rgba(251,191,36,0.28)' : `${color}33`)
        } 0%, transparent 70%)`,
        filter: 'blur(4px)',
      }} />
      {isWorking && (
        <div style={{
          position: 'absolute',
          top: isCeo ? 16 : 14,
          left: '50%',
          transform: 'translateX(-50%)',
          width: isCeo ? 38 : 30,
          height: isCeo ? 18 : 14,
          borderRadius: 999,
          background: 'radial-gradient(circle, rgba(147,197,253,0.34) 0%, transparent 72%)',
          filter: 'blur(3px)',
          animation: 'px-work-lantern 1.8s ease-in-out infinite',
        }} />
      )}

      {selected && (
        <div style={{
          position: 'absolute',
          inset: '6px auto auto 50%',
          width: 54,
          height: 54,
          transform: 'translateX(-50%)',
          borderRadius: '50%',
          border: '2px solid rgba(243,209,156,0.72)',
          boxShadow: '0 0 18px rgba(243,209,156,0.3)',
          animation: 'px-select-ring 1.6s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {isCeo && (
        <div style={{
          marginBottom: -4,
          fontSize: 12,
          filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.8))',
          animation: 'px-lantern 2s ease-in-out infinite',
          zIndex: 3,
          color: '#fbbf24',
        }}>
          ^
        </div>
      )}

      {showBubble && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '4px 7px',
          borderRadius: 8,
          background: 'linear-gradient(180deg, rgba(27,19,13,0.96) 0%, rgba(26,26,26,0.92) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 5px 12px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)',
          whiteSpace: 'nowrap',
          zIndex: 4,
        }}>
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 4.9,
            color: '#f5e6d3',
            letterSpacing: '0.06em',
          }}>
            {bubbleText}
          </span>
          <span style={{
            position: 'absolute',
            left: '50%',
            bottom: -4,
            width: 7,
            height: 7,
            background: 'rgba(27,19,13,0.96)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />
        </div>
      )}

      <SpriteFigure
        agent={agent}
        color={color}
        facing={facing}
        isMoving={isMoving}
        isBlocked={agent.status === 'blocked'}
        isDone={agent.status === 'done'}
        isCeo={isCeo}
        isWorking={isWorking}
        inMeeting={inMeeting}
        spotlight={spotlight}
        isCollaborating={isCollaborating}
      />

      {showPlate ? (
        <div style={{
          marginTop: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 9,
          background: 'linear-gradient(180deg, rgba(64,42,25,0.9) 0%, rgba(38,25,15,0.88) 100%)',
          border: '1px solid rgba(243,209,156,0.1)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.16)',
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: 999,
            background: statusTone,
            boxShadow: `0 0 8px ${statusTone}`,
            opacity: agent.status === 'idle' ? 0.55 : 0.92,
          }} />
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 5.8,
            color: '#f2dcc0',
            maxWidth: 70,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            letterSpacing: '0.04em',
          }}>
            {isCeo ? 'CEO' : firstName}
          </span>
        </div>
      ) : (
        <div style={{
          marginTop: 4,
          width: 10,
          height: 10,
          borderRadius: 999,
          background: statusTone,
          boxShadow: `0 0 8px ${statusTone}`,
          opacity: 0.9,
        }} />
      )}

      {hov && (
        <div style={{
          position: 'absolute',
          zIndex: 100,
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, rgba(65,43,27,0.97) 0%, rgba(35,24,16,0.97) 100%)',
          border: '1px solid rgba(243,209,156,0.18)',
          borderRadius: 10,
          padding: '9px 11px',
          minWidth: 170,
          maxWidth: 220,
          boxShadow: `0 8px 18px rgba(0,0,0,0.44), 0 0 0 2px ${isCeo ? 'rgba(251,191,36,0.22)' : `${color}1f`}`,
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.6, color: '#f5e6d3', marginBottom: 4 }}>
            {getAgentDisplayName(agent)}
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#bfa88a', marginBottom: 6 }}>
            {agent.role || agent.current_action || '-'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d' }}>STATUS</span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color }}>{agent.status}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d' }}>SALA</span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#f5e6d3' }}>{agent.team || agent.zone || '-'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d' }}>TAREFA</span>
            <span style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 5,
              color: '#d6c5ab',
              maxWidth: 110,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {agent.current_task || agent.task || agent.summary || (agent.activity ? agent.activity.label : '-')}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d' }}>LLM</span>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: llmColor }}>
              {agent.llm_provider || 'offline'}
            </span>
          </div>
          {(agent.tools_used || []).length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d' }}>FERR.</span>
              <span style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 5,
                color: '#bfdbfe',
                maxWidth: 110,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {(agent.tools_used || []).slice(0, 2).join(', ')}
              </span>
            </div>
          )}
          {isMoving && (
            <div style={{ marginTop: 4, fontFamily: 'var(--font-pixel)', fontSize: 4.6, color: '#93c5fd', textAlign: 'center' }}>
              CAMINHANDO
            </div>
          )}
          {!isMoving && isWorking && (
            <div style={{ marginTop: 4, fontFamily: 'var(--font-pixel)', fontSize: 4.6, color: '#86efac', textAlign: 'center' }}>
              EM FOCO
            </div>
          )}
        </div>
      )}
    </div>
  );
}
