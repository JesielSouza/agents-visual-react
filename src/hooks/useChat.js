import { useState, useEffect, useRef, useCallback } from 'react';
import { playNotification } from '../utils/pixelSounds';

const POLL_MS = 6000;

const MESSAGES = [
  'PR #123 ficou boa!', 'Pode revisar isso?', 'Subindo para staging agora',
  'Os testes passaram', 'Achei um bug no modulo X', 'Reuniao em 10 min',
  'Pronto para revisao', 'Tudo certo!', 'Preciso de mais contexto', 'Enviando v0.2.1',
  'O build falhou na CI', 'Tudo verde!', 'Staging foi atualizada', 'Revisao do roadmap Q2',
  'Performance melhorou 40%', 'Bug confirmado, estou corrigindo', 'PR aprovada!',
  'Nova feature pronta', 'Documentacao atualizada', 'Deploy concluido!',
];

const SYSTEM_MESSAGES = [
  'CEO entrou na area de Engenharia', 'CEO iniciou uma reuniao',
  'Novo agente contratado', 'Deploy concluido', 'Build finalizado',
  'Pipeline da CI passou', 'Suite de testes passou',
];

function seededRandom(seed) {
  return ((Math.sin(seed + 1) * 10000) % 1 + 1) % 1;
}

function generateInitial(agents, count = 12) {
  const msgs = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const seed = i * 23 + 7;
    const agentIdx = Math.floor(seededRandom(seed) * agents.length);
    const agent = agents[agentIdx] || agents[0];
    const typeRoll = seededRandom(i * 11 + 3);
    const type = typeRoll < 0.15 ? 'system' : typeRoll < 0.3 ? 'broadcast' : 'direct';
    const msgIdx = Math.floor(seededRandom(i * 7 + 5) * MESSAGES.length);
    const ts = new Date(now - Math.floor(seededRandom(i * 9 + 2) * 3600000 * 3));

    msgs.push({
      id: `msg-${i}`,
      from: type === 'system' ? 'system' : (agent?.id || 'unknown'),
      fromName: type === 'system' ? 'System' : (agent?.name || 'Unknown'),
      fromTeam: agent?.team || agent?.zone || 'Engineering',
      to: type === 'direct' ? 'all' : (type === 'broadcast' ? 'all' : agents[(agentIdx + 1) % agents.length]?.id || 'all'),
      message: type === 'system'
        ? SYSTEM_MESSAGES[Math.floor(seededRandom(i * 13 + 11) * SYSTEM_MESSAGES.length)]
        : MESSAGES[msgIdx],
      type,
      timestamp: ts.toISOString(),
      read: i > 3,
    });
  }

  return msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

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

export function useChat(agents) {
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [filter, setFilter] = useState('all');
  const idRef = useRef(12);
  const agentsRef = useRef(agents);
  const initializedRef = useRef(false);

  useEffect(() => { agentsRef.current = agents; }, [agents]);

  useEffect(() => {
    if (initializedRef.current || agents.length === 0) return;
    const initial = generateInitial(agents, 12);
    setMessages(initial);
    setUnread(initial.filter((m) => !m.read).length);
    initializedRef.current = true;
  }, [agents]);

  useEffect(() => {
    const id = setInterval(() => {
      setMessages((prev) => {
        if (agentsRef.current.length === 0) return prev;
        const seed = idRef.current++;
        const agentIdx = Math.floor(seededRandom(seed) * agentsRef.current.length);
        const agent = agentsRef.current[agentIdx];
        if (!agent) return prev;

        const typeRoll = seededRandom(seed * 3 + 1);
        const type = typeRoll < 0.12 ? 'system' : typeRoll < 0.28 ? 'broadcast' : 'direct';
        const msgIdx = Math.floor(seededRandom(seed * 5 + 3) * MESSAGES.length);

        const newMsg = {
          id: `msg-${seed}`,
          from: type === 'system' ? 'system' : agent.id,
          fromName: type === 'system' ? 'System' : agent.name,
          fromTeam: agent.team || agent.zone || 'Engineering',
          to: type === 'direct' ? agentsRef.current[(agentIdx + 1) % agentsRef.current.length]?.id || 'all' : 'all',
          message: type === 'system'
            ? SYSTEM_MESSAGES[Math.floor(seededRandom(seed * 7 + 2) * SYSTEM_MESSAGES.length)]
            : MESSAGES[msgIdx],
          type,
          timestamp: new Date().toISOString(),
          read: false,
        };

        playNotification({ volume: 0.3 });
        const next = [...prev, newMsg].slice(-80);
        setUnread(next.filter((m) => !m.read).length);
        return next;
      });
    }, POLL_MS);

    return () => clearInterval(id);
  }, []);

  const markRead = useCallback(() => {
    setMessages((prev) => {
      const next = prev.map((m) => ({ ...m, read: true }));
      setUnread(0);
      return next;
    });
  }, []);

  return { messages, unread, filter, setFilter, markRead };
}
