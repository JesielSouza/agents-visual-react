import StatusBadge from './StatusBadge';

const PANEL_BORDER = '1px solid rgba(255,255,255,0.1)';
const TEXT_PRIMARY = '#f5e6d3';
const TEXT_MUTED = '#7b6652';

export default function AgentTooltip({ agent, visible }) {
  if (!visible || !agent) return null;

  return (
    <div
      className="absolute z-50 rounded-xl p-3 text-[11px] shadow-xl min-w-[160px] max-w-[210px] pointer-events-none"
      style={{
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#0f0f0f',
        border: PANEL_BORDER,
        color: TEXT_PRIMARY,
      }}
    >
      <div className="font-bold text-[12px] mb-0.5 truncate">{agent.name || agent.id}</div>
      <div className="text-[10px] mb-2 truncate" style={{ color: TEXT_MUTED }}>{agent.role || '-'}</div>
      <div className="flex justify-between items-center mb-1">
        <span style={{ color: TEXT_MUTED }}>Status</span>
        <StatusBadge status={agent.status} />
      </div>
      <div className="flex justify-between items-center mb-1">
        <span style={{ color: TEXT_MUTED }}>Team</span>
        <span className="text-[10px]">{agent.team || agent.zone || '-'}</span>
      </div>
      <div className="flex justify-between items-center">
        <span style={{ color: TEXT_MUTED }}>Task</span>
        <span className="text-[10px] truncate max-w-[100px] text-right">
          {agent.task || agent.summary || (agent.activity ? (
            agent.activity.progress != null
              ? `${agent.activity.label} · ${Math.round(agent.activity.progress * 100)}%`
              : agent.activity.label
          ) : '-')}
        </span>
      </div>
    </div>
  );
}
