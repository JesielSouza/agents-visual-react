import { useState, useEffect, useCallback, useRef } from 'react';
import { apiUrl } from '../utils/api';
import { getAgentDisplayName } from '../utils/agentPersona';

const POLL_MS = 10000;

const EVENT_TYPE_MAP = {
  task_started: { category: 'task', badge: 'started' },
  task_completed: { category: 'task', badge: 'done' },
  pr_opened: { category: 'task', badge: 'pr' },
  pr_merged: { category: 'task', badge: 'merged' },
  llm_fallback: { category: 'llm', badge: 'fallback' },
  hired: { category: 'status', badge: 'hired' },
  removed: { category: 'status', badge: 'removed' },
  terminated: { category: 'status', badge: 'fired' },
  status_changed: { category: 'status', badge: 'status' },
  meeting_started: { category: 'meeting', badge: 'reuniao' },
  meeting_ended: { category: 'meeting', badge: 'fim' },
  agent_joined_meeting: { category: 'meeting', badge: 'entrou' },
  agent_returned_to_station: { category: 'meeting', badge: 'saiu' },
};

function classify(type) {
  return EVENT_TYPE_MAP[type] || { category: 'task', badge: type };
}

export function useEvents(agents) {
  const [logs, setLogs] = useState([]);
  const lastIdRef = useRef(null);

  const mapEvents = useCallback((events, agentMap) => (
    events.map((e) => {
      const ag = agentMap[e.agentId];
      const { category, badge } = classify(e.type);
      return {
        id: `${e.agentId}-${e.timestamp}-${e.id || ''}`,
        agentId: e.agentId,
        agentName: ag ? getAgentDisplayName(ag) : getAgentDisplayName({ id: e.agentId, name: e.agentId }),
        agentTeam: ag ? (ag.team || ag.zone) : null,
        type: e.type,
        badge,
        category,
        title: e.type === 'llm_fallback'
          ? `LLM fallback: ${e.from_llm} -> ${e.to_llm}${e.reason ? ` (${e.reason})` : ''}`
          : (e.title || ''),
        details: e.details || '',
        severity: e.severity || 'info',
        meta: [e.project && `Proj: ${e.project}`, e.branch && `Branch: ${e.branch}`, e.pr && e.pr, e.llm_provider && `LLM: ${e.llm_provider}`]
          .filter(Boolean)
          .join(' | '),
        time: new Date(e.timestamp),
        raw: e,
      };
    })
  ), []);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/events?t=${Date.now()}`));
      if (!res.ok) return;
      const data = await res.json();
      const events = data.events || [];
      if (events.length === 0) return;

      const newestId = events[events.length - 1].id;
      if (lastIdRef.current === null) {
        lastIdRef.current = newestId;
        const agentMap = {};
        agents.forEach((a) => { agentMap[a.id] = a; });
        setLogs(mapEvents(events.slice(-40).reverse(), agentMap));
        return;
      }

      const newEvents = [];
      let found = false;
      const lastKey = lastIdRef.current != null ? String(lastIdRef.current) : '';
      for (let i = events.length - 1; i >= 0; i--) {
        if (String(events[i].id) === lastKey) {
          found = true;
          break;
        }
        newEvents.unshift(events[i]);
      }

      const agentMap = {};
      agents.forEach((a) => {
        agentMap[a.id] = a;
      });

      if (found && newEvents.length > 0) {
        lastIdRef.current = newestId;
        const mapped = mapEvents(newEvents, agentMap);
        setLogs((prev) => {
          const next = [...mapped, ...prev];
          return next.slice(0, 150);
        });
      } else if (!found) {
        lastIdRef.current = newestId;
        const mapped = mapEvents(events.slice(-40).reverse(), agentMap);
        setLogs(mapped);
      }
    } catch {
      // Silently fail
    }
  }, [agents, mapEvents]);

  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, POLL_MS);
    return () => clearInterval(id);
  }, [fetchEvents]);

  return { logs };
}
