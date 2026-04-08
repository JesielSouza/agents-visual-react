import { useState } from 'react';
import { useTasks, relativeTime, STATUS_COLORS, PRIORITY_COLORS, PRIORITY_LABELS } from '../hooks/useTasks';
import { playUiClick, playUiHover } from '../utils/pixelSounds';

const PANEL_BORDER = 'rgba(255,255,255,0.08)';
const PANEL_SURFACE = 'rgba(26,26,26,0.75)';
const TEAM_COLORS = {
  Engineering:    '#3b82f6',
  Operations:    '#22c55e',
  Communications:'#8b5cf6',
  'People Ops':  '#ec4899',
  Quality:       '#f59e0b',
  Flex:          '#14b8a6',
};

function MiniDot({ team, size = 6 }) {
  const color = TEAM_COLORS[team] || '#555';
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      background: color, borderRadius: 2,
      boxShadow: `0 0 4px ${color}60`,
      flexShrink: 0,
    }} />
  );
}

export default function TaskBoard({ agents }) {
  const { tasks, stats } = useTasks(agents);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const todo = tasks.filter((t) => t.status === 'todo');
  const inProg = tasks.filter((t) => t.status === 'in_progress');
  const done = tasks.filter((t) => t.status === 'done');
  const failed = tasks.filter((t) => t.status === 'failed');
  const activeCount = stats.pending + stats.assigned + stats.running;

  const STATUS_SECTIONS = [
    { key: 'todo', label: 'TODO', color: STATUS_COLORS.todo, tasks: todo, count: stats.pending || todo.length, aggregateOnly: false },
    { key: 'in_progress', label: 'IN PROGRESS', color: STATUS_COLORS.in_progress, tasks: inProg, count: (stats.assigned + stats.running) || inProg.length, aggregateOnly: false },
    { key: 'done', label: 'DONE', color: STATUS_COLORS.done, tasks: done, count: stats.completed || done.length, aggregateOnly: done.length === 0 && (stats.completed || 0) > 0 },
    { key: 'failed', label: 'FAILED', color: STATUS_COLORS.failed, tasks: failed, count: stats.failed || failed.length, aggregateOnly: failed.length === 0 && (stats.failed || 0) > 0 },
  ];

  return (
    <>
      {/* Toggle button */}
      <button
        onMouseEnter={playUiHover}
        onClick={() => {
          playUiClick();
          setOpen((v) => !v);
        }}
        style={{
          position: 'fixed', bottom: 16, right: open ? 230 : 16, zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 14px',
          background: open ? '#0a0a0a' : '#1a1a1a',
          border: `2px solid ${open ? '#f59e0b' : '#374151'}`,
          borderRadius: 6,
          cursor: 'pointer',
          boxShadow: open ? '0 0 10px rgba(245,158,11,0.2)' : '0 2px 8px rgba(0,0,0,0.4)',
          transition: 'all 0.2s',
        }}
      >
        {/* Clipboard icon */}
        <svg width="10" height="10" viewBox="0 0 16 16" fill={open ? '#f59e0b' : '#6b7280'}>
          <rect x="3" y="2" width="10" height="12" rx="1" stroke={open ? '#f59e0b' : '#6b7280'} strokeWidth="1.5" fill="none"/>
          <rect x="5" y="1" width="6" height="3" rx="0.5" fill={open ? '#f59e0b' : '#6b7280'}/>
          <line x1="6" y1="7" x2="10" y2="7" stroke={open ? '#f59e0b' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="6" y1="9" x2="9" y2="9" stroke={open ? '#f59e0b' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="6" y1="11" x2="8" y2="11" stroke={open ? '#f59e0b' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        <span style={{
          fontFamily: 'var(--font-pixel)', fontSize: 6, letterSpacing: '0.15em',
          color: open ? '#f59e0b' : '#9ca3af',
        }}>
          TAREFAS
        </span>

        <span style={{
          fontFamily: 'var(--font-pixel)', fontSize: 5,
          background: '#f59e0b', color: '#000',
          borderRadius: 3, padding: '1px 5px',
          minWidth: 16, textAlign: 'center',
        }}>
          {activeCount}
        </span>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 56, right: 16, zIndex: 50,
          width: 320, maxHeight: 400,
          background: '#0a0a0a',
          borderTop: '3px solid #f59e0b',
          borderLeft: '1px solid #1f2937',
          borderRight: '1px solid #1f2937',
          borderBottom: '1px solid #1f2937',
          borderRadius: '6px 6px 0 0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            borderBottom: '1px solid #1f2937',
            background: '#0f0f0f',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-pixel)', fontSize: 6, letterSpacing: '0.2em',
                color: '#f59e0b',
              }}>
                &gt; TAREFAS
              </span>
              <span style={{
                fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#374151',
              }}>
                {activeCount} ativas / {stats.total || tasks.length} total
              </span>
            </div>
          </div>

          {/* Task columns */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {STATUS_SECTIONS.map((section) => (
              <div key={section.key} style={{ borderBottom: '1px solid #1a1a1a' }}>
                {/* Section header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  background: `${section.color}0d`,
                  borderLeft: `2px solid ${section.color}`,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-pixel)', fontSize: 5, letterSpacing: '0.1em',
                    color: section.color,
                  }}>
                    {section.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-pixel)', fontSize: 5,
                    background: `${section.color}22`, color: section.color,
                    borderRadius: 3, padding: '0 4px',
                  }}>
                    {section.count}
                  </span>
                </div>

                {/* Tasks */}
                {section.tasks.length === 0 ? (
                  <div style={{
                    padding: '8px 12px', textAlign: 'center',
                    fontFamily: 'var(--font-pixel)', fontSize: 5,
                    color: '#1f2937', letterSpacing: '0.05em',
                  }}>
                    {section.aggregateOnly ? 'resumo no backend' : section.count > 0 ? 'sincronizando' : 'vazio'}
                  </div>
                ) : (
                  section.tasks.map((task) => {
                    const isOpen = expanded === task.id;
                    return (
                      <div key={task.id} style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}>
                        <div
                          onMouseEnter={playUiHover}
                          onClick={() => {
                            playUiClick();
                            setExpanded(isOpen ? null : task.id);
                          }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px',
                            cursor: 'pointer',
                            background: isOpen ? 'rgba(27,19,13,0.82)' : 'transparent',
                          }}
                        >
                          <MiniDot team={task.assigned_team} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontFamily: 'var(--font-pixel)', fontSize: 5.5,
                              color: '#d1d5db', overflow: 'hidden',
                              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {task.title}
                            </div>
                            <div style={{
                              fontFamily: 'var(--font-pixel)', fontSize: 4.5,
                              color: '#374151', marginTop: 1,
                            }}>
                              {task.assigned_name} · {relativeTime(task.created_at)}
                            </div>
                          </div>

                          {/* Priority badge */}
                          <span style={{
                            fontFamily: 'var(--font-pixel)', fontSize: 5,
                            color: PRIORITY_COLORS[task.priority],
                            flexShrink: 0,
                          }}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        </div>

                        {/* Expanded details */}
                        {isOpen && (
                          <div style={{
                            padding: '6px 12px 8px',
                            background: PANEL_SURFACE,
                            borderTop: `1px solid ${PANEL_BORDER}`,
                          }}>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.5, color: '#555' }}>AGENTE</span>
                              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.5, color: '#9ca3af' }}>{task.assigned_name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.5, color: '#555' }}>STATUS</span>
                              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.5, color: section.color }}>{task.status}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.5, color: '#555' }}>PRIORITY</span>
                              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.5, color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
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
        </div>
      )}
    </>
  );
}
