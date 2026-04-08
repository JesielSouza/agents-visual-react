import { useViewport } from '../hooks/useViewport';
import { playUiClick, playUiHover } from '../utils/pixelSounds';
import { getAgentDisplayName } from '../utils/agentPersona';

const TEAM_COLORS = {
  Engineering: '#3b82f6',
  Operations: '#22c55e',
  Communications: '#d2a86a',
  'People Ops': '#ec4899',
  Quality: '#f59e0b',
  Flex: '#14b8a6',
};

export default function MeetingPanel({ agents, inMeeting, meetingCount, toggleMeeting, meetingSignal }) {
  const { width, height } = useViewport();
  const participants = agents.filter((a) => inMeeting[a.id]);
  const active = meetingCount > 0;
  const compact = width < 900;

  return (
    <div style={{
      position: 'fixed',
      top: compact ? 'auto' : (active ? 512 : '50%'),
      bottom: compact ? 84 : 'auto',
      right: compact ? 12 : 18,
      transform: compact ? 'none' : (active ? 'none' : 'translateY(-50%)'),
      zIndex: 50,
      background: 'linear-gradient(180deg, rgba(81,55,35,0.97) 0%, rgba(40,27,18,0.98) 100%)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 16,
      padding: 0,
      width: compact ? Math.min(320, width - 24) : 248,
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: compact ? Math.min(340, height - 120) : 'none',
      boxShadow: '0 18px 34px rgba(0,0,0,0.44), 0 0 0 3px rgba(102,73,46,0.88), inset 0 1px 0 rgba(255,255,255,0.05)',
      backdropFilter: 'blur(10px)',
      overflow: 'hidden',
    }}>
      <div style={{
        background: active
          ? 'linear-gradient(90deg, rgba(123,78,35,0.96), rgba(164,112,52,0.88))'
          : 'linear-gradient(90deg, rgba(95,63,97,0.94), rgba(118,84,122,0.84))',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}>
        <svg width="10" height="10" viewBox="0 0 16 16" fill="#f3d19c">
          <path d="M2 14a6 6 0 0012 0V7H2v7zm2-9a3 3 0 110 6 3 3 0 010-6z" />
        </svg>
        <span style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: 7.5,
          letterSpacing: '0.18em',
          color: '#fff7ea',
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
            background: '#f0c15d',
            boxShadow: '0 0 6px #f0c15d',
          }} />
        )}
      </div>

      <div style={{
        padding: '10px 12px 8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0,1fr))',
        gap: 8,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(27,19,13,0.72)',
      }}>
        <div style={{
          padding: '6px 7px',
          borderRadius: 8,
          background: 'rgba(43,29,19,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#8f7a66', letterSpacing: '0.12em' }}>
            SALA
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.8, color: active ? '#fde68a' : '#d3bce0', marginTop: 2 }}>
            {active ? 'ATIVA' : 'PRONTA'}
          </div>
        </div>
        <div style={{
          padding: '6px 7px',
          borderRadius: 8,
          background: 'rgba(43,29,19,0.5)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#8f7a66', letterSpacing: '0.12em' }}>
            TOTAL
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.8, color: active ? '#fff7ea' : '#c2b4a3', marginTop: 2 }}>
            {meetingCount} AGT
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 12px', minHeight: 96, overflowY: compact ? 'auto' : 'visible', maxHeight: compact ? Math.min(206, height - 214) : 'none' }}>
        {meetingSignal && (
          <div style={{
            marginBottom: 8,
            padding: '7px 8px',
            borderRadius: 8,
            background: meetingSignal.kind === 'active'
              ? 'rgba(240,193,93,0.12)'
              : 'rgba(208,178,222,0.12)',
            border: `1px solid ${meetingSignal.kind === 'active'
              ? 'rgba(240,193,93,0.22)'
              : 'rgba(208,178,222,0.22)'}`,
          }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: meetingSignal.kind === 'active' ? '#fde68a' : '#d3bce0' }}>
              {meetingSignal.label}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.2, color: '#e8dcc8', lineHeight: 1.35, marginTop: 4 }}>
              {meetingSignal.text}
            </div>
          </div>
        )}

        {participants.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 5.5,
          color: '#8b7257',
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
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: tc,
                  border: '1px solid rgba(255,255,255,0.12)',
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
                  color: '#a28769',
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
            color: '#cfb2de',
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
          borderTop: '1px solid rgba(255,255,255,0.12)',
          background: 'linear-gradient(180deg, rgba(58,39,25,0.2) 0%, rgba(35,24,16,0.28) 100%)',
          color: active ? '#f0c15d' : '#d0b2de',
          fontFamily: 'var(--font-pixel)',
          fontSize: 7,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = active ? 'rgba(240,193,93,0.1)' : 'rgba(208,178,222,0.1)';
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
