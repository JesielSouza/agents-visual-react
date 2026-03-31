const STATUS_CONFIG = {
  running:        { bg: 'bg-blue-500/20',   text: 'text-blue-300',   label: 'Rodando' },
  waiting_review:{ bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Revisao' },
  blocked:       { bg: 'bg-red-500/20',    text: 'text-red-300',    label: 'Bloqueado' },
  idle:          { bg: 'bg-slate-500/20',  text: 'text-slate-300',  label: 'Ocioso' },
  done:          { bg: 'bg-green-500/20',  text: 'text-green-300',  label: 'Concluido' },
};

export default function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}
