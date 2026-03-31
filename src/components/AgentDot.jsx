import { useState } from 'react';
import { getAgentDisplayName, isAgentCeo } from '../utils/agentPersona';

const TEAM_COLORS = {
  Engineering: '#5b8def',
  Operations: '#5cab68',
  Communications: '#8d6adf',
  'People Ops': '#d96d9f',
  Quality: '#d29a3a',
  Flex: '#55b6a5',
};

const LLM_COLORS = {
  'openai-codex': '#10a37f',
  'minimax-m2.7': '#ff6b6b',
  'minimax-portal': '#f59e0b',
  'ollama-local': '#8b5cf6',
  'lmstudio-local': '#3b82f6',
};

const PIXEL_ANIM = `
@keyframes px-step-bob {
  0%,100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-2px); }
}
@keyframes px-idle-hop {
  0%,100% { transform: translate(-50%, -50%) translateY(0); }
  50% { transform: translate(-50%, -50%) translateY(-1px); }
}
@keyframes px-lantern {
  0%,100% { opacity: 0.55; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.95; transform: translateX(-50%) scale(1.08); }
}
@keyframes px-select-ring {
  0%,100% { transform: translateX(-50%) scale(1); opacity: 0.65; }
  50% { transform: translateX(-50%) scale(1.08); opacity: 1; }
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

function SpriteFigure({ color, facing = 'down', isMoving, isBlocked, isDone, isCeo }) {
  const pixel = isCeo ? 4 : 3;
  const width = 8 * pixel;
  const height = 10 * pixel;
  const tunic = isCeo ? '#fbbf24' : color;
  const tunicShade = shade(tunic, -32);
  const hat = isCeo ? '#c9891a' : shade(color, 18);
  const skin = '#f3c99a';
  const hair = '#5b3820';
  const boots = '#3b2818';
  const eye = '#1f1720';
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
    animation: isMoving ? 'px-step-bob 0.36s steps(2) infinite' : 'px-idle-hop 4.8s ease-in-out infinite',
  };

  return (
    <div style={spriteStyle}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.hat, hat, pixel) }} />
      {parts.skin && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.skin, skin, pixel) }} />
      )}
      {parts.hair && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.hair, hair, pixel) }} />
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
      <div style={{ position: 'absolute', left: 0, top: 0, width: pixel, height: pixel, boxShadow: cssShadow(parts.boots, boots, pixel) }} />
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
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        width: isCeo ? 28 : 24,
        height: isCeo ? 10 : 8,
        borderRadius: '50%',
        background: 'rgba(0,0,0,0.28)',
        filter: 'blur(2px)',
        opacity: isMoving ? 0.68 : 1,
      }} />

      <div style={{
        position: 'absolute',
        top: isCeo ? 12 : 10,
        left: '50%',
        transform: 'translateX(-50%)',
        width: spotlight ? 42 : (isCeo ? 34 : 28),
        height: spotlight ? 42 : (isCeo ? 34 : 28),
        borderRadius: '50%',
        background: `radial-gradient(circle, ${
          spotlight
            ? 'rgba(255,244,214,0.44)'
            : selected
              ? 'rgba(243,209,156,0.42)'
              : (isCeo ? 'rgba(251,191,36,0.28)' : `${color}33`)
        } 0%, transparent 70%)`,
        filter: 'blur(4px)',
      }} />

      {selected && (
        <div style={{
          position: 'absolute',
          inset: '6px auto auto 50%',
          width: 44,
          height: 44,
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
          marginBottom: -2,
          fontSize: 11,
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
          padding: '3px 6px',
          borderRadius: 6,
          background: 'rgba(252,245,233,0.92)',
          border: '1px solid rgba(92,61,37,0.28)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.16)',
          whiteSpace: 'nowrap',
          zIndex: 4,
        }}>
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 5.1,
            color: '#5c3d25',
            letterSpacing: '0.04em',
          }}>
            {bubbleText}
          </span>
          <span style={{
            position: 'absolute',
            left: '50%',
            bottom: -4,
            width: 6,
            height: 6,
            background: 'rgba(252,245,233,0.92)',
            borderRight: '1px solid rgba(92,61,37,0.18)',
            borderBottom: '1px solid rgba(92,61,37,0.18)',
            transform: 'translateX(-50%) rotate(45deg)',
          }} />
        </div>
      )}

      <SpriteFigure
        color={color}
        facing={facing}
        isMoving={isMoving}
        isBlocked={agent.status === 'blocked'}
        isDone={agent.status === 'done'}
        isCeo={isCeo}
      />

      {showPlate ? (
        <div style={{
          marginTop: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 6px',
          borderRadius: 999,
          background: 'rgba(47,30,18,0.82)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        }}>
          <span style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: statusTone,
            boxShadow: `0 0 8px ${statusTone}`,
            opacity: agent.status === 'idle' ? 0.55 : 0.92,
          }} />
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 5.6,
            color: '#f5e6d3',
            maxWidth: 58,
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
          marginTop: 3,
          width: 8,
          height: 8,
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
          background: 'rgba(27,19,13,0.96)',
          border: `2px solid ${isCeo ? '#fbbf24' : `${color}66`}`,
          borderRadius: 6,
          padding: '8px 10px',
          minWidth: 170,
          maxWidth: 220,
          boxShadow: '0 8px 18px rgba(0,0,0,0.44)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.6, color: '#fff5e8', marginBottom: 4 }}>
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
        </div>
      )}
    </div>
  );
}
