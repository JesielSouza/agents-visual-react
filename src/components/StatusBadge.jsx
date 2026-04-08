const STATUS_CONFIG = {
  running:        { bg: 'bg-blue-500/20',   text: 'text-blue-300',   label: 'Rodando' },
  waiting_review:{ bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Revisao' },
  blocked:       { bg: 'bg-red-500/20',    text: 'text-red-300',    label: 'Bloqueado' },
  idle:          { bg: 'rgba(26,26,26,0.82)', text: '#7b6652', label: 'Ocioso' },
  done:          { bg: 'bg-green-500/20',  text: 'text-green-300',  label: 'Concluido' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  return (
    <span
      className={typeof cfg.bg === 'string' && cfg.bg.startsWith('bg-') ? `inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${cfg.bg} ${cfg.text}` : 'inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold'}
      style={typeof cfg.bg === 'string' && cfg.bg.startsWith('bg-')
        ? undefined
        : { background: cfg.bg, color: cfg.text, border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {cfg.label}
    </span>
  );
}
