import { useState } from 'react';
import Toolbar from './components/Toolbar';
import AgentBar from './components/AgentBar';
import OpsDock from './components/OpsDock';
import WorldView from './views/WorldView';
import OfficeView from './views/OfficeView';
import { useAgents } from './hooks/useAgents';
import { useMeeting } from './hooks/useMeeting';

export default function App() {
  const [view, setView] = useState('office');
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const { agents, agentPositions, updateInMeeting } = useAgents();
  const meeting = useMeeting(agents);
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) || null;

  return (
    <div className="h-screen flex flex-col" style={{ background: '#10160d' }}>
      <Toolbar
        view={view}
        onViewChange={setView}
        agentCount={agents.length}
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={(agent) => setSelectedAgentId(agent.id)}
      />
      <AgentBar
        selectedAgent={selectedAgent}
        onClearSelection={() => setSelectedAgentId(null)}
      />
      <div className="flex-1 overflow-hidden relative">
        {view === 'world' ? (
          <WorldView
            agents={agents}
            agentPositions={agentPositions}
            meeting={meeting}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(agent) => setSelectedAgentId(agent.id)}
            onClearSelection={() => setSelectedAgentId(null)}
          />
        ) : (
          <OfficeView
            agents={agents}
            agentPositions={agentPositions}
            meeting={meeting}
            updateInMeeting={updateInMeeting}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(agent) => setSelectedAgentId(agent.id)}
            onClearSelection={() => setSelectedAgentId(null)}
          />
        )}
      </div>
      <OpsDock
        agents={agents}
        selectedAgent={selectedAgent}
        onClearSelection={() => setSelectedAgentId(null)}
      />
    </div>
  );
}
