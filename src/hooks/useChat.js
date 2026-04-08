import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiUrl } from '../utils/api';
import { playNotification } from '../utils/pixelSounds';
import { getAgentDisplayName } from '../utils/agentPersona';

const CHAT_STORAGE_KEY = 'agent-house-chat-history-v1';
const CHAT_MAX_MESSAGES = 80;

function relativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export { relativeTime };

function safeParseStoredMessages() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeStoredMessage(item) {
  if (!item || typeof item !== 'object') return null;

  return {
    id: item.id || `chat-${Date.now()}`,
    from: item.from || 'system',
    fromName: item.fromName || 'Sistema',
    fromTeam: item.fromTeam || 'Operations',
    to: item.to || 'all',
    message: String(item.message || ''),
    type: item.type || 'system',
    timestamp: item.timestamp || new Date().toISOString(),
    read: item.read !== false,
    llmUsed: item.llmUsed || null,
    rawAction: item.rawAction || null,
  };
}

function normalizeChatMessageShape(item) {
  const normalized = normalizeStoredMessage(item);
  return normalized ? [normalized] : [];
}

function sortMessages(items) {
  return [...items].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

function mergeUniqueMessages(base, incoming) {
  const map = new Map();
  [...base, ...incoming].forEach((item) => {
    if (!item?.id) return;
    map.set(item.id, item);
  });
  return sortMessages([...map.values()]).slice(-CHAT_MAX_MESSAGES);
}

function buildAvailableAgentsMessage(agents) {
  return `Agentes disponiveis: ${agents.map((agent) => `@${getAgentDisplayName(agent)}`).join(', ')}`;
}

function buildInitialMessages(agents) {
  const now = Date.now();
  return [
    {
      id: 'chat-bootstrap-1',
      from: 'system',
      fromName: 'Sistema',
      fromTeam: 'Operations',
      to: 'all',
      message: 'Chat operacional pronto. Cite um agente com @nome para falar diretamente sem precisar selecionar no mapa.',
      type: 'system',
      timestamp: new Date(now - 30000).toISOString(),
      read: true,
    },
    {
      id: 'chat-bootstrap-2',
      from: 'system',
      fromName: 'Sistema',
      fromTeam: 'Operations',
      to: 'all',
      message: buildAvailableAgentsMessage(agents),
      type: 'system',
      timestamp: new Date(now - 15000).toISOString(),
      read: true,
    },
  ];
}

function mergeBootstrapMessages(messages, agents) {
  const next = Array.isArray(messages) ? [...messages] : [];
  const bootstrap = buildInitialMessages(agents);

  const firstIndex = next.findIndex((msg) => msg.id === 'chat-bootstrap-1');
  const secondIndex = next.findIndex((msg) => msg.id === 'chat-bootstrap-2');

  if (firstIndex >= 0) {
    next[firstIndex] = { ...next[firstIndex], ...bootstrap[0] };
  } else {
    next.unshift(bootstrap[0]);
  }

  if (secondIndex >= 0) {
    next[secondIndex] = { ...next[secondIndex], ...bootstrap[1] };
  } else {
    next.splice(1, 0, bootstrap[1]);
  }

  return sortMessages(next).slice(-CHAT_MAX_MESSAGES);
}

function areMessagesEquivalent(left, right) {
  if (left === right) return true;
  if (!Array.isArray(left) || !Array.isArray(right)) return false;
  if (left.length !== right.length) return false;

  for (let i = 0; i < left.length; i += 1) {
    const a = left[i];
    const b = right[i];
    if (
      a?.id !== b?.id
      || a?.message !== b?.message
      || a?.timestamp !== b?.timestamp
      || a?.read !== b?.read
      || a?.from !== b?.from
      || a?.to !== b?.to
      || a?.llmUsed !== b?.llmUsed
      || a?.rawAction !== b?.rawAction
    ) {
      return false;
    }
  }

  return true;
}

function buildAgentBootstrapSignature(agents) {
  return agents
    .map((agent) => [
      agent.id || '',
      getAgentDisplayName(agent),
      agent.team || '',
      agent.zone || '',
      agent.in_meeting ? '1' : '0',
    ].join(':'))
    .join('|');
}

function normalizeBackendChatMessages(payload) {
  const items = Array.isArray(payload?.history)
    ? payload.history
    : Array.isArray(payload?.messages)
      ? payload.messages
    : Array.isArray(payload)
      ? payload
      : [];

  return items
    .flatMap((item, index) => {
      const from = item.from || item.agent_id || item.agentId || item.role || 'system';
      const isHuman = from === 'user' || from === 'human';
      const timestamp = item.timestamp || item.created_at || item.createdAt || new Date().toISOString();
      const humanName = item.fromName || item.agent_name || item.agentName || 'Voce';
      const agentName = item.toName || item.agent_name || item.agentName || getAgentDisplayName({ id: item.to || item.agent_id || item.agentId || 'ceo' });
      const humanMessage = item.message || item.content || null;
      const agentReply = item.reply || null;

      if (isHuman && humanMessage && agentReply) {
        return [
          ...normalizeChatMessageShape({
            id: `${item.id || `chat-history-${index}`}-human`,
            from: 'human',
            fromName: humanName,
            fromTeam: 'Operations',
            to: item.to || 'all',
            message: humanMessage,
            type: 'direct',
            timestamp,
            read: true,
          }),
          ...normalizeChatMessageShape({
            id: `${item.id || `chat-history-${index}`}-reply`,
            from: item.to || item.agent_id || item.agentId || 'ceo',
            fromName: agentName,
            fromTeam: item.team || 'Operations',
            to: 'user',
            message: agentReply,
            type: 'direct',
            timestamp: new Date(new Date(timestamp).getTime() + 1).toISOString(),
            read: true,
            llmUsed: item.llm_used || item.llmUsed || null,
            rawAction: item.action || item.rawAction || null,
          }),
        ];
      }

      const fromName = item.fromName
        || item.agent_name
        || item.agentName
        || (isHuman ? 'Voce' : from === 'system' ? 'Sistema' : getAgentDisplayName({ id: from }));

      return normalizeChatMessageShape({
        id: item.id || `chat-history-${index}`,
        from,
        fromName,
        fromTeam: item.fromTeam || item.team || 'Operations',
        to: item.to || 'all',
        message: agentReply || humanMessage || '',
        type: item.type || (from === 'system' ? 'system' : 'direct'),
        timestamp,
        read: true,
        llmUsed: item.llm_used || item.llmUsed || null,
        rawAction: item.action || item.rawAction || null,
      });
    })
    .filter(Boolean)
    .slice(-CHAT_MAX_MESSAGES);
}

function normalizeAgentTeam(agentId, agents) {
  return agents.find((agent) => agent.id === agentId)?.team || 'Engineering';
}

function humanizeAgentReply(rawAction, agentId) {
  const value = String(rawAction || '').trim();
  if (!value) return 'Sem resposta textual.';

  const lower = value.toLowerCase();

  if (lower.startsWith('@escalate-to-ceo') || lower === 'escalate-to-ceo') {
    return agentId === 'ceo'
      ? 'Estou assumindo isso agora e vou definir o proximo direcionamento.'
      : 'Vou levar isso para a Sofia e volto com um direcionamento.';
  }

  if (lower.startsWith('delegate_task') || lower === 'delegate_task') {
    return 'Vou distribuir essa frente e coordenar os proximos passos.';
  }

  if (lower.includes('review') && !lower.includes('http')) {
    return 'Estou revisando isso agora e te atualizo com o proximo passo.';
  }

  if (lower.includes('bug')) {
    return 'Identifiquei um problema e vou verificar a melhor correcao.';
  }

  if (lower.includes('_') || lower.includes('-')) {
    return value.replace(/^@/, '').replace(/[_-]+/g, ' ').trim();
  }

  return value;
}

export function useChat(agents) {
  const [messages, setMessages] = useState(() => {
    const stored = safeParseStoredMessages();
    if (stored && stored.length > 0) {
      return mergeBootstrapMessages(stored.map(normalizeStoredMessage).filter(Boolean), agents);
    }
    return buildInitialMessages(agents);
  });
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState('all');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [chatMeta, setChatMeta] = useState(null);

  const agentNames = useMemo(
    () => agents.map((agent) => `@${getAgentDisplayName(agent)}`),
    [agents]
  );
  const agentBootstrapSignature = useMemo(
    () => buildAgentBootstrapSignature(agents),
    [agents]
  );

  useEffect(() => {
    if (agents.length === 0) return;
    setMessages((prev) => {
      const next = mergeBootstrapMessages(prev, agents);
      return areMessagesEquivalent(prev, next) ? prev : next;
    });
  }, [agents, agentBootstrapSignature]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateChatHistory() {
      try {
        const res = await fetch(apiUrl('/api/chat/history'));
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const hydrated = normalizeBackendChatMessages(data);
        if (hydrated.length > 0) {
          setMessages((prev) => {
            const next = mergeBootstrapMessages(mergeUniqueMessages(prev, hydrated), agents);
            return areMessagesEquivalent(prev, next) ? prev : next;
          });
          setChatMeta((prev) => ({
            ...(prev || {}),
            persistence: 'backend',
            text: 'Historico restaurado do backend.',
          }));
        }
      } catch {
        // Quando o backend ainda nao expoe historico, a sessao segue no fallback local.
      }
    }

    hydrateChatHistory();
    return () => {
      cancelled = true;
    };
  }, [agents, agentBootstrapSignature]);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-CHAT_MAX_MESSAGES)));
    } catch {
      // Ignora falhas locais de persistencia.
    }
  }, [messages]);

  const markRead = useCallback(() => {
    setMessages((prev) => prev.map((msg) => ({ ...msg, read: true })));
    setUnread(0);
  }, []);

  const appendUnreadMessages = useCallback((items) => {
    setMessages((prev) => [...prev, ...items].slice(-CHAT_MAX_MESSAGES));
    setUnread((prev) => prev + items.filter((item) => !item.read).length);
  }, []);

  const sendMessage = useCallback(async () => {
    const message = draft.trim();
    if (!message || sending) return;

    const sentAt = new Date();
    const localUserMsg = {
      id: `user-${Date.now()}`,
      from: 'user',
      fromName: 'Voce',
      fromTeam: 'Operations',
      to: 'all',
      message,
      type: 'direct',
      timestamp: sentAt.toISOString(),
      read: true,
    };

    setMessages((prev) => [...prev, localUserMsg].slice(-CHAT_MAX_MESSAGES));
    setDraft('');
    setSending(true);
    setChatMeta({
      status: 'enviando',
      text: 'Encaminhando para o backend...',
      llmUsed: null,
      routingCount: 0,
      persistence: 'sessao+local',
    });

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const receivedAt = new Date();
      const routing = Array.isArray(data.routing) ? data.routing : [];
      const results = Array.isArray(data.results) ? data.results : [];
      const llmStatus = data.llm_status || null;
      const resultLlms = results
        .map((result) => result?.result?.llm_used || result?.llm_used || null)
        .filter(Boolean);
      const usedLlm = resultLlms[0] || llmStatus?.last_fallback?.to || llmStatus?.primary_llm || null;

      const responseMessages = [];

      if (routing.length > 0) {
        responseMessages.push({
          id: `route-${Date.now()}`,
          from: 'system',
          fromName: 'Roteador',
          fromTeam: 'Operations',
          to: 'all',
          message: `Destino: ${routing.map((item) => `@${getAgentDisplayName({ id: item.agentId })}`).join(', ')}`,
          type: 'system',
          timestamp: receivedAt.toISOString(),
          read: false,
        });
      }

      results.forEach((result, index) => {
        if (result?.error) {
          responseMessages.push({
            id: `chat-error-${Date.now()}-${index}`,
            from: 'system',
            fromName: 'Sistema',
            fromTeam: 'Operations',
            to: 'all',
            message: `Falha ao falar com ${result.agentId || 'agente'}: ${result.error}`,
            type: 'system',
            timestamp: new Date(receivedAt.getTime() + index * 250).toISOString(),
            read: false,
          });
          return;
        }

        const resultAgentId = result.agentId || routing[index]?.agentId || 'ceo';
        const backendReply = result.result?.reply || result.reply || null;
        const backendAction = result.result?.action || result.action || null;
        const resultLlm = result.result?.llm_used || result.llm_used || null;
        const visibleMessage = backendReply || humanizeAgentReply(backendAction || 'sem resposta textual', resultAgentId);

        responseMessages.push({
          id: `chat-agent-${resultAgentId}-${Date.now()}-${index}`,
          from: resultAgentId,
          fromName: getAgentDisplayName({ id: resultAgentId }),
          fromTeam: normalizeAgentTeam(resultAgentId, agents),
          to: 'user',
          message: visibleMessage,
          type: routing.length > 1 ? 'broadcast' : 'direct',
          timestamp: new Date(receivedAt.getTime() + index * 400).toISOString(),
          read: false,
          llmUsed: resultLlm,
          rawAction: backendAction && backendAction !== visibleMessage ? backendAction : null,
        });
      });

      if (responseMessages.length > 0) {
        playNotification({ volume: 0.3 });
        appendUnreadMessages(responseMessages);
      }

      setChatMeta({
        status: 'ok',
        text: routing.length > 1 ? 'Resposta multiagente recebida.' : 'Resposta recebida.',
        llmUsed: usedLlm,
        routingCount: routing.length,
        persistence: data.persisted ? 'backend' : 'sessao+local',
      });
    } catch (error) {
      appendUnreadMessages([
        {
          id: `chat-fail-${Date.now()}`,
          from: 'system',
          fromName: 'Sistema',
          fromTeam: 'Operations',
          to: 'all',
          message: `Nao foi possivel completar o chat agora: ${error.message}.`,
          type: 'system',
          timestamp: new Date().toISOString(),
          read: false,
        },
      ]);
      setChatMeta({
        status: 'erro',
        text: 'O backend nao respondeu ao chat.',
        llmUsed: null,
        routingCount: 0,
        persistence: 'sessao+local',
      });
    } finally {
      setSending(false);
    }
  }, [agents, appendUnreadMessages, draft, sending]);

  return {
    messages,
    unread,
    filter,
    setFilter,
    markRead,
    draft,
    setDraft,
    sending,
    sendMessage,
    chatMeta,
    agentNames,
  };
}
