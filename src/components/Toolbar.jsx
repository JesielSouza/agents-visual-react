import SoundSettings from './SoundSettings';
import { playUiClick, playUiHover } from '../utils/pixelSounds';
import LLMIndicator from './LLMIndicator';
import { getAgentDisplayName, getAgentFace } from '../utils/agentPersona';

export default function Toolbar({ view, onViewChange, agentCount, agents, selectedAgentId, onSelectAgent }) {
  return (
    <div style={{
      height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      background: '#1b130d',
      borderBottom: '2px solid rgba(243,209,156,0.15)',
      position: 'relative', zIndex: 100,
    }}>
      {/* Logo / title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 24, height: 24,
          background: 'linear-gradient(135deg, #d7b27d, #8b5a2b)',
          borderRadius: 4,
          border: '2px solid rgba(255,255,255,0.15)',
          boxShadow: '0 0 8px rgba(215,178,125,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: '#fff7ed' }}>AH</span>
        </div>
        <span style={{
          fontFamily: 'var(--font-pixel)', fontSize: 8, letterSpacing: '0.15em',
          color: '#f3d19c', textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
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
        marginLeft: 18,
        marginRight: 18,
        overflowX: 'auto',
        overflowY: 'hidden',
      }}>
        {(agents || []).map((agent) => {
          const selected = selectedAgentId === agent.id;
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
                gap: 7,
                padding: '6px 9px',
                borderRadius: 999,
                border: selected ? '1px solid rgba(243,209,156,0.6)' : '1px solid rgba(255,255,255,0.08)',
                background: selected ? 'rgba(243,209,156,0.14)' : '#241912',
                color: selected ? '#f3d19c' : '#f5e6d3',
                fontFamily: 'var(--font-pixel)',
                fontSize: 5.6,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: selected ? '0 0 10px rgba(243,209,156,0.12)' : 'none',
                flexShrink: 0,
              }}
            >
              <span style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff7ed',
                fontFamily: 'var(--font-pixel)',
                fontSize: 4.6,
              }}>
                {getAgentFace(agent)}
              </span>
              <span>{getAgentDisplayName(agent)}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <LLMIndicator />
        <SoundSettings />

        {/* Agent counter */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#241912',
          border: '1px solid rgba(134,239,172,0.25)',
          borderRadius: 4, padding: '4px 10px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}>
          {/* Person icon */}
          <svg width="8" height="8" viewBox="0 0 16 16" fill="rgba(134,239,172,0.8)">
            <circle cx="8" cy="5" r="3"/>
            <path d="M3 14a5 5 0 0110 0"/>
          </svg>
          <span style={{
            fontFamily: 'var(--font-pixel)', fontSize: 7.5,
            color: '#86efac', textShadow: '0 0 6px rgba(134,239,172,0.25)',
          }}>
            {agentCount}
          </span>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.5, color: 'rgba(255,240,220,0.32)' }}>
            AGENTES
          </span>
        </div>

        {/* View toggle */}
        <div style={{
          display: 'flex',
          background: '#241912',
          borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.1)',
          padding: 2,
          gap: 2,
        }}>
          {[
            { id: 'world', label: 'ATLAS' },
            { id: 'office', label: 'CASA' },
          ].map((item) => {
            const v = item.id;
            const active = view === v;
            return (
              <button key={v} onMouseEnter={playUiHover} onClick={() => {
                playUiClick();
                onViewChange(v);
              }} style={{
                fontFamily: 'var(--font-pixel)', fontSize: 6.5, letterSpacing: '0.1em',
                padding: '6px 14px',
                borderRadius: 3,
                border: active ? '1px solid rgba(243,209,156,0.55)' : '1px solid transparent',
                background: active ? 'rgba(243,209,156,0.14)' : 'transparent',
                color: active ? '#f3d19c' : 'rgba(255,240,220,0.35)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: active ? '0 0 8px rgba(243,209,156,0.12)' : 'none',
                transition: 'all 0.2s',
              }}>
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
