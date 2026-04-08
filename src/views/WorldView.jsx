import { useViewport } from '../hooks/useViewport';
import { getAgentDisplayName } from '../utils/agentPersona';

const ATLAS_PALETTE = {
  skyTop: '#10160d',
  skyBottom: '#1b130d',
  frame: '#7a4a28',
  frameDeep: '#4a2e16',
  wall: '#1b130d',
  wallShade: '#9a6a38',
  wallInner: '#1a1a1a',
  panel: 'rgba(46,30,19,0.9)',
  panelSoft: 'rgba(58,38,23,0.78)',
  ink: '#f5e6d3',
  muted: '#c8aa82',
};

function shortSignalText(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > 52 ? `${clean.slice(0, 51)}...` : clean;
}

const ROOM_META = {
  Engineering: { label: 'Estudio Dev', color: '#5b8def', area: { left: '8%', top: '12%', width: '24%', height: '22%' } },
  Quality: { label: 'Oficina QA', color: '#d29a3a', area: { left: '38%', top: '12%', width: '24%', height: '22%' } },
  'People Ops': { label: 'Sala Pessoas', color: '#d96d9f', area: { left: '68%', top: '12%', width: '24%', height: '22%' } },
  Operations: { label: 'Oficina Ops', color: '#5cab68', area: { left: '8%', top: '58%', width: '24%', height: '18%' } },
  Communications: { label: 'Lounge Social', color: '#d2a86a', area: { left: '38%', top: '58%', width: '24%', height: '18%' } },
  Flex: { label: 'Estudio Flex', color: '#55b6a5', area: { left: '68%', top: '58%', width: '24%', height: '18%' } },
  Meeting: { label: 'Mesa Central', color: '#c48b55', area: { left: '31%', top: '39%', width: '38%', height: '14%' } },
  Hall: { label: 'Grande Hall', color: '#f3d19c', area: { left: '22%', top: '80%', width: '56%', height: '8%' } },
};

function roomState(roomAgents) {
  const blocked = roomAgents.filter((agent) => agent.status === 'blocked').length;
  const review = roomAgents.filter((agent) => agent.status === 'waiting_review').length;
  const active = roomAgents.filter((agent) => agent.status === 'running').length;
  if (blocked > 0) return { label: 'PRESSAO', color: '#ef4444' };
  if (review > 0) return { label: 'REVISAO', color: '#f59e0b' };
  if (active > 0) return { label: 'ATIVO', color: '#86efac' };
  return { label: 'CALMO', color: '#d6c5ab' };
}

function formatCooldown(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds || 0)));
  const min = Math.floor(total / 60);
  const sec = total % 60;
  if (min <= 0) return `${sec}s`;
  return `${min}m ${String(sec).padStart(2, '0')}s`;
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      borderRadius: 14,
      background: 'linear-gradient(180deg, rgba(63,42,25,0.94) 0%, rgba(39,26,15,0.94) 100%)',
      border: '1px solid rgba(243,209,156,0.14)',
      boxShadow: '0 10px 18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)',
      padding: 12,
    }}>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.7, color: ATLAS_PALETTE.muted, letterSpacing: '0.14em' }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.5, color, marginTop: 6 }}>
        {value}
      </div>
    </div>
  );
}

function OverviewRoom({ roomKey, agents, inMeeting, agentPositions, selectedAgentId, onSelectAgent, taskSummary, underOrder }) {
  const room = ROOM_META[roomKey];
  const roomAgents = roomKey === 'Meeting'
    ? agents.filter((agent) => inMeeting[agent.id])
    : roomKey === 'Hall'
      ? agents.filter((agent) => !inMeeting[agent.id] && agent.zone === 'Hall')
      : agents.filter((agent) => !inMeeting[agent.id] && agent.zone === roomKey);
  const state = roomState(roomAgents);

  return (
    <div style={{
      position: 'absolute',
      ...room.area,
      borderRadius: roomKey === 'Meeting' ? 20 : 16,
      background: roomKey === 'Meeting'
        ? 'linear-gradient(180deg, rgba(138,90,43,0.92) 0%, rgba(92,60,29,0.94) 100%)'
        : roomKey === 'Hall'
          ? 'linear-gradient(180deg, rgba(116,80,46,0.76) 0%, rgba(79,54,31,0.84) 100%)'
          : 'linear-gradient(180deg, rgba(72,48,30,0.88) 0%, rgba(48,32,20,0.9) 100%)',
      border: '4px solid rgba(243,209,156,0.14)',
      boxShadow: `0 0 0 2px rgba(154,106,56,0.92), inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 -16px 22px rgba(24,15,9,0.14)`,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at 50% 50%, ${state.color}12 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        inset: 8,
        borderRadius: roomKey === 'Meeting' ? 14 : 10,
        border: '1px solid rgba(243,209,156,0.06)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'absolute',
        top: 8,
        left: 10,
        padding: '5px 8px',
        borderRadius: 10,
        background: 'linear-gradient(180deg, rgba(63,42,25,0.92) 0%, rgba(39,26,15,0.92) 100%)',
        border: '1px solid rgba(243,209,156,0.14)',
        boxShadow: '0 6px 12px rgba(0,0,0,0.14)',
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: room.color, letterSpacing: '0.12em' }}>
          {room.label}
        </span>
      </div>

      <div style={{
        position: 'absolute',
        top: 8,
        right: 10,
        padding: '3px 6px',
        borderRadius: 999,
        background: 'linear-gradient(180deg, rgba(58,38,23,0.88) 0%, rgba(35,23,14,0.88) 100%)',
        border: `1px solid ${state.color}44`,
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.6, color: state.color, letterSpacing: '0.08em' }}>
          {state.label}
        </span>
      </div>

      {taskSummary?.active > 0 && (
        <div style={{
          position: 'absolute',
          right: 10,
          bottom: 34,
          padding: '3px 6px',
          borderRadius: 999,
          background: 'linear-gradient(180deg, rgba(58,38,23,0.88) 0%, rgba(35,23,14,0.88) 100%)',
          border: '1px solid rgba(243,209,156,0.2)',
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.4, color: '#fde68a', letterSpacing: '0.06em' }}>
            FOCO {taskSummary.active}{taskSummary.queued > 0 ? ` +${taskSummary.queued}` : ''}
          </span>
        </div>
      )}

      {underOrder && (
        <div style={{
          position: 'absolute',
          left: 10,
          bottom: 8,
          padding: '3px 6px',
          borderRadius: 999,
          background: 'linear-gradient(180deg, rgba(58,38,23,0.92) 0%, rgba(35,23,14,0.92) 100%)',
          border: '1px solid rgba(243,209,156,0.35)',
        }}>
          <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.4, color: '#f3d19c', letterSpacing: '0.06em' }}>
            ORDEM
          </span>
        </div>
      )}

      {roomAgents.map((agent) => {
        const pos = agentPositions.get(agent.id) || { x: 50, y: 50 };
        return (
          <div
            key={agent.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelectAgent?.(agent);
            }}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              width: selectedAgentId === agent.id ? 16 : 11,
              height: selectedAgentId === agent.id ? 16 : 11,
              borderRadius: 4,
              background: room.color,
              border: selectedAgentId === agent.id ? '2px solid rgba(243,209,156,0.9)' : '1px solid rgba(255,255,255,0.12)',
              boxShadow: selectedAgentId === agent.id
                ? '0 0 14px rgba(243,209,156,0.35)'
                : `0 0 8px ${room.color}55`,
              cursor: 'pointer',
            }}
          />
        );
      })}

      <div style={{
        position: 'absolute',
        right: 10,
        bottom: 8,
        display: 'flex',
        gap: 6,
      }}>
        <span style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: 4.5,
          color: room.color,
          background: 'linear-gradient(180deg, rgba(58,38,23,0.82) 0%, rgba(35,23,14,0.82) 100%)',
          borderRadius: 6,
          border: '1px solid rgba(243,209,156,0.08)',
          padding: '3px 5px',
        }}>
          {roomAgents.length} AGT
        </span>
      </div>
    </div>
  );
}

export default function WorldView({ agents, agentPositions, meeting, llmStatus, logs = [], tasks = [], taskStats = {}, commandSignal, selectedAgentId, onSelectAgent, onClearSelection }) {
  const { width } = useViewport();
  const stacked = width < 1100;
  const { inMeeting, meetingCount } = meeting;
  const roomOrder = ['Engineering', 'Quality', 'People Ops', 'Meeting', 'Operations', 'Communications', 'Flex', 'Hall'];
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || null;
  const activeCommandSignal = commandSignal && Date.now() - commandSignal.at < 90000 ? commandSignal : null;
  const underOrderCount = activeCommandSignal ? 1 : 0;
  const blockedAgents = agents.filter((agent) => agent.status === 'blocked');
  const reviewAgents = agents.filter((agent) => agent.status === 'waiting_review');
  const liveRooms = new Set(agents.filter((agent) => !inMeeting[agent.id]).map((agent) => agent.zone)).size;
  const recentFallback = llmStatus?.last_fallback
    ? (() => {
        const ageMs = Date.now() - new Date(llmStatus.last_fallback.at).getTime();
        return ageMs < 10 * 60 * 1000 ? { ...llmStatus.last_fallback, ageMs } : null;
      })()
    : null;
  const cooldownSeconds = llmStatus?.primary_llm ? (llmStatus?.rate_limited?.[llmStatus.primary_llm]?.cooldown_seconds || 0) : 0;
  const isCoolingDown = cooldownSeconds > 0;
  const fallbackMinutes = recentFallback ? Math.max(1, Math.round(recentFallback.ageMs / 60000)) : null;
  const startupError = llmStatus?.startup_error || null;
  const pendingTaskCount = Number(taskStats?.pending || 0);
  const runningTaskCount = Number(taskStats?.running || 0) + Number(taskStats?.assigned || 0);
  const recentEvent = logs[0] || null;
  const recentMeetingEvent = logs.find((entry) => ['meeting_started', 'meeting_ended', 'agent_joined_meeting', 'agent_returned_to_station'].includes(entry.type));
  const roomTaskSummary = {};

  tasks.forEach((task) => {
    const assignedAgent = agents.find((agent) => agent.id === task.assigned_to);
    const zone = assignedAgent?.in_meeting ? 'Meeting' : (assignedAgent?.zone || 'Hall');
    if (!roomTaskSummary[zone]) roomTaskSummary[zone] = { active: 0, queued: 0 };
    if (task.status === 'in_progress') roomTaskSummary[zone].active += 1;
    if (task.status === 'todo') roomTaskSummary[zone].queued += 1;
  });

  const commandRoom = activeCommandSignal
    ? (agents.find((agent) => agent.id === activeCommandSignal.agentId)?.in_meeting ? 'Meeting' : agents.find((agent) => agent.id === activeCommandSignal.agentId)?.zone || 'Hall')
    : null;
  const commandAgent = activeCommandSignal
    ? agents.find((agent) => agent.id === activeCommandSignal.agentId) || null
    : null;
  const meetingSignal = (() => {
    if (!recentMeetingEvent) return null;
    const ageMs = Date.now() - new Date(recentMeetingEvent.time).getTime();
    if (ageMs > 2 * 60 * 1000) return null;
    if (recentMeetingEvent.type === 'meeting_started') {
      return { label: 'MESA ACIONADA', text: recentMeetingEvent.title || 'A casa chamou a reuniao.', color: '#fde68a' };
    }
    if (recentMeetingEvent.type === 'meeting_ended') {
      return { label: 'MESA ENCERRADA', text: recentMeetingEvent.title || 'A reuniao foi encerrada.', color: '#d3bce0' };
    }
    if (recentMeetingEvent.type === 'agent_joined_meeting') {
      return { label: 'CHEGADA NA MESA', text: recentMeetingEvent.title || 'Um agente acabou de chegar.', color: '#fde68a' };
    }
    return { label: 'RETORNO AO POSTO', text: recentMeetingEvent.title || 'Um agente voltou ao posto.', color: '#d3bce0' };
  })();

  return (
    <div onClick={onClearSelection} style={{
      height: '100%',
      overflow: 'auto',
      background: `linear-gradient(180deg, ${ATLAS_PALETTE.skyTop} 0%, ${ATLAS_PALETTE.skyBottom} 52%, #0f0f0f 100%)`,
      padding: stacked ? '16px 16px 88px' : '24px 24px 96px',
    }}>
      <div style={{
        maxWidth: 1320,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: stacked ? '1fr' : '1.15fr 0.85fr',
        gap: 20,
        alignItems: 'start',
      }}>
        <div style={{
          position: 'relative',
          minHeight: stacked ? 560 : 690,
          borderRadius: 28,
          background: `linear-gradient(180deg, ${ATLAS_PALETTE.wall} 0%, #c6935d 100%)`,
          boxShadow: '0 26px 60px rgba(0,0,0,0.34)',
          border: `4px solid ${ATLAS_PALETTE.frame}`,
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: 16,
            borderRadius: 22,
            background: `linear-gradient(180deg, ${ATLAS_PALETTE.wallShade} 0%, ${ATLAS_PALETTE.frame} 100%)`,
          }} />

          <div style={{
            position: 'absolute',
            left: '34%',
            top: '12%',
            width: '4%',
            height: '64%',
            borderRadius: 14,
            background: 'rgba(45,29,18,0.45)',
          }} />
          <div style={{
            position: 'absolute',
            left: '64%',
            top: '12%',
            width: '4%',
            height: '64%',
            borderRadius: 14,
            background: 'rgba(45,29,18,0.45)',
          }} />
          <div style={{
            position: 'absolute',
            left: '8%',
            top: '39%',
            width: '84%',
            height: '16%',
            borderRadius: 18,
            background: 'rgba(45,29,18,0.45)',
          }} />

          {roomOrder.map((roomKey) => (
            <OverviewRoom
              key={roomKey}
              roomKey={roomKey}
              agents={agents}
              inMeeting={inMeeting}
              agentPositions={agentPositions}
              selectedAgentId={selectedAgentId}
              onSelectAgent={onSelectAgent}
              taskSummary={roomTaskSummary[roomKey]}
              underOrder={commandRoom === roomKey}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            borderRadius: 18,
            background: 'linear-gradient(180deg, rgba(63,42,25,0.96) 0%, rgba(39,26,15,0.96) 100%)',
            border: '1px solid rgba(243,209,156,0.14)',
            boxShadow: '0 18px 34px rgba(0,0,0,0.24)',
            padding: 16,
          }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: '#f3d19c', letterSpacing: '0.16em', marginBottom: 10 }}>
              ATLAS TATICO
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.4, color: '#d5c0a4', lineHeight: 1.5 }}>
              Leitura resumida da casa. O atlas destaca risco, carga e foco visual sem abrir uma segunda narrativa.
            </div>
          </div>

          <div style={{
            borderRadius: 18,
            background: startupError ? 'rgba(96,58,18,0.78)' : isCoolingDown ? 'rgba(82,44,14,0.78)' : recentFallback ? 'rgba(82,52,14,0.72)' : 'rgba(32,20,12,0.86)',
            border: startupError ? '1px solid rgba(217,119,6,0.3)' : isCoolingDown ? '1px solid rgba(251,146,60,0.28)' : recentFallback ? '1px solid rgba(250,204,21,0.26)' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: startupError ? '0 14px 28px rgba(0,0,0,0.26), 0 0 18px rgba(217,119,6,0.08)' : isCoolingDown ? '0 14px 28px rgba(0,0,0,0.26), 0 0 18px rgba(251,146,60,0.08)' : recentFallback ? '0 14px 28px rgba(0,0,0,0.26), 0 0 16px rgba(250,204,21,0.08)' : 'none',
            padding: 14,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 8,
            }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#c8aa82', letterSpacing: '0.14em' }}>
                MALHA LLM
              </div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.1, color: startupError ? '#fbbf24' : isCoolingDown ? '#fdba74' : recentFallback ? '#fde68a' : '#9fd0ff' }}>
                {startupError ? 'PONTE' : isCoolingDown ? 'AQUECENDO' : 'PRIMARIA'} · {llmStatus?.primary_llm || 'offline'}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.2, color: '#ead7ba', lineHeight: 1.45 }}>
              {startupError
                ? `Ponte operacional indisponivel. ${startupError}. A leitura da casa segue no ultimo estado conhecido.`
                : isCoolingDown
                ? `Cooldown ativo por ${formatCooldown(cooldownSeconds)}. O arranque segue escalonado e a rota local segura a operacao.`
                : recentFallback
                ? `Fallback recente: ${recentFallback.from} -> ${recentFallback.to} · ${recentFallback.reason || 'sem motivo'} · ${fallbackMinutes} min`
                : 'Sem fallback recente. A primaria configurada segue respondendo como rota preferencial.'}
            </div>
          </div>

          {activeCommandSignal && commandAgent && (
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(180deg, rgba(72,48,26,0.96) 0%, rgba(43,28,17,0.96) 100%)',
              border: '1px solid rgba(243,209,156,0.22)',
              boxShadow: '0 14px 28px rgba(0,0,0,0.22)',
              padding: 14,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 8,
              }}>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#f3d19c', letterSpacing: '0.14em' }}>
                  CONFIRMACAO DE ORDEM
                </div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#fde68a' }}>
                  {activeCommandSignal.status}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.3, color: '#f5e6d3' }}>
                {getAgentDisplayName(commandAgent)}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.8, color: '#d5c0a4', lineHeight: 1.42, marginTop: 6 }}>
                {shortSignalText(activeCommandSignal.action || activeCommandSignal.command)}
              </div>
            </div>
          )}

          {meetingSignal && (
            <div style={{
              borderRadius: 16,
              background: 'linear-gradient(180deg, rgba(72,48,26,0.96) 0%, rgba(43,28,17,0.96) 100%)',
              border: '1px solid rgba(243,209,156,0.18)',
              boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
              padding: 14,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                marginBottom: 8,
              }}>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: meetingSignal.color, letterSpacing: '0.14em' }}>
                  {meetingSignal.label}
                </div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#d6c5ab' }}>
                  MESA
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.8, color: '#d5c0a4', lineHeight: 1.42 }}>
                {meetingSignal.text}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatCard label="SALAS VIVAS" value={`${liveRooms} ativas`} color="#86efac" />
            <StatCard label="MESA" value={meetingCount > 0 ? `${meetingCount} reunidos` : 'pronta'} color={meetingCount > 0 ? '#fde68a' : '#d6c5ab'} />
            <StatCard label="BLOQUEIOS" value={`${blockedAgents.length} agentes`} color={blockedAgents.length > 0 ? '#ef4444' : '#d6c5ab'} />
            <StatCard label="SOB ORDEM" value={`${underOrderCount} agente`} color={underOrderCount > 0 ? '#f3d19c' : '#d6c5ab'} />
            <StatCard label="FILA" value={`${pendingTaskCount} abertas`} color={pendingTaskCount > 0 ? '#fcd34d' : '#d6c5ab'} />
            <StatCard label="EM CURSO" value={`${runningTaskCount} rodando`} color={runningTaskCount > 0 ? '#f3d19c' : '#d6c5ab'} />
          </div>

          <div style={{
            borderRadius: 16,
            background: 'linear-gradient(180deg, rgba(63,42,25,0.96) 0%, rgba(39,26,15,0.96) 100%)',
            border: '1px solid rgba(243,209,156,0.14)',
            padding: 14,
          }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#c8aa82', letterSpacing: '0.14em', marginBottom: 10 }}>
              PONTOS DE ATENCAO
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {blockedAgents.length === 0 && reviewAgents.length === 0 && !selectedAgent && (
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.4, color: '#6f5a46' }}>
                  Casa estavel no momento.
                </div>
              )}

              {recentEvent && (
                <div style={{
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(243,209,156,0.08)',
                  border: '1px solid rgba(243,209,156,0.18)',
                }}>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#f3d19c', marginBottom: 4 }}>
                    ULTIMO SINAL
                  </div>
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.1, color: '#f5e6d3' }}>
                    {recentEvent.agentName}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.4, color: '#d5c0a4', lineHeight: 1.4, marginTop: 4 }}>
                    {recentEvent.title}
                  </div>
                </div>
              )}

              {blockedAgents.slice(0, 3).map((agent) => (
                <div key={`blk-${agent.id}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.18)',
                }}>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#fca5a5' }}>
                    BLOQ · {getAgentDisplayName(agent)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#d6c5ab' }}>
                    {agent.zone || '-'}
                  </span>
                </div>
              ))}

              {reviewAgents.slice(0, 2).map((agent) => (
                <div key={`rev-${agent.id}`} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.18)',
                }}>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.2, color: '#fcd34d' }}>
                    REV · {getAgentDisplayName(agent)}
                  </span>
                  <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.8, color: '#d6c5ab' }}>
                    {agent.zone || '-'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            borderRadius: 16,
            background: 'linear-gradient(180deg, rgba(63,42,25,0.96) 0%, rgba(39,26,15,0.96) 100%)',
            border: '1px solid rgba(243,209,156,0.14)',
            padding: 14,
          }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#c8aa82', letterSpacing: '0.14em', marginBottom: 10 }}>
              AGENTE EM FOCO
            </div>
            {!selectedAgent ? (
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.4, color: '#6f5a46' }}>
                Selecione um agente para abrir o foco desta vista.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6.2, color: '#f5e6d3' }}>
                  {getAgentDisplayName(selectedAgent)}
                </div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#f3d19c' }}>
                  COMODO · {selectedAgent.zone || '-'}
                </div>
                <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#d6c5ab' }}>
                  STATUS · {selectedAgent.status || '-'}
                </div>
                {selectedAgent.llm_provider && (
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#a78b6d' }}>
                    LLM · {selectedAgent.llm_provider}
                  </div>
                )}
                {activeCommandSignal?.agentId === selectedAgent.id && (
                  <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#f3d19c' }}>
                    ORDEM · {activeCommandSignal.status}
                  </div>
                )}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#d5c0a4', lineHeight: 1.45 }}>
                  {selectedAgent.current_task || selectedAgent.task || selectedAgent.summary || selectedAgent.current_action || 'Sem tarefa visivel'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
