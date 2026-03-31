import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat, relativeTime as relativeChatTime } from '../hooks/useChat';
import { useTasks, relativeTime as relativeTaskTime, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '../hooks/useTasks';
import { useEvents } from '../hooks/useEvents';
import { playUiClick, playUiHover } from '../utils/pixelSounds';
import CommandDesk from './CommandDesk';
import { getAgentDisplayName } from '../utils/agentPersona';

const TEAM_COLORS = {
  Engineering: '#5b8def',
  Operations: '#5cab68',
  Communications: '#8d6adf',
  'People Ops': '#d96d9f',
  Quality: '#d29a3a',
  Flex: '#55b6a5',
};

const CHAT_FILTERS = [
  { key: 'all', label: 'TODAS' },
  { key: 'direct', label: 'DIRETAS' },
  { key: 'broadcast', label: 'GERAL' },
  { key: 'system', label: 'SISTEMA' },
];

const TYPE_COLORS = {
  direct: { border: '#5b8def', bg: 'rgba(91,141,239,0.08)' },
  broadcast: { border: '#5cab68', bg: 'rgba(92,171,104,0.08)' },
  system: { border: '#d29a3a', bg: 'rgba(210,154,58,0.08)' },
};

const LOG_CATEGORIES = [
  { key: 'all', label: 'TODOS', icon: '◆', color: '#d6c5ab' },
  { key: 'deploy', label: 'DEPLOY', icon: '▲', color: '#5cab68' },
  { key: 'bug', label: 'BUG', icon: '●', color: '#ef4444' },
  { key: 'status', label: 'STATUS', icon: '◉', color: '#93c5fd' },
  { key: 'meeting', label: 'REUNIAO', icon: '◎', color: '#c4b5fd' },
  { key: 'task', label: 'TAREFA', icon: '☑', color: '#d29a3a' },
  { key: 'llm', label: 'LLM', icon: '!', color: '#facc15' },
];

const TABS = [
  { key: 'command', label: 'COMANDO', color: '#f3d19c' },
  { key: 'chat', label: 'CHAT', color: '#8d6adf' },
  { key: 'log', label: 'LOG', color: '#5cab68' },
  { key: 'tasks', label: 'TAREFAS', color: '#d29a3a' },
];

const DOCK_ANIM = `
@keyframes ops-dock-rise {
  0% { opacity: 0; transform: translateY(12px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes ops-dock-pulse {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}
`;

function getLogCategory(type) {
  if (type === 'llm_fallback') return 'llm';
  if (type === 'hired' || type === 'removed') return 'status';
  if (type === 'meeting_started' || type === 'meeting_ended' || type === 'agent_joined_meeting') return 'meeting';
  if (type === 'task_started' || type === 'task_completed' || type === 'pr_opened' || type === 'pr_merged') return 'task';
  if (type.includes('bug') || type.includes('fix')) return 'bug';
  if (type.includes('deploy') || type.includes('build')) return 'deploy';
  return 'status';
}

function fmtTime(date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function Avatar({ name, team, size = 10 }) {
  const color = TEAM_COLORS[team] || '#8b7a66';
  const initials = (name || '??').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size,
      height: size,
      background: '#1f1720',
      border: `1px solid ${color}`,
      borderRadius: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.34,
      fontWeight: 800,
      fontFamily: 'var(--font-pixel)',
      color,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function MiniDot({ team, size = 6 }) {
  const color = TEAM_COLORS[team] || '#8b7a66';
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      background: color,
      borderRadius: 2,
      boxShadow: `0 0 4px ${color}55`,
      flexShrink: 0,
    }} />
  );
}

export default function OpsDock({ agents, selectedAgent, onClearSelection }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('chat');
  const [taskExpanded, setTaskExpanded] = useState(null);
  const [logCat, setLogCat] = useState('all');
  const listRef = useRef(null);
  const prevMsgLenRef = useRef(0);

  const { messages, unread, filter, setFilter, markRead } = useChat(agents);
  const { tasks } = useTasks(agents);
  const { logs } = useEvents(agents);

  useEffect(() => {
    if (open && tab === 'chat') markRead();
  }, [open, tab, markRead]);

  useEffect(() => {
    if (!selectedAgent) return;
    setOpen(true);
    setTab('command');
  }, [selectedAgent]);

  useEffect(() => {
    if (open && tab === 'chat' && listRef.current && messages.length > prevMsgLenRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevMsgLenRef.current = messages.length;
  }, [messages.length, open, tab]);

  const filteredMessages = filter === 'all' ? messages : messages.filter((m) => m.type === filter);
  const todo = tasks.filter((t) => t.status === 'todo');
  const inProg = tasks.filter((t) => t.status === 'in_progress');
  const done = tasks.filter((t) => t.status === 'done');
  const activeTaskCount = todo.length + inProg.length;

  const logCounts = useMemo(() => {
    const counts = {};
    LOG_CATEGORIES.forEach((c) => { counts[c.key] = 0; });
    logs.forEach((e) => {
      const c = getLogCategory(e.type);
      if (counts[c] !== undefined) counts[c] += 1;
    });
    return counts;
  }, [logs]);

  const filteredLogs = logCat === 'all' ? logs : logs.filter((e) => getLogCategory(e.type) === logCat);
  const currentTab = TABS.find((item) => item.key === tab) || TABS[0];
  const tabBadges = {
    command: selectedAgent ? 1 : 0,
    chat: unread,
    log: logs.length,
    tasks: activeTaskCount,
  };

  return (
    <>
      <style>{DOCK_ANIM}</style>
      <div style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 70,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 10,
      }}>
        {!open && (
          <button
            onMouseEnter={playUiHover}
            onClick={() => {
              playUiClick();
              setOpen(true);
              if (tab === 'chat') markRead();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              minWidth: 176,
              padding: '10px 14px',
              borderRadius: 6,
              background: 'linear-gradient(180deg, rgba(53,34,21,0.96) 0%, rgba(30,19,12,0.98) 100%)',
              border: `1px solid ${currentTab.color}66`,
              boxShadow: '0 10px 20px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <span style={{
              position: 'absolute',
              inset: 2,
              border: '1px dashed rgba(255,255,255,0.08)',
              borderRadius: 4,
              pointerEvents: 'none',
            }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.8, color: '#f3d19c', letterSpacing: '0.12em' }}>
                PAINEL
              </span>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: currentTab.color, letterSpacing: '0.08em' }}>
                {currentTab.label}
              </span>
            </span>
            <span style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 5.6,
              color: '#1b130d',
              background: currentTab.color,
              borderRadius: 4,
              padding: '1px 6px',
              minWidth: 22,
              textAlign: 'center',
            }}>
              {tabBadges[currentTab.key]}
            </span>
          </button>
        )}

        {open && (
          <div style={{
            width: 440,
            height: 540,
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(44,29,18,0.98) 0%, rgba(27,19,13,0.98) 100%)',
            border: `2px solid ${currentTab.color}66`,
            boxShadow: '0 24px 50px rgba(0,0,0,0.38), 0 0 0 4px rgba(84,55,34,0.85), inset 0 1px 0 rgba(255,255,255,0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            backdropFilter: 'blur(10px)',
            animation: 'ops-dock-rise 0.18s ease-out',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              inset: 4,
              border: '1px dashed rgba(243,209,156,0.12)',
              borderRadius: 8,
              pointerEvents: 'none',
            }} />
            <div style={{
              position: 'absolute',
              left: 14,
              right: 14,
              top: -6,
              height: 10,
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              filter: 'blur(4px)',
              opacity: 0.45,
              pointerEvents: 'none',
            }} />

            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: 'linear-gradient(180deg, rgba(74,49,32,0.92) 0%, rgba(48,31,20,0.9) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 8, color: '#f3d19c', letterSpacing: '0.16em' }}>
                  PAINEL OPERACIONAL
                </span>
                <span style={{
                  fontFamily: 'var(--font-pixel)',
                  fontSize: 5.5,
                  color: currentTab.color,
                  padding: '3px 6px',
                  borderRadius: 999,
                  border: `1px solid ${currentTab.color}55`,
                  background: `${currentTab.color}15`,
                  animation: 'ops-dock-pulse 2.8s ease-in-out infinite',
                }}>
                  {currentTab.label}
                </span>
              </div>

              <button
                onMouseEnter={playUiHover}
                onClick={() => {
                  playUiClick();
                  setOpen(false);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#d6c5ab',
                  fontFamily: 'var(--font-pixel)',
                  fontSize: 6.5,
                  cursor: 'pointer',
                  padding: '2px 4px',
                }}
              >
                X
              </button>
            </div>

            <div style={{
              padding: '10px 12px',
              display: 'flex',
              gap: 8,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(24,17,12,0.88)',
            }}>
              {TABS.map((item) => {
                const active = item.key === tab;
                return (
                  <button
                    key={item.key}
                    onMouseEnter={playUiHover}
                    onClick={() => {
                      playUiClick();
                      setTab(item.key);
                      if (item.key === 'chat') markRead();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: active ? `1px solid ${item.color}66` : '1px solid rgba(255,255,255,0.06)',
                      background: active ? `linear-gradient(180deg, ${item.color}18 0%, rgba(255,255,255,0.02) 100%)` : 'rgba(255,255,255,0.02)',
                      color: active ? item.color : '#c8aa82',
                      fontFamily: 'var(--font-pixel)',
                      fontSize: 6.2,
                      cursor: 'pointer',
                      boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                    }}
                  >
                    <span>{item.label}</span>
                    <span style={{
                      color: '#1b130d',
                      background: active ? item.color : '#a78b6d',
                      borderRadius: 4,
                      padding: '0 4px',
                      fontSize: 5,
                    }}>
                      {tabBadges[item.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {tab === 'command' && (
                <CommandDesk
                  selectedAgent={selectedAgent}
                  onClearSelection={onClearSelection}
                  embedded={true}
                />
              )}

              {tab === 'chat' && (
                <>
                  <div style={{
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    {CHAT_FILTERS.map((item) => (
                      <button
                        key={item.key}
                        onMouseEnter={playUiHover}
                        onClick={() => {
                          playUiClick();
                          setFilter(item.key);
                        }}
                        style={{
                          fontFamily: 'var(--font-pixel)',
                          fontSize: 5,
                          letterSpacing: '0.05em',
                          padding: '4px 7px',
                          borderRadius: 6,
                          border: filter === item.key ? '1px solid #8d6adf' : '1px solid rgba(255,255,255,0.08)',
                          background: filter === item.key ? 'rgba(141,106,223,0.14)' : 'rgba(255,255,255,0.02)',
                          color: filter === item.key ? '#c4b5fd' : '#a78b6d',
                          cursor: 'pointer',
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
                    {filteredMessages.length === 0 ? (
                      <div style={{ padding: '26px 14px', textAlign: 'center', fontFamily: 'var(--font-pixel)', fontSize: 5.6, color: '#6f5a46' }}>
                        NENHUMA MENSAGEM
                      </div>
                    ) : (
                      filteredMessages.map((msg) => {
                        const typeStyle = TYPE_COLORS[msg.type] || TYPE_COLORS.direct;
                        const agentColor = TEAM_COLORS[msg.fromTeam] || '#d6c5ab';
                        return (
                          <div key={msg.id} style={{
                            padding: '10px 12px',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            background: msg.read ? 'transparent' : typeStyle.bg,
                            borderLeft: `2px solid ${typeStyle.border}`,
                            position: 'relative',
                          }}>
                            <div style={{
                              position: 'absolute',
                              left: 4,
                              top: 4,
                              bottom: 4,
                              width: 1,
                              background: 'rgba(255,255,255,0.03)',
                            }} />
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <Avatar name={msg.fromName} team={msg.fromTeam} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: agentColor }}>
                                    {msg.from === 'system' ? msg.fromName : getAgentDisplayName({ id: msg.from, name: msg.fromName, team: msg.fromTeam })}
                                  </span>
                                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#7b6652' }}>
                                    {relativeChatTime(msg.timestamp)}
                                  </span>
                                </div>
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.8, color: '#e7dbc8', lineHeight: 1.45 }}>
                                  {msg.type === 'direct' && <span style={{ color: '#93c5fd' }}>@</span>}
                                  {msg.message}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {tab === 'log' && (
                <>
                  <div style={{
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    {LOG_CATEGORIES.map((item) => (
                      <button
                        key={item.key}
                        onMouseEnter={playUiHover}
                        onClick={() => {
                          playUiClick();
                          setLogCat(item.key);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          fontFamily: 'var(--font-pixel)',
                          fontSize: 4.8,
                          padding: '4px 6px',
                          borderRadius: 6,
                          border: logCat === item.key ? `1px solid ${item.color}` : '1px solid rgba(255,255,255,0.08)',
                          background: logCat === item.key ? `${item.color}14` : 'rgba(255,255,255,0.02)',
                          color: logCat === item.key ? item.color : '#a78b6d',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                        {item.key !== 'all' && logCounts[item.key] > 0 && (
                          <span style={{ fontSize: 4.4, background: `${item.color}30`, color: item.color, borderRadius: 3, padding: '0 3px' }}>
                            {logCounts[item.key]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
                    {filteredLogs.length === 0 ? (
                      <div style={{ padding: '26px 14px', textAlign: 'center', fontFamily: 'var(--font-pixel)', fontSize: 5.6, color: '#6f5a46' }}>
                        NENHUM EVENTO
                      </div>
                    ) : (
                      filteredLogs.slice(0, 60).map((event, index) => {
                        const category = getLogCategory(event.type);
                        const catDef = LOG_CATEGORIES.find((item) => item.key === category) || LOG_CATEGORIES[0];
                        return (
                          <div key={event.id || index} style={{
                            display: 'flex',
                            gap: 10,
                            padding: '8px 12px',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            position: 'relative',
                          }}>
                            <div style={{
                              position: 'absolute',
                              left: 16,
                              top: 0,
                              bottom: 0,
                              width: 1,
                              background: 'rgba(255,255,255,0.04)',
                            }} />
                            <div style={{
                              position: 'relative',
                              zIndex: 1,
                              width: 10,
                              height: 10,
                              marginTop: 6,
                              borderRadius: '50%',
                              background: catDef.color,
                              boxShadow: `0 0 6px ${catDef.color}55`,
                              flexShrink: 0,
                            }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#7b6652', minWidth: 48 }}>
                                  {fmtTime(event.time)}
                                </span>
                                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.4, color: catDef.color }}>
                                  {catDef.icon}
                                </span>
                                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.9, color: '#f5e6d3' }}>
                                  {event.agentName}
                                </span>
                              </div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.2, color: '#d6c5ab', lineHeight: 1.35 }}>
                                {event.title}
                              </div>
                              {event.meta && (
                                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.6, color: '#8f7a66', marginTop: 2 }}>
                                  {event.meta}
                                </div>
                              )}
                            </div>
                            <span style={{
                              fontFamily: 'var(--font-pixel)',
                              fontSize: 4.4,
                              color: catDef.color,
                              background: `${catDef.color}15`,
                              borderRadius: 4,
                              padding: '2px 4px',
                              alignSelf: 'flex-start',
                              border: `1px solid ${catDef.color}30`,
                            }}>
                              {event.badge}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}

              {tab === 'tasks' && (
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {[
                    { key: 'todo', label: 'A FAZER', color: STATUS_COLORS.todo, tasks: todo },
                    { key: 'in_progress', label: 'EM ANDAMENTO', color: STATUS_COLORS.in_progress, tasks: inProg },
                    { key: 'done', label: 'CONCLUIDAS', color: STATUS_COLORS.done, tasks: done },
                  ].map((section) => (
                    <div key={section.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 12px',
                        background: `linear-gradient(180deg, ${section.color}10 0%, rgba(255,255,255,0.02) 100%)`,
                        borderLeft: `2px solid ${section.color}`,
                      }}>
                        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.5, color: section.color, letterSpacing: '0.1em' }}>
                          {section.label}
                        </span>
                        <span style={{
                          fontFamily: 'var(--font-pixel)',
                          fontSize: 5.2,
                          color: section.color,
                          background: `${section.color}20`,
                          borderRadius: 4,
                          padding: '0 4px',
                        }}>
                          {section.tasks.length}
                        </span>
                      </div>

                      {section.tasks.length === 0 ? (
                        <div style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'var(--font-pixel)', fontSize: 5.6, color: '#6f5a46' }}>
                          VAZIO
                        </div>
                      ) : (
                        section.tasks.map((task) => {
                          const expanded = taskExpanded === task.id;
                          return (
                            <div key={task.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <div
                                onMouseEnter={playUiHover}
                                onClick={() => {
                                  playUiClick();
                                  setTaskExpanded(expanded ? null : task.id);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  background: expanded ? `${section.color}10` : 'transparent',
                                }}
                              >
                                <MiniDot team={task.assigned_team} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.9, color: '#f5e6d3', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {task.title}
                                  </div>
                                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.9, color: '#7b6652', marginTop: 1 }}>
                                    {getAgentDisplayName({ id: task.assigned_to, name: task.assigned_name, team: task.assigned_team })} · {relativeTaskTime(task.created_at)}
                                  </div>
                                </div>
                                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: PRIORITY_COLORS[task.priority] }}>
                                  {PRIORITY_LABELS[task.priority]}
                                </span>
                              </div>

                              {expanded && (
                                <div style={{
                                  padding: '8px 12px 10px',
                                  background: 'rgba(255,255,255,0.02)',
                                  borderTop: '1px solid rgba(255,255,255,0.04)',
                                }}>
                                  <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d' }}>AGENTE</span>
                                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#e7dbc8' }}>{getAgentDisplayName({ id: task.assigned_to, name: task.assigned_name, team: task.assigned_team })}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d' }}>STATUS</span>
                                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: section.color }}>{task.status}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: 12 }}>
                                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d' }}>PRIORIDADE</span>
                                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
