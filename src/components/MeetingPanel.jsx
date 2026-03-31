import { playUiClick, playUiHover } from '../utils/pixelSounds';
import { getAgentDisplayName } from '../utils/agentPersona';

const TEAM_COLORS = {
  Engineering: '#3b82f6',
  Operations: '#22c55e',
  Communications: '#8b5cf6',
  'People Ops': '#ec4899',
  Quality: '#f59e0b',
  Flex: '#14b8a6',
};

export default function MeetingPanel({ agents, inMeeting, meetingCount, toggleMeeting }) {
  const participants = agents.filter((a) => inMeeting[a.id]);
  const active = meetingCount > 0;

  return (
    <div style={{
      position: 'fixed',
      top: active ? 512 : '50%',
      right: 18,
      transform: active ? 'none' : 'translateY(-50%)',
      zIndex: 50,
      background: 'rgba(25,17,13,0.9)',
      border: `1px solid ${active ? '#d97706aa' : '#7c3aed66'}`,
      borderRadius: 14,
      padding: 0,
      width: 248,
      boxShadow: '0 18px 34px rgba(0,0,0,0.44), inset 0 1px 0 rgba(255,255,255,0.04)',
      backdropFilter: 'blur(10px)',
      overflow: 'hidden',
    }}>
      <div style={{
        background: active
          ? 'linear-gradient(90deg, rgba(120,53,15,0.95), rgba(161,98,7,0.86))'
          : 'linear-gradient(90deg, rgba(76,29,149,0.95), rgba(91,33,182,0.82))',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderBottom: `1px solid ${active ? '#d97706' : '#7c3aed'}50`,
      }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="rgba(255,255,255,0.8)">
          <path d="M2 14a6 6 0 0012 0V7H2v7zm2-9a3 3 0 110 6 3 3 0 010-6z" />
        </svg>
        <span style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: 7.5,
          letterSpacing: '0.18em',
          color: '#fff',
          textShadow: '1px 1px 0 rgba(0,0,0,0.4)',
        }}>
          REUNIAO
        </span>
        {active && (
          <span style={{
            marginLeft: 'auto',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#f59e0b',
            boxShadow: '0 0 6px #f59e0b',
          }} />
        )}
      </div>

      <div style={{
        padding: '10px 12px 8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
        gap: 8,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{
          padding: '6px 7px',
          borderRadius: 8,
          background: 'rgba(8,12,18,0.34)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#8f7a66', letterSpacing: '0.12em' }}>
            SALA
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.8, color: active ? '#fde68a' : '#c4b5fd', marginTop: 2 }}>
            {active ? 'ATIVA' : 'PRONTA'}
          </div>
        </div>
        <div style={{
          padding: '6px 7px',
          borderRadius: 8,
          background: 'rgba(8,12,18,0.34)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#8f7a66', letterSpacing: '0.12em' }}>
            TOTAL
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.8, color: active ? '#fff' : '#94a3b8', marginTop: 2 }}>
            {meetingCount} AGT
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 12px', minHeight: 96 }}>
        {participants.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 5.5,
            color: '#6f5a46',
            textAlign: 'center',
            padding: '10px 0',
          }}>
            NINGUEM NA REUNIAO
          </div>
        ) : (
          participants.slice(0, 5).map((a) => {
            const tc = TEAM_COLORS[a.team] || TEAM_COLORS[a.zone] || '#555';
            return (
              <div key={a.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: tc,
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: `0 0 4px ${tc}60`,
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: 6.4,
                    color: '#e8dcc8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {getAgentDisplayName(a)}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: 4.8,
                    color: '#8f7a66',
                    letterSpacing: '0.05em',
                  }}>
                    {a.status}
                  </div>
                </div>
                <div style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: tc,
                  opacity: 0.5,
                  flexShrink: 0,
                }} />
              </div>
            );
          })
        )}
        {participants.length > 5 && (
          <div style={{
            marginTop: 6,
            fontFamily: 'var(--font-pixel)',
            fontSize: 5,
            color: '#a78bfa',
            textAlign: 'center',
            letterSpacing: '0.1em',
          }}>
            +{participants.length - 5} OUTROS
          </div>
        )}
      </div>

      <button
        onMouseEnter={playUiHover}
        onClick={() => {
          playUiClick();
          toggleMeeting();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          padding: '12px 14px',
          border: 'none',
          borderTop: `1px solid ${active ? '#d97706aa' : '#7c3aed66'}`,
          background: 'transparent',
          color: active ? '#f59e0b' : '#8b5cf6',
          fontFamily: 'var(--font-pixel)',
          fontSize: 7,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnterCapture={(e) => {
          e.currentTarget.style.background = active ? 'rgba(245,158,11,0.08)' : 'rgba(139,92,246,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {active ? 'ENCERRAR REUNIAO' : 'CHAMAR TODOS'}
      </button>
    </div>
  );
}
