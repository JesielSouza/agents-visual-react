import { useMemo, useState } from 'react';
import { apiUrl } from '../utils/api';
import { playUiClick, playUiHover } from '../utils/pixelSounds';
import { getAgentDisplayName } from '../utils/agentPersona';

const QUICK_COMMANDS = [
  'Revise o bloqueio atual e resuma o proximo passo.',
  'Va para a reuniao e reporte seu status atual.',
  'Foque na tarefa atual e publique um progresso curto.',
  'Cheque os logs recentes e sugira a proxima acao.',
];

export default function CommandDesk({ selectedAgent, onClearSelection, embedded = false }) {
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);

  const title = useMemo(() => {
    if (!selectedAgent) return 'MESA DE COMANDO';
    return `MESA DE COMANDO - ${getAgentDisplayName(selectedAgent)}`;
  }, [selectedAgent]);

  async function submitCommand(message) {
    if (!selectedAgent || !message.trim()) return;

    const payload = {
      agent_id: selectedAgent.id,
      command: message.trim(),
    };

    setSending(true);

    try {
      const res = await fetch(apiUrl('/api/agents/command'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json().catch(() => ({}));

      setHistory((prev) => [
        {
          id: `${Date.now()}-ok`,
          type: 'sent',
          command: message.trim(),
          status: data.status || 'enviado',
          note: data.message || 'Comando aceito pelo backend.',
          at: new Date(),
        },
        ...prev,
      ].slice(0, 8));
      setCommand('');
    } catch (error) {
      setHistory((prev) => [
        {
          id: `${Date.now()}-pending`,
          type: 'local',
          command: message.trim(),
          status: 'ui-pronta',
          note: 'A interface esta pronta, mas a rota real de comando ainda nao foi disponibilizada pelo backend.',
          at: new Date(),
        },
        ...prev,
      ].slice(0, 8));
      setCommand('');
    } finally {
      setSending(false);
    }
  }

  const containerStyle = embedded
    ? {
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 12,
        overflowY: 'auto',
        flex: 1,
      }
    : {
        position: 'fixed',
        left: 20,
        top: 72,
        zIndex: 72,
        width: 400,
        maxHeight: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        background: 'linear-gradient(180deg, rgba(44,29,18,0.98) 0%, rgba(27,19,13,0.98) 100%)',
        border: `2px solid ${selectedAgent ? 'rgba(243,209,156,0.45)' : 'rgba(167,139,109,0.28)'}`,
        boxShadow: '0 24px 44px rgba(0,0,0,0.32)',
        overflow: 'hidden',
        pointerEvents: 'auto',
      };

  const shell = (
    <>
      <div style={{
        padding: embedded ? '0 0 8px' : '12px 14px',
        borderBottom: embedded ? 'none' : '1px solid rgba(255,255,255,0.06)',
        background: embedded ? 'transparent' : 'linear-gradient(180deg, rgba(74,49,32,0.92) 0%, rgba(48,31,20,0.9) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7.2, color: '#f3d19c', letterSpacing: '0.12em' }}>
            {title}
          </div>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#d0bea6', marginTop: 4 }}>
            {selectedAgent ? `${selectedAgent.team || selectedAgent.zone || 'agente'} - ${selectedAgent.status}` : 'Selecione um agente no mapa'}
          </div>
        </div>

        {selectedAgent && !embedded && (
          <button
            onMouseEnter={playUiHover}
            onClick={() => {
              playUiClick();
              onClearSelection?.();
            }}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#d6c5ab',
              fontFamily: 'var(--font-pixel)',
              fontSize: 6.4,
              cursor: 'pointer',
            }}
          >
            X
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#c8aa82', letterSpacing: '0.12em', marginBottom: 8 }}>
            COMANDOS RAPIDOS
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {QUICK_COMMANDS.map((item) => (
              <button
                key={item}
                disabled={!selectedAgent || sending}
                onMouseEnter={playUiHover}
                onClick={() => {
                  playUiClick();
                  setCommand(item);
                }}
                style={{
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: selectedAgent ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.01)',
                  color: selectedAgent ? '#e7dbc8' : '#6f5a46',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12.2,
                  lineHeight: 1.38,
                  cursor: selectedAgent ? 'pointer' : 'not-allowed',
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div style={{
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#c8aa82', letterSpacing: '0.12em' }}>
            COMANDO DIRETO
          </div>

          <div style={{
            padding: '8px 10px',
            borderRadius: 8,
            background: 'rgba(17,12,8,0.56)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#f3d19c', marginBottom: 4 }}>
              STATUS DA INTERACAO
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.3, color: '#bfa88a', lineHeight: 1.45 }}>
              Esta mesa ja permite enviar comandos pela tela. A colaboracao real entre agentes ainda depende do backend do OpenClaw receber o comando e orquestrar a execucao.
            </div>
          </div>

          <textarea
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={!selectedAgent || sending}
            placeholder={selectedAgent ? 'Escreva um comando para este agente...' : 'Selecione um agente primeiro'}
            style={{
              minHeight: 108,
              resize: 'vertical',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(17,12,8,0.82)',
              color: '#f3e7d6',
              padding: '10px 12px',
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              lineHeight: 1.48,
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onMouseEnter={playUiHover}
              onClick={() => {
                playUiClick();
                submitCommand(command);
              }}
              disabled={!selectedAgent || !command.trim() || sending}
              style={{
                alignSelf: 'flex-start',
                padding: '9px 12px',
                borderRadius: 8,
                border: '1px solid rgba(243,209,156,0.35)',
                background: selectedAgent && command.trim() && !sending ? 'rgba(243,209,156,0.14)' : 'rgba(255,255,255,0.03)',
                color: selectedAgent && command.trim() && !sending ? '#f3d19c' : '#7b6652',
                fontFamily: 'var(--font-pixel)',
                fontSize: 6.2,
                letterSpacing: '0.1em',
                cursor: selectedAgent && command.trim() && !sending ? 'pointer' : 'not-allowed',
              }}
            >
              {sending ? 'ENVIANDO' : 'ENVIAR COMANDO'}
            </button>

            {selectedAgent && embedded && (
              <button
                onMouseEnter={playUiHover}
                onClick={() => {
                  playUiClick();
                  onClearSelection?.();
                }}
                style={{
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                  color: '#d6c5ab',
                  fontFamily: 'var(--font-pixel)',
                  fontSize: 6.2,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                }}
              >
                LIMPAR
              </button>
            )}
          </div>
        </div>

        <div style={{
          padding: '10px 12px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#c8aa82', letterSpacing: '0.12em' }}>
            HISTORICO DE COMANDOS
          </div>
          {history.length === 0 ? (
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.1, color: '#6f5a46' }}>
              Nenhum comando enviado ainda.
            </div>
          ) : (
            history.map((entry) => (
              <div key={entry.id} style={{
                padding: '8px 10px',
                borderRadius: 8,
                background: 'rgba(17,12,8,0.72)',
                border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: entry.type === 'sent' ? '#86efac' : '#fcd34d' }}>
                    {entry.status}
                  </span>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.4, color: '#8f7a66' }}>
                    {entry.at.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#e7dbc8', lineHeight: 1.35 }}>
                  {entry.command}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.1, color: '#9d8b76', marginTop: 4 }}>
                  {entry.note}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  if (embedded) {
    return <div style={containerStyle}>{shell}</div>;
  }

  return <div style={containerStyle}>{shell}</div>;
}
