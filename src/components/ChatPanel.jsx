import { useState, useRef, useEffect } from 'react';
import { useChat, relativeTime } from '../hooks/useChat';
import { playUiClick, playUiHover } from '../utils/pixelSounds';

const PANEL_BORDER = 'rgba(255,255,255,0.08)';
const TEXT_PRIMARY = '#f5e6d3';
const TEXT_MUTED = '#7b6652';

const TEAM_COLORS = {
  Engineering:    '#3b82f6',
  Operations:    '#22c55e',
  Communications:'#8b5cf6',
  'People Ops':  '#ec4899',
  Quality:       '#f59e0b',
  Flex:          '#14b8a6',
};

const TYPE_COLORS = {
  direct:    { border: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  broadcast:  { border: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
  system:     { border: '#f59e0b', bg: 'rgba(245,158,11,0.06)' },
};

const FILTERS = [
  { key: 'all', label: 'ALL' },
  { key: 'direct', label: 'DIRECT' },
  { key: 'broadcast', label: 'BROADCAST' },
  { key: 'system', label: 'SYSTEM' },
];

function Avatar({ name, team, size = 8 }) {
  const color = TEAM_COLORS[team] || '#555';
  const initials = (name || '??').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size,
      background: '#1a1d23',
      border: `1.5px solid ${color}`,
      borderRadius: 2,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800,
      fontFamily: 'var(--font-pixel)',
      color: color,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function ChatPanel({ agents }) {
  const { messages, unread, filter, setFilter, markRead } = useChat(agents);
  const [open, setOpen] = useState(false);
  const listRef = useRef(null);
  const prevLenRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (open && listRef.current && messages.length > prevLenRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevLenRef.current = messages.length;
  }, [messages.length, open]);

  const filtered = filter === 'all' ? messages : messages.filter((m) => m.type === filter);

  const handleOpen = () => {
    setOpen(true);
    markRead();
  };

  return (
    <>
      {/* Toggle button — left side, above LogPanel's button */}
      <button
        onMouseEnter={playUiHover}
        onClick={open ? () => {
          playUiClick();
          setOpen(false);
        } : () => {
          playUiClick();
          handleOpen();
        }}
        style={{
          position: 'fixed', bottom: 16, left: open ? 196 : 16, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: open ? '#0a0a0a' : '#1a1a1a',
          border: `2px solid ${open ? '#8b5cf6' : '#374151'}`,
          borderRadius: 6,
          cursor: 'pointer',
          boxShadow: open ? '0 0 10px rgba(139,92,246,0.2)' : '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
        }}
      >
        {/* Chat bubble icon */}
        <svg width="10" height="10" viewBox="0 0 16 16" fill={open ? '#8b5cf6' : '#6b7280'}>
          <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H6l-3 3V3z" stroke={open ? '#8b5cf6' : '#6b7280'} strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
        </svg>

        <span style={{
          fontFamily: 'var(--font-pixel)', fontSize: 6, letterSpacing: '0.15em',
          color: open ? '#8b5cf6' : '#9ca3af',
        }}>
          CHAT
        </span>

        {unread > 0 && (
          <span style={{
            fontFamily: 'var(--font-pixel)', fontSize: 5,
            background: '#ef4444', color: TEXT_PRIMARY,
            borderRadius: 3, padding: '1px 5px',
            animation: 'pulse 1s infinite',
          }}>
            {unread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 56, left: 16, zIndex: 50,
          width: 360, maxHeight: 380,
          background: '#0a0a0a',
          borderTop: '3px solid #8b5cf6',
          borderLeft: '1px solid #1f2937',
          borderRight: '1px solid #1f2937',
          borderBottom: '1px solid #1f2937',
          borderRadius: '6px 6px 0 0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid #1f2937',
            background: '#0f0f0f',
          }}>
            <span style={{
              fontFamily: 'var(--font-pixel)', fontSize: 6, letterSpacing: '0.2em',
              color: '#8b5cf6',
            }}>
              &gt; CHAT
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {FILTERS.map((f) => (
                <button key={f.key} onMouseEnter={playUiHover} onClick={() => {
                  playUiClick();
                  setFilter(f.key);
                }}
                  style={{
                    fontFamily: 'var(--font-pixel)', fontSize: 4.5, letterSpacing: '0.05em',
                    padding: '3px 6px',
                    borderRadius: 3,
                    border: filter === f.key ? '1px solid #8b5cf6' : '1px solid #374151',
                    background: filter === f.key ? 'rgba(139,92,246,0.1)' : 'transparent',
                    color: filter === f.key ? '#8b5cf6' : TEXT_MUTED,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{
                padding: '24px 12px', textAlign: 'center',
                fontFamily: 'var(--font-pixel)', fontSize: 5,
                color: '#374151', letterSpacing: '0.1em',
              }}>
                NENHUMA MENSAGEM
              </div>
            ) : (
              filtered.map((msg) => {
                const tc = TYPE_COLORS[msg.type] || TYPE_COLORS.direct;
                const agentColor = TEAM_COLORS[msg.fromTeam] || '#555';
                return (
                  <div key={msg.id} style={{
                    padding: '8px 12px',
                    borderBottom: `1px solid ${PANEL_BORDER}`,
                    background: msg.read ? 'transparent' : tc.bg,
                    borderLeft: `2px solid ${tc.border}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Avatar name={msg.fromName} team={msg.fromTeam} size={10} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          marginBottom: 2,
                        }}>
                          <span style={{
                            fontFamily: 'var(--font-pixel)', fontSize: 5.5,
                            color: agentColor, fontWeight: 700,
                          }}>
                            {msg.fromName}
                          </span>
                          <span style={{
                            fontFamily: 'var(--font-pixel)', fontSize: 4.5,
                            color: TEXT_MUTED,
                          }}>
                            {relativeTime(msg.timestamp)}
                          </span>
                        </div>
                        <div style={{
                          fontFamily: 'var(--font-mono)', fontSize: 9,
                          color: TEXT_PRIMARY, lineHeight: 1.4,
                          wordBreak: 'break-word',
                        }}>
                          {msg.type === 'direct' && (
                            <span style={{ color: '#60a5fa' }}>@</span>
                          )}
                          {msg.message}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
