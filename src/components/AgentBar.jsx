import { getAgentCompetencies, getAgentDisplayName, getAgentFace, getAgentFunction } from '../utils/agentPersona';

const STATUS_LABELS = {
  running: 'ativo',
  waiting_review: 'em revisao',
  blocked: 'bloqueado',
  done: 'feito',
  idle: 'parado',
};

function shortTask(agent) {
  const value = agent.current_task || agent.task || agent.summary || agent.current_action || '';
  if (!value) return 'Sem tarefa visivel';
  return value.length > 88 ? `${value.slice(0, 87)}...` : value;
}

function toneForStatus(status) {
  if (status === 'blocked') return '#ef4444';
  if (status === 'waiting_review') return '#f59e0b';
  if (status === 'running') return '#86efac';
  if (status === 'done') return '#93c5fd';
  return '#d6c5ab';
}

export default function AgentBar({ selectedAgent, onClearSelection }) {
  if (!selectedAgent) return null;

  const competencies = getAgentCompetencies(selectedAgent);
  const statusColor = toneForStatus(selectedAgent.status);

  return (
    <div style={{
      minHeight: 98,
      borderBottom: '1px solid rgba(243,209,156,0.12)',
      background: 'linear-gradient(180deg, rgba(30,21,15,0.96) 0%, rgba(22,16,12,0.96) 100%)',
      boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.03)',
      padding: '10px 16px 12px',
      position: 'relative',
      zIndex: 30,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 0,
        }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(243,209,156,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-pixel)',
            fontSize: 7,
            color: '#fff7ed',
            flexShrink: 0,
          }}>
            {getAgentFace(selectedAgent)}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: '#f5e6d3', letterSpacing: '0.08em' }}>
                {getAgentDisplayName(selectedAgent)}
              </span>
              <span style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 5,
                color: statusColor,
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}28`,
                borderRadius: 999,
                padding: '2px 6px',
              }}>
                {STATUS_LABELS[selectedAgent.status] || selectedAgent.status}
              </span>
            </div>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#c7b092', marginTop: 4 }}>
              FUNCAO · {getAgentFunction(selectedAgent)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.6, color: '#e1d3c0', marginTop: 4, lineHeight: 1.4 }}>
              {shortTask(selectedAgent)}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          maxWidth: '50%',
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d', letterSpacing: '0.1em' }}>
            COMPETENCIAS
          </span>
          {competencies.map((item) => (
            <span
              key={item}
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 5.1,
                color: '#f3d19c',
                background: 'rgba(243,209,156,0.08)',
                border: '1px solid rgba(243,209,156,0.2)',
                borderRadius: 999,
                padding: '3px 7px',
              }}
            >
              {item}
            </span>
          ))}
          <button
            onClick={() => onClearSelection?.()}
            style={{
              marginLeft: 6,
              padding: '6px 9px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: '#d6c5ab',
              fontFamily: 'var(--font-pixel)',
              fontSize: 5.2,
              cursor: 'pointer',
            }}
          >
            FECHAR
          </button>
        </div>
      </div>
    </div>
  );
}
