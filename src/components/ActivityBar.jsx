export default function ActivityBar({ agentCount, lastUpdate }) {
  return (
    <div className="fixed top-[46px] left-0 right-0 z-40 flex items-center gap-3 px-4 py-1.5 mono"
      style={{ background: 'rgba(13,17,23,0.8)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 10, color: '#4b5563' }}>
      <span>{agentCount} agent{agentCount !== 1 ? 's' : ''}</span>
      <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
      <span>{lastUpdate ? `Atualizado: ${lastUpdate.toLocaleTimeString('pt-BR')}` : 'Aguardando...'}</span>
    </div>
  );
}
