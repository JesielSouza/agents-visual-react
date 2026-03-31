import { useState } from 'react';
import { useEvents } from '../hooks/useEvents';
import { playUiClick, playUiHover } from '../utils/pixelSounds';

const CATEGORIES = [
  { key: 'all',      label: 'TODOS',    icon: '◆', color: '#9ca3af' },
  { key: 'deploy',    label: 'DEPLOY',   icon: '▲', color: '#22c55e' },
  { key: 'bug',       label: 'BUG',      icon: '●', color: '#ef4444' },
  { key: 'status',    label: 'STATUS',   icon: '◉', color: '#60a5fa' },
  { key: 'meeting',   label: 'REUNIAO',  icon: '◎', color: '#a78bfa' },
  { key: 'task',      label: 'TAREFA',   icon: '☑', color: '#f59e0b' },
  { key: 'llm',       label: 'LLM',      icon: '!', color: '#facc15' },
];

const TEAM_COLORS = {
  Engineering:    '#3b82f6',
  Operations:    '#22c55e',
  Communications:'#8b5cf6',
  'People Ops':  '#ec4899',
  Quality:       '#f59e0b',
  Flex:          '#14b8a6',
};

function fmt(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function relTime(date) {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h`;
}

function getCategory(type) {
  if (type === 'llm_fallback') return 'llm';
  if (type === 'hired' || type === 'removed') return 'status';
  if (type === 'meeting_started' || type === 'meeting_ended' || type === 'agent_joined_meeting') return 'meeting';
  if (type === 'task_started' || type === 'task_completed' || type === 'pr_opened' || type === 'pr_merged') return 'task';
  if (type.includes('bug') || type.includes('fix')) return 'bug';
  if (type.includes('deploy') || type.includes('build')) return 'deploy';
  return 'status';
}

export default function LogPanel({ agents }) {
  const { logs } = useEvents(agents);
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState('all');

  const filtered = cat === 'all' ? logs : logs.filter((e) => {
    const c = getCategory(e.type);
    return c === cat;
  });

  // Count by category
  const counts = {};
  CATEGORIES.forEach((c) => { counts[c.key] = 0; });
  logs.forEach((e) => {
    const c = getCategory(e.type);
    if (counts[c] !== undefined) counts[c]++;
  });

  return (
    <>
      {/* Toggle */}
      <button
        onMouseEnter={playUiHover}
        onClick={() => {
          playUiClick();
          setOpen((v) => !v);
        }}
        style={{
          position: 'fixed', bottom: 16, left: open ? 420 : 380, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: open ? '#0a0a0a' : '#1a1a1a',
          border: `2px solid ${open ? '#22c55e' : '#374151'}`,
          borderRadius: 6, cursor: 'pointer',
          boxShadow: open ? '0 0 10px rgba(34,197,94,0.2)' : '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill={open ? '#22c55e' : '#6b7280'}>
          <rect x="2" y="2" width="12" height="12" rx="2" stroke={open ? '#22c55e' : '#6b7280'} strokeWidth="1.5" fill="none"/>
          <line x1="5" y1="6" x2="11" y2="6" stroke={open ? '#22c55e' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="5" y1="9" x2="9" y2="9" stroke={open ? '#22c55e' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, letterSpacing: '0.15em', color: open ? '#22c55e' : '#9ca3af' }}>
          LOG
        </span>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, background: '#22c55e', color: '#000', borderRadius: 3, padding: '1px 5px' }}>
          {logs.length}
        </span>
      </button>

      {/* Drawer */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 56, left: 16, zIndex: 50,
          width: 380, maxHeight: 360,
          background: '#0a0a0a',
          borderTop: '3px solid #22c55e',
          borderLeft: '1px solid #1f2937',
          borderRight: '1px solid #1f2937',
          borderBottom: '1px solid #1f2937',
          borderRadius: '6px 6px 0 0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px',
            borderBottom: '1px solid #1f2937', background: '#0f0f0f',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, letterSpacing: '0.2em', color: '#22c55e' }}>
              &gt; FEED
            </span>

            {/* Category pills */}
            <div style={{ display: 'flex', gap: 3, marginLeft: 4, flexWrap: 'wrap' }}>
              {CATEGORIES.map((c) => (
                <button key={c.key} onMouseEnter={playUiHover} onClick={() => {
                  playUiClick();
                  setCat(c.key);
                }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    fontFamily: 'var(--font-pixel)', fontSize: 4.5,
                    padding: '3px 6px',
                    borderRadius: 3,
                    border: cat === c.key ? `1px solid ${c.color}` : '1px solid #374151',
                    background: cat === c.key ? `${c.color}15` : 'transparent',
                    color: cat === c.key ? c.color : '#4b5563',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 6 }}>{c.icon}</span>
                  <span>{c.label}</span>
                  {c.key !== 'all' && counts[c.key] > 0 && (
                    <span style={{ background: `${c.color}30`, color: c.color, borderRadius: 3, padding: '0 3px', fontSize: 4 }}>
                      {counts[c.key]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Entries */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#374151', letterSpacing: '0.1em' }}>
                &gt; NENHUM EVENTO
              </div>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {/* Timeline line */}
                <div style={{ position: 'absolute', left: 28, top: 0, bottom: 0, width: 1, background: 'rgba(34,197,94,0.1)' }} />

                {filtered.slice(0, 60).map((e, i) => {
                  const c = getCategory(e.type);
                  const catDef = CATEGORIES.find((x) => x.key === c) || CATEGORIES[3];
                  const tc = TEAM_COLORS[e.agentTeam] || '#555';

                  return (
                    <div key={e.id || i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 0,
                      padding: '5px 12px',
                      position: 'relative',
                    }}>
                      {/* Timeline dot */}
                      <div style={{
                        position: 'relative', zIndex: 2,
                        width: 8, height: 8, borderRadius: '50%',
                        background: catDef.color,
                        border: `2px solid ${catDef.color}`,
                        marginTop: 6, marginRight: 10,
                        flexShrink: 0,
                        boxShadow: `0 0 4px ${catDef.color}60`,
                      }} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          marginBottom: 1,
                        }}>
                          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#4b5563', minWidth: 36 }}>
                            {fmt(e.time)}
                          </span>
                          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: catDef.color }}>
                            {catDef.icon}
                          </span>
                          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.5, color: '#e5e7eb', fontWeight: 700 }}>
                            {e.agentName}
                          </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#9ca3af', lineHeight: 1.3, paddingLeft: 0 }}>
                          {e.title}
                        </div>
                        {e.meta && (
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: '#374151', marginTop: 1, paddingLeft: 0 }}>
                            {e.meta}
                          </div>
                        )}
                      </div>

                      <span style={{
                        fontFamily: 'var(--font-pixel)', fontSize: 4,
                        color: catDef.color, background: `${catDef.color}15`,
                        borderRadius: 2, padding: '1px 4px',
                        flexShrink: 0, marginTop: 4,
                        border: `1px solid ${catDef.color}40`,
                      }}>
                        {e.badge}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
