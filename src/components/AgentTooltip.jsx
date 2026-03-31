import StatusBadge from './StatusBadge';

export default function AgentTooltip({ agent, visible }) {
  if (!visible || !agent) return null;

  return (
    <div className="absolute z-50 bg-[rgba(14,13,11,0.97)] border border-white/10 rounded-xl p-3 text-[11px] text-[#d4d0c8] shadow-xl min-w-[160px] max-w-[210px] pointer-events-none"
      style={{ bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' }}>
      <div className="font-bold text-[12px] mb-0.5 truncate">{agent.name || agent.id}</div>
      <div className="text-[#555] text-[10px] mb-2 truncate">{agent.role || '-'}</div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[#555]">Status</span>
        <StatusBadge status={agent.status} />
      </div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[#555]">Team</span>
        <span className="text-[10px]">{agent.team || agent.zone || '-'}</span>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-[#555]">Task</span>
        <span className="text-[10px] truncate max-w-[100px] text-right">
          {agent.task || agent.summary || (agent.activity ? `${agent.activity.label} · ${Math.round(agent.activity.progress * 100)}%` : '-')}
        </span>
      </div>
    </div>
  );
}
