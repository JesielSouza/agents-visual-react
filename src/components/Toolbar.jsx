import { useViewport } from '../hooks/useViewport';
import SoundSettings from './SoundSettings';
import { playUiClick, playUiHover } from '../utils/pixelSounds';
import LLMIndicator from './LLMIndicator';
import { getAgentDisplayName, isAgentCeo } from '../utils/agentPersona';
import PixelPortrait from './PixelPortrait';

const TEAM_COLORS = {
  Engineering: '#5b9fd4',
  Operations: '#5cb85c',
  Communications: '#d2a86a',
  'People Ops': '#f472b8',
  Quality: '#fbbf24',
  Flex: '#2dd4bf',
};

function agentMood(agent, commandSignal) {
  const underOrder = commandSignal && commandSignal.agentId === agent.id && Date.now() - commandSignal.at < 90000;
  if (underOrder) return { label: 'ORDEM', tone: '#f3d19c', bg: 'rgba(243,209,156,0.14)' };
  if (agent.in_meeting) return { label: 'MESA', tone: '#d2a86a', bg: 'rgba(210,168,106,0.14)' };
  if (agent.status === 'blocked') return { label: 'BLQ', tone: '#ef4444', bg: 'rgba(239,68,68,0.14)' };
  if (agent.status === 'waiting_review') return { label: 'REV', tone: '#f59e0b', bg: 'rgba(245,158,11,0.14)' };
  if (agent.status === 'running') return { label: 'ATV', tone: '#86efac', bg: 'rgba(134,239,172,0.14)' };
  if (agent.status === 'done') return { label: 'OK', tone: '#a78b6d', bg: 'rgba(167,139,109,0.14)' };
  return { label: 'LIV', tone: '#d6c5ab', bg: 'rgba(214,197,171,0.12)' };
}

export default function Toolbar({ view, onViewChange, agentCount, agents, commandSignal, selectedAgentId, onSelectAgent }) {
  const { width } = useViewport();
  const compact = width < 1120;
  const stacked = width < 860;

  return (
    <div style={{
      minHeight: stacked ? 88 : 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: stacked ? 'wrap' : 'nowrap',
      padding: '0 12px',
      background: 'linear-gradient(180deg, #1b130d 0%, #10160d 100%)',
      borderBottom: '1px solid rgba(255,255,255,0.12)',
      boxShadow: '0 1px 8px rgba(0, 0, 0, 0.28)',
      backdropFilter: 'blur(6px)',
      position: 'relative',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: stacked ? 'auto' : 0 }}>
        <div style={{
          width: 24,
          height: 24,
          background: 'linear-gradient(145deg, #7ec878 0%, #4a9848 100%)',
          borderRadius: 7,
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 2px 6px rgba(60,140,80,0.22), inset 0 1px 0 rgba(255,255,255,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#f5e6d3' }}>AH</span>
        </div>
        <span style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: compact ? 6.2 : 7,
          letterSpacing: '0.12em',
          color: '#f3d19c',
          textShadow: 'none',
        }}>
          CASA DOS AGENTES
        </span>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        minWidth: 0,
        marginLeft: 14,
        marginRight: 14,
        overflowX: 'auto',
        overflowY: 'hidden',
        order: stacked ? 3 : 0,
        width: stacked ? '100%' : 'auto',
        marginTop: stacked ? 2 : 0,
        paddingBottom: stacked ? 6 : 0,
      }}>
        {(agents || []).map((agent) => {
          const selected = selectedAgentId === agent.id;
          const mood = agentMood(agent, commandSignal);
          return (
            <button
              key={agent.id}
              onMouseEnter={playUiHover}
              onClick={() => {
                playUiClick();
                onSelectAgent?.(agent);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 8px',
                borderRadius: 999,
                border: selected ? `1px solid ${mood.tone}` : '1px solid rgba(255,255,255,0.12)',
                background: selected ? '#1a1a1a' : 'rgba(27,19,13,0.78)',
                color: '#f5e6d3',
                fontFamily: 'var(--font-pixel)',
                fontSize: compact ? 4.6 : 5,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selected
                  ? '0 3px 10px rgba(0,0,0,0.28)'
                  : '0 1px 2px rgba(0,0,0,0.22)',
                flexShrink: 0,
              }}
            >
              <span style={{
                width: 19,
                height: 19,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f0f0f',
                border: `2px solid ${TEAM_COLORS[agent.team] || TEAM_COLORS[agent.zone] || '#94a3b8'}`,
                overflow: 'hidden',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.05)',
              }}>
                <PixelPortrait agent={agent} size={15} selected={selected} crown={isAgentCeo(agent)} />
              </span>
              <span>{getAgentDisplayName(agent)}</span>
              <span style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 4,
                color: mood.tone,
                background: mood.bg,
                border: `1px solid ${mood.tone}30`,
                borderRadius: 999,
                padding: '1px 4px',
                letterSpacing: '0.04em',
              }}>
                {mood.label}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <LLMIndicator />
        <SoundSettings />

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 999,
          padding: '4px 10px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.22)',
        }}>
          <svg width="8" height="8" viewBox="0 0 16 16" fill="#22c55e">
            <circle cx="8" cy="5" r="3"/>
            <path d="M3 14a5 5 0 0110 0"/>
          </svg>
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: compact ? 6.1 : 6.8,
            color: '#f3d19c',
          }}>
            {agentCount}
          </span>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: compact ? 4.6 : 5, color: 'rgba(255,240,220,0.5)' }}>
            AGENTES
          </span>
        </div>

        <div style={{
          display: 'flex',
          background: '#1a1a1a',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.12)',
          padding: 2,
          gap: 2,
          boxShadow: '0 1px 2px rgba(0,0,0,0.22)',
        }}>
          {[
            { id: 'world', label: 'ATLAS' },
            { id: 'office', label: 'CASA' },
            { id: 'chat', label: 'CHAT' },
          ].map((item) => {
            const v = item.id;
            const active = view === v;
            return (
              <button
                key={v}
                onMouseEnter={playUiHover}
                onClick={() => {
                  playUiClick();
                  onViewChange(v);
                }}
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: compact ? 5.2 : 5.8,
                  letterSpacing: '0.1em',
                  padding: compact ? '5px 10px' : '5px 12px',
                  borderRadius: 8,
                  border: active ? '1px solid rgba(243,209,156,0.4)' : '1px solid transparent',
                  background: active ? 'linear-gradient(180deg, #1b130d 0%, #111111 100%)' : 'transparent',
                  color: active ? '#f3d19c' : '#a78b6d',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
