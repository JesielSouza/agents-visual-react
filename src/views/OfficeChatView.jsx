import { useEffect, useMemo, useRef, useState } from 'react';
import { relativeTime } from '../hooks/useChat';
import { playNotification, playUiClick, playUiHover } from '../utils/pixelSounds';
import { getAgentDisplayName, getAgentFace, isAgentCeo } from '../utils/agentPersona';
import { resolvePrompt } from '../utils/agentPrompts';

const STATUS_COLORS = {
  running: '#86efac',
  waiting_review: '#f59e0b',
  blocked: '#ef4444',
  done: '#93c5fd',
  idle: '#9ca3af',
};

const SURFACE_SOFT = 'rgba(26,26,26,0.75)';
const SURFACE_WARM = 'rgba(27,19,13,0.82)';
const BORDER_DARK = 'rgba(255,255,255,0.08)';

const SUGGESTIONS_BY_ID = {
  ceo: [
    'Quais prioridades voce define para hoje?',
    'Onde esta o maior risco operacional agora?',
    'Me de a decisao executiva sobre este contexto.',
  ],
  coding: [
    'Analise esta implementacao e diga o proximo passo.',
    'Onde esta o risco tecnico principal aqui?',
    'Proponha uma correcao objetiva para este bug.',
  ],
  work: [
    'Organize este contexto em proximas acoes.',
    'Quero um resumo operacional objetivo.',
    'Transforme isso em sequencia de execucao.',
  ],
  social: [
    'Escreva um status update curto.',
    'Transforme isso em comunicado claro.',
    'Resuma isso para stakeholders.',
  ],
  hr: [
    'Como conduzir esse alinhamento com o time?',
    'Me de um feedback estruturado para esse caso.',
    'Qual o proximo passo de people ops aqui?',
  ],
  'qa-contract-01': [
    'Quais cenarios eu preciso validar primeiro?',
    'Liste edge cases dessa feature.',
    'Defina criterios de aceite objetivos.',
  ],
};

function AgentCard({ agent, isActive, onClick }) {
  const prompt = resolvePrompt(agent);
  const displayName = getAgentDisplayName(agent);
  const statusColor = STATUS_COLORS[agent.status] || '#9ca3af';
  const teamColor = prompt.color;

  return (
    <button
      onMouseEnter={playUiHover}
      onClick={() => {
        playUiClick();
        onClick(agent);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '14px 12px',
        borderRadius: 12,
        background: isActive
          ? `linear-gradient(180deg, ${teamColor}20 0%, ${SURFACE_SOFT} 100%)`
          : SURFACE_SOFT,
        border: isActive ? `1px solid ${teamColor}88` : `1px solid ${BORDER_DARK}`,
        boxShadow: isActive ? `0 0 20px ${teamColor}22` : 'none',
        cursor: 'pointer',
        textAlign: 'left',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            inset: '0 0 auto 0',
            height: 2,
            background: `linear-gradient(90deg, transparent, ${teamColor}, transparent)`,
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: `${teamColor}18`,
            border: `2px solid ${teamColor}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-pixel)',
            fontSize: 5.2,
            color: '#f5e6d3',
          }}
        >
          {prompt.emoji}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 6.2,
                color: isActive ? teamColor : '#f5e6d3',
                letterSpacing: '0.06em',
              }}
            >
              {displayName}
            </span>
            {isAgentCeo(agent) && (
              <span
                style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: 4.2,
                  color: '#fbbf24',
                  background: 'rgba(251,191,36,0.12)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: 999,
                  padding: '1px 5px',
                }}
              >
                CEO
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 4.8,
              color: teamColor,
              letterSpacing: '0.08em',
              marginBottom: 6,
              opacity: 0.84,
            }}
          >
            {prompt.label} · {agent.team || agent.zone || '-'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: statusColor,
                boxShadow: `0 0 6px ${statusColor}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: '#c8aa82',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {agent.current_task || agent.task || agent.summary || 'Em standby'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function isMessageForAgent(message, agent) {
  const displayName = getAgentDisplayName(agent).toLowerCase();
  const mention = `@${displayName}`;
  const text = String(message?.message || '').toLowerCase();

  if (message?.from === agent?.id) return true;
  if (message?.to === agent?.id) return true;
  if (message?.from === 'user' || message?.from === 'human') {
    return text.includes(mention);
  }
  return false;
}

function normalizePanelMessages(messages, agent) {
  return messages
    .filter((message) => isMessageForAgent(message, agent))
    .map((message) => ({
      id: message.id,
      role: message.from === 'user' || message.from === 'human' ? 'user' : 'assistant',
      content: message.message,
      timestamp: message.timestamp,
      llmUsed: message.llmUsed || null,
      rawAction: message.rawAction || null,
    }));
}

function ChatPanel({ agent, chat, onClose }) {
  const { messages, draft, setDraft, sending, sendMessage, chatMeta } = chat;
  const prompt = resolvePrompt(agent);
  const displayName = getAgentDisplayName(agent);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const [pendingMessage, setPendingMessage] = useState(null);
  const panelMessages = useMemo(() => normalizePanelMessages(messages, agent), [messages, agent]);
  const suggestions = SUGGESTIONS_BY_ID[agent.id] || [];

  useEffect(() => {
    textareaRef.current?.focus();
  }, [agent.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [panelMessages.length, sending]);

  useEffect(() => {
    if (!pendingMessage) return;
    if (draft !== pendingMessage || sending) return;

    sendMessage();
    playNotification({ volume: 0.2 });
    setPendingMessage(null);
  }, [draft, pendingMessage, sendMessage, sending]);

  const handleSuggestion = (text) => {
    playUiClick();
    setDraft(`@${displayName} ${text}`);
    textareaRef.current?.focus();
  };

  const handleSend = async () => {
    const text = draft.trim();
    const composed = text.startsWith(`@${displayName}`) ? text : `@${displayName} ${text}`.trim();
    if (!composed || sending) return;
    setPendingMessage(composed);
    setDraft(composed);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(20,13,9,0.96)',
        borderLeft: `1px solid ${prompt.color}33`,
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          borderBottom: `1px solid ${prompt.color}22`,
          background: `linear-gradient(180deg, ${prompt.color}12 0%, rgba(0,0,0,0) 100%)`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: `${prompt.color}18`,
            border: `2px solid ${prompt.color}66`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-pixel)',
            fontSize: 5,
            color: '#f5e6d3',
          }}
        >
          {prompt.emoji}
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 6.4,
              color: prompt.color,
              letterSpacing: '0.08em',
            }}
          >
            {displayName}
          </div>
          <div
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 4.8,
              color: '#a78b6d',
              marginTop: 3,
            }}
          >
            {sending ? 'ENCAMINHANDO PARA O BACKEND' : `${prompt.label} · ${agent.team || agent.zone || 'Operacao'}`}
          </div>
        </div>

        <button
          onMouseEnter={playUiHover}
          onClick={() => {
            playUiClick();
            onClose();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#7b6652',
            cursor: 'pointer',
            fontFamily: 'var(--font-pixel)',
            fontSize: 6,
            padding: '4px 8px',
            borderRadius: 6,
          }}
        >
          X
        </button>
      </div>

      <div
        style={{
          padding: '10px 16px',
          borderBottom: `1px solid ${prompt.color}18`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          background: SURFACE_WARM,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 4.8,
            color: prompt.color,
            border: `1px solid ${prompt.color}33`,
            borderRadius: 999,
            padding: '4px 8px',
            background: `${prompt.color}10`,
          }}
        >
          PROMPT ATIVO
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#d6c5ab',
            opacity: 0.84,
          }}
        >
          {prompt.systemPrompt}
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {panelMessages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 16,
              textAlign: 'center',
              padding: '24px 16px',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: `${prompt.color}14`,
                border: `2px solid ${prompt.color}33`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-pixel)',
                fontSize: 8,
                color: '#f5e6d3',
              }}
            >
              {getAgentFace(agent)}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 6,
                color: prompt.color,
                letterSpacing: '0.08em',
              }}
            >
              {displayName} pronto
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: '#a78b6d',
                lineHeight: 1.6,
                maxWidth: 340,
              }}
            >
              {agent.current_task || agent.summary || `Conversa direta com ${prompt.label.toLowerCase()} via /api/chat.`}
            </div>

            {suggestions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 360 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-pixel)',
                    fontSize: 5,
                    color: '#7b6652',
                    letterSpacing: '0.1em',
                  }}
                >
                  SUGESTOES
                </div>
                {suggestions.map((item) => (
                  <button
                    key={item}
                    onMouseEnter={playUiHover}
                    onClick={() => handleSuggestion(item)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: `1px dashed ${prompt.color}44`,
                      background: `${prompt.color}08`,
                      color: '#e7dbc8',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {panelMessages.map((message) => (
          <div
            key={message.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 4.8,
                color: message.role === 'user' ? '#93c5fd' : prompt.color,
                letterSpacing: '0.08em',
                opacity: 0.8,
              }}
            >
              {message.role === 'user' ? 'VOCE' : displayName} · {relativeTime(message.timestamp)}
            </div>
            <div
              style={{
                maxWidth: '88%',
                padding: '10px 14px',
                borderRadius: message.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                background:
                  message.role === 'user' ? 'rgba(91,141,239,0.12)' : SURFACE_SOFT,
                border:
                  message.role === 'user'
                    ? '1px solid rgba(91,141,239,0.2)'
                    : `1px solid ${prompt.color}22`,
                borderLeft: message.role === 'assistant' ? `2px solid ${prompt.color}` : undefined,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: '#e7dbc8',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {message.content}
            </div>
            {message.rawAction && (
              <div
                style={{
                  maxWidth: '88%',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: '#bfa98a',
                  opacity: 0.8,
                }}
              >
                acao: {message.rawAction}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
            <div
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 4.8,
                color: prompt.color,
                opacity: 0.8,
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px 12px 12px 4px',
                background: SURFACE_SOFT,
                border: `1px solid ${prompt.color}22`,
                borderLeft: `2px solid ${prompt.color}`,
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: '#cdb89b',
              }}
            >
              aguardando resposta do backend...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: '10px 14px',
          borderTop: `1px solid ${prompt.color}22`,
          background: SURFACE_WARM,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 4.6,
              color: '#c8aa82',
              letterSpacing: '0.08em',
            }}
          >
            {chatMeta?.text || 'Conversa operacional via /api/chat'}
          </span>
          {chatMeta?.llmUsed && (
            <span
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 4.3,
                color: prompt.color,
                border: `1px solid ${prompt.color}33`,
                borderRadius: 999,
                padding: '2px 6px',
              }}
            >
              {chatMeta.llmUsed}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`@${displayName} fale por aqui`}
            rows={3}
            disabled={sending}
            style={{
              flex: 1,
              background: SURFACE_SOFT,
              border: `1px solid ${draft.trim() ? `${prompt.color}55` : BORDER_DARK}`,
              borderRadius: 8,
              color: '#f0e2cd',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              padding: '10px 12px',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <button
            onMouseEnter={playUiHover}
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            style={{
              padding: '0 18px',
              borderRadius: 8,
              border: 'none',
              background:
                sending || !draft.trim()
                  ? SURFACE_SOFT
                  : `linear-gradient(180deg, ${prompt.color} 0%, ${prompt.color}cc 100%)`,
              color: sending || !draft.trim() ? '#7b6652' : '#000',
              fontFamily: 'var(--font-pixel)',
              fontSize: 6,
              cursor: sending || !draft.trim() ? 'not-allowed' : 'pointer',
              alignSelf: 'flex-end',
              height: 38,
            }}
          >
            {sending ? '...' : 'ENVIAR'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OfficeChatView({ agents, chat }) {
  const [activeAgent, setActiveAgent] = useState(null);

  const sortedAgents = useMemo(() => {
    const order = { running: 0, waiting_review: 1, blocked: 2, idle: 3, done: 4 };
    return [...agents].sort((left, right) => {
      if (isAgentCeo(left)) return -1;
      if (isAgentCeo(right)) return 1;
      return (order[left.status] ?? 5) - (order[right.status] ?? 5);
    });
  }, [agents]);

  useEffect(() => {
    if (!activeAgent && sortedAgents[0]) {
      setActiveAgent(sortedAgents[0]);
      return;
    }

    if (activeAgent && !sortedAgents.some((agent) => agent.id === activeAgent.id)) {
      setActiveAgent(sortedAgents[0] || null);
    }
  }, [activeAgent, sortedAgents]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        background: 'linear-gradient(180deg, #1c1209 0%, #130e08 100%)',
      }}
    >
      <div
        style={{
          width: activeAgent ? 300 : '100%',
          maxWidth: activeAgent ? 300 : undefined,
          flexShrink: 0,
          overflowY: 'auto',
          borderRight: activeAgent ? `1px solid ${BORDER_DARK}` : 'none',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 2px 10px',
            borderBottom: `1px solid ${BORDER_DARK}`,
            marginBottom: 4,
            flexShrink: 0,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 7.5,
                color: '#f3d19c',
                letterSpacing: '0.14em',
              }}
            >
              CHAT OFFICE
            </div>
            <div
              style={{
                fontFamily: 'var(--font-pixel)',
                fontSize: 5,
                color: '#7b6652',
                marginTop: 3,
                letterSpacing: '0.08em',
              }}
            >
              {agents.length} AGENTES · /API/CHAT
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 5.5,
              color: '#86efac',
              background: 'rgba(134,239,172,0.1)',
              border: '1px solid rgba(134,239,172,0.2)',
              borderRadius: 999,
              padding: '4px 8px',
            }}
          >
            LIVE
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: activeAgent ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 8,
          }}
        >
          {sortedAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isActive={activeAgent?.id === agent.id}
              onClick={(nextAgent) =>
                setActiveAgent(activeAgent?.id === nextAgent.id ? null : nextAgent)
              }
            />
          ))}
        </div>
      </div>

      {activeAgent && (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <ChatPanel agent={activeAgent} chat={chat} onClose={() => setActiveAgent(null)} />
        </div>
      )}
    </div>
  );
}
