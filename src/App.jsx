import { useEffect, useMemo, useState } from 'react';
import Toolbar from './components/Toolbar';
import AgentBar from './components/AgentBar';
import OpsDock from './components/OpsDock';
import WorldView from './views/WorldView';
import OfficeView from './views/OfficeView';
import OfficeChatView from './views/OfficeChatView';
import { useAgents } from './hooks/useAgents';
import { useMeeting } from './hooks/useMeeting';
import { useLLMStatus } from './hooks/useLLMStatus';
import { useTasks } from './hooks/useTasks';
import { useEvents } from './hooks/useEvents';
import { useChat } from './hooks/useChat';
import { useCommandCenter } from './hooks/useCommandCenter';

export default function App() {
  const [view, setView] = useState('office');
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [commandSignal, setCommandSignal] = useState(null);
  const { agents, agentPositions, updateInMeeting } = useAgents();
  const meeting = useMeeting(agents);
  const llmStatus = useLLMStatus();
  const { tasks, stats } = useTasks(agents);
  const agentsWithMeetingState = useMemo(
    () => agents.map((agent) => ({
      ...agent,
      in_meeting: !!meeting.inMeeting[agent.id],
    })),
    [agents, meeting.inMeeting]
  );
  const { logs } = useEvents(agentsWithMeetingState);
  const chat = useChat(agentsWithMeetingState);
  const commandCenter = useCommandCenter();
  const selectedAgent = agentsWithMeetingState.find((agent) => agent.id === selectedAgentId) || null;
  const activeCommandSignal = commandSignal && Date.now() - commandSignal.at < 90000 ? commandSignal : null;
  const commandAgent = activeCommandSignal
    ? agentsWithMeetingState.find((agent) => agent.id === activeCommandSignal.agentId) || null
    : null;
  const focusAgent = selectedAgent || commandAgent || null;

  useEffect(() => {
    if (!commandSignal?.agentId) return;
    setSelectedAgentId(commandSignal.agentId);
  }, [commandSignal]);

  return (
    <div className="h-screen flex flex-col" style={{ background: 'transparent' }}>
      <Toolbar
        view={view}
        onViewChange={setView}
        agentCount={agentsWithMeetingState.length}
        agents={agentsWithMeetingState}
        commandSignal={commandSignal}
        selectedAgentId={selectedAgentId}
        onSelectAgent={(agent) => setSelectedAgentId(agent.id)}
      />
      <AgentBar
        selectedAgent={focusAgent}
        commandAgent={commandAgent}
        commandSignal={commandSignal}
        onClearSelection={() => {
          setSelectedAgentId(null);
          setCommandSignal(null);
        }}
      />
      <div className="flex-1 overflow-hidden relative">
        {view === 'world' ? (
          <WorldView
            agents={agentsWithMeetingState}
            agentPositions={agentPositions}
            meeting={meeting}
            llmStatus={llmStatus}
            logs={logs}
            tasks={tasks}
            taskStats={stats}
            commandSignal={commandSignal}
            selectedAgentId={selectedAgentId}
            onSelectAgent={(agent) => setSelectedAgentId(agent.id)}
            onClearSelection={() => setSelectedAgentId(null)}
          />
        ) : view === 'chat' ? (
          <OfficeChatView
            agents={agentsWithMeetingState}
            chat={chat}
          />
        ) : (
          <OfficeView
            agents={agentsWithMeetingState}
            agentPositions={agentPositions}
            meeting={meeting}
            updateInMeeting={updateInMeeting}
            llmStatus={llmStatus}
            logs={logs}
            tasks={tasks}
            taskStats={stats}
            selectedAgentId={selectedAgentId}
            commandSignal={commandSignal}
            onSelectAgent={(agent) => setSelectedAgentId(agent.id)}
            onClearSelection={() => setSelectedAgentId(null)}
          />
        )}
      </div>
      <OpsDock
        agents={agentsWithMeetingState}
        chat={chat}
        logs={logs}
        tasks={tasks}
        taskStats={stats}
        commandCenter={commandCenter}
        selectedAgent={selectedAgent}
        onCommandSignal={setCommandSignal}
        onClearSelection={() => setSelectedAgentId(null)}
      />
    </div>
  );
}
