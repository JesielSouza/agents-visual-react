import { useViewport } from '../hooks/useViewport';
import { getAgentCompetencies, getAgentDisplayName, getAgentFunction, isAgentCeo } from '../utils/agentPersona';
import PixelPortrait from './PixelPortrait';

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
  if (status === 'done') return '#a78b6d';
  return '#d6c5ab';
}

function commandTone(commandSignal, selectedAgent) {
  const active = commandSignal && commandSignal.agentId === selectedAgent.id && Date.now() - commandSignal.at < 90000;
  if (!active) return null;
  return {
    label: 'SOB ORDEM',
    color: '#f3d19c',
    bg: 'rgba(243,209,156,0.1)',
  };
}

export default function AgentBar({ selectedAgent, commandAgent, commandSignal, onClearSelection }) {
  if (!selectedAgent) return null;

  const { width } = useViewport();
  const stacked = width < 980;
  const competencies = getAgentCompetencies(selectedAgent);
  const statusColor = toneForStatus(selectedAgent.status);
  const orderState = commandTone(commandSignal, selectedAgent);
  const otherCommandAgent = commandAgent && commandAgent.id !== selectedAgent.id ? commandAgent : null;

  return (
    <div style={{
      minHeight: 96,
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      background: 'linear-gradient(180deg, #1b130d 0%, #10160d 100%)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      padding: '8px 14px 10px',
      position: 'relative',
      zIndex: 30,
    }}>
      <div style={{
        display: 'flex',
        alignItems: stacked ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexDirection: stacked ? 'column' : 'row',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 0,
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: '#0f0f0f',
            border: `2px solid ${statusColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
          }}>
            <PixelPortrait agent={selectedAgent} size={30} selected crown={isAgentCeo(selectedAgent)} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.2, color: '#f3d19c', letterSpacing: '0.08em' }}>
                {getAgentDisplayName(selectedAgent)}
              </span>
              <span style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 4.6,
                color: statusColor,
                background: `${statusColor}15`,
                border: `1px solid ${statusColor}28`,
                borderRadius: 999,
                padding: '2px 6px',
              }}>
                {STATUS_LABELS[selectedAgent.status] || selectedAgent.status}
              </span>
              {selectedAgent.in_meeting && (
                <span style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: 4.6,
                  color: '#d2a86a',
                  background: 'rgba(210,168,106,0.12)',
                  border: '1px solid rgba(210,168,106,0.24)',
                  borderRadius: 999,
                  padding: '2px 6px',
                }}>
                  EM MESA
                </span>
              )}
              {orderState && (
                <span style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: 4.6,
                  color: orderState.color,
                  background: orderState.bg,
                  border: `1px solid ${orderState.color}28`,
                  borderRadius: 999,
                  padding: '2px 6px',
                }}>
                  {orderState.label}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: 'rgba(255,240,220,0.5)' }}>
                FUNCAO - {getAgentFunction(selectedAgent)}
              </span>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#f3d19c' }}>
                COMODO - {selectedAgent.zone || selectedAgent.team || '-'}
              </span>
              {selectedAgent.llm_provider && (
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#a78b6d' }}>
                  LLM - {selectedAgent.llm_provider}
                </span>
              )}
              {otherCommandAgent && (
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#b45309' }}>
                  ORDEM EM - {getAgentDisplayName(otherCommandAgent)}
                </span>
              )}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.8, color: '#f5e6d3', marginTop: 4, lineHeight: 1.38 }}>
              {shortTask(selectedAgent)}
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          maxWidth: stacked ? '100%' : '52%',
          width: stacked ? '100%' : 'auto',
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.6, color: 'rgba(255,240,220,0.5)', letterSpacing: '0.1em' }}>
            COMPETENCIAS
          </span>
          {competencies.map((item) => (
            <span
              key={item}
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 4.7,
                color: '#f3d19c',
                background: '#1a1a1a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 999,
                padding: '2px 6px',
                boxShadow: 'none',
              }}
            >
              {item}
            </span>
          ))}
          <button
            onClick={() => onClearSelection?.()}
            style={{
              marginLeft: 6,
              padding: '5px 8px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#1a1a1a',
              color: '#a78b6d',
              fontFamily: 'var(--font-pixel)',
              fontSize: 4.8,
              cursor: 'pointer',
            }}
          >
            LIMPAR FOCO
          </button>
        </div>
      </div>
    </div>
  );
}
