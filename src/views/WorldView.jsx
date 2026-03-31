const ROOM_META = {
  Engineering: { label: 'Estudio Dev', color: '#5b8def', area: { left: '8%', top: '10%', width: '24%', height: '24%' } },
  Quality: { label: 'Oficina QA', color: '#d29a3a', area: { left: '38%', top: '10%', width: '24%', height: '24%' } },
  'People Ops': { label: 'Sala Pessoas', color: '#d96d9f', area: { left: '68%', top: '10%', width: '24%', height: '24%' } },
  Operations: { label: 'Oficina Ops', color: '#5cab68', area: { left: '8%', top: '60%', width: '24%', height: '22%' } },
  Communications: { label: 'Lounge Social', color: '#8d6adf', area: { left: '38%', top: '60%', width: '24%', height: '22%' } },
  Flex: { label: 'Estudio Flex', color: '#55b6a5', area: { left: '68%', top: '60%', width: '24%', height: '22%' } },
  Meeting: { label: 'Mesa Central', color: '#c48b55', area: { left: '30%', top: '36%', width: '40%', height: '20%' } },
};

function OverviewRoom({ roomKey, agents, inMeeting, agentPositions, selectedAgentId, onSelectAgent }) {
  const room = ROOM_META[roomKey];
  const roomAgents = roomKey === 'Meeting'
    ? agents.filter((agent) => inMeeting[agent.id])
    : agents.filter((agent) => !inMeeting[agent.id] && agent.zone === roomKey);
  const active = roomAgents.filter((agent) => agent.status === 'running').length;
  const blocked = roomAgents.filter((agent) => agent.status === 'blocked').length;

  return (
    <div style={{
      position: 'absolute',
      ...room.area,
      borderRadius: roomKey === 'Meeting' ? 24 : 18,
      background: roomKey === 'Meeting' ? 'rgba(88,59,32,0.88)' : 'rgba(52,34,22,0.78)',
      border: `2px solid ${room.color}66`,
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 8,
        left: 10,
        padding: '4px 7px',
        borderRadius: 999,
        background: 'rgba(18,13,9,0.7)',
        border: `1px solid ${room.color}55`,
      }}>
        <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: room.color, letterSpacing: '0.12em' }}>
          {room.label}
        </span>
      </div>

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
              width: selectedAgentId === agent.id ? 14 : 10,
              height: selectedAgentId === agent.id ? 14 : 10,
              borderRadius: 3,
              background: room.color,
              border: selectedAgentId === agent.id ? '2px solid rgba(243,209,156,0.9)' : '1px solid rgba(255,255,255,0.45)',
              boxShadow: selectedAgentId === agent.id
                ? '0 0 14px rgba(243,209,156,0.35)'
                : (agent.status === 'blocked' ? '0 0 10px rgba(239,68,68,0.45)' : `0 0 8px ${room.color}55`),
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
          background: 'rgba(18,13,9,0.66)',
          borderRadius: 6,
          padding: '3px 5px',
        }}>
          {roomAgents.length} AGT
        </span>
        {active > 0 && (
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 4.5,
            color: '#86efac',
            background: 'rgba(18,13,9,0.66)',
            borderRadius: 6,
            padding: '3px 5px',
          }}>
            {active} ATV
          </span>
        )}
        {blocked > 0 && (
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 4.5,
            color: '#fca5a5',
            background: 'rgba(18,13,9,0.66)',
            borderRadius: 6,
            padding: '3px 5px',
          }}>
            {blocked} BLQ
          </span>
        )}
      </div>
    </div>
  );
}

export default function WorldView({ agents, agentPositions, meeting, selectedAgentId, onSelectAgent, onClearSelection }) {
  const { inMeeting, meetingCount } = meeting;
  const roomOrder = ['Engineering', 'Quality', 'People Ops', 'Operations', 'Communications', 'Flex', 'Meeting'];
  const available = agents.filter((agent) => !inMeeting[agent.id]).length;

  return (
    <div onClick={onClearSelection} style={{
      height: '100%',
      overflow: 'auto',
      background: 'linear-gradient(180deg, #1c2614 0%, #10160d 100%)',
      padding: '28px 26px 112px',
    }}>
      <div style={{
        maxWidth: 1360,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 24,
        alignItems: 'start',
      }}>
        <div style={{
          position: 'relative',
          minHeight: 760,
          borderRadius: 34,
          background: 'linear-gradient(180deg, #d7b27d 0%, #b98a56 100%)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.35)',
          border: '4px solid #7a5934',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            inset: 18,
            borderRadius: 26,
            background: 'linear-gradient(180deg, #7f5d3d 0%, #6d4d31 100%)',
          }} />

          <div style={{
            position: 'absolute',
            left: '34%',
            top: '10%',
            width: '4%',
            height: '72%',
            borderRadius: 14,
            background: 'rgba(45,29,18,0.45)',
          }} />
          <div style={{
            position: 'absolute',
            left: '64%',
            top: '10%',
            width: '4%',
            height: '72%',
            borderRadius: 14,
            background: 'rgba(45,29,18,0.45)',
          }} />
          <div style={{
            position: 'absolute',
            left: '8%',
            top: '36%',
            width: '84%',
            height: '22%',
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
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{
            borderRadius: 24,
            background: 'rgba(32,20,12,0.86)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 18px 34px rgba(0,0,0,0.28)',
            padding: 18,
          }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: '#f3d19c', letterSpacing: '0.16em', marginBottom: 10 }}>
              ATLAS DA CASA
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#d5c0a4', lineHeight: 1.5 }}>
              Visao tatica da casa. Aqui a leitura e operacional: onde cada equipe esta, quais comodos estao vivos e quantos agentes foram puxados para a mesa central.
            </div>
          </div>

          {[
            { label: 'DENTRO', value: `${agents.length} agentes`, color: '#86efac' },
            { label: 'DISPONIVEIS', value: `${available} circulando`, color: '#bfdbfe' },
            { label: 'MESA', value: meetingCount > 0 ? `${meetingCount} reunidos` : 'quieta', color: meetingCount > 0 ? '#fde68a' : '#d6c5ab' },
            { label: 'COMODOS ATIVOS', value: `${new Set(agents.filter((a) => !inMeeting[a.id]).map((a) => a.zone)).size} comodos`, color: '#f9a8d4' },
          ].map((card) => (
            <div key={card.label} style={{
              borderRadius: 18,
              background: 'rgba(32,20,12,0.86)',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: 14,
            }}>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#c8aa82', letterSpacing: '0.14em' }}>
                {card.label}
              </div>
              <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 7, color: card.color, marginTop: 6 }}>
                {card.value}
              </div>
            </div>
          ))}

          <div style={{
            borderRadius: 18,
            background: 'rgba(32,20,12,0.86)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: 14,
          }}>
            <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#c8aa82', letterSpacing: '0.14em', marginBottom: 10 }}>
              MAPA DE COMODOS
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(ROOM_META).filter(([key]) => key !== 'Meeting').map(([key, room]) => {
                const count = agents.filter((agent) => !inMeeting[agent.id] && agent.zone === key).length;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: room.color, boxShadow: `0 0 8px ${room.color}55` }} />
                      <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.5, color: '#e5d5be' }}>
                        {room.label}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5.5, color: room.color }}>
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
