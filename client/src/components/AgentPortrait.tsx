import type { Agent } from '../types';

interface Props {
  agent: Agent | null | undefined;
  size?: 'sm' | 'lg';
}

export function AgentPortrait({ agent, size = 'lg' }: Props) {
  const cls = size === 'sm' ? 'agent-portrait-sm' : 'agent-portrait';
  if (!agent) {
    return (
      <div className={cls}>
        <img src="/sigil.svg" alt="" />
      </div>
    );
  }
  if (agent.portrait_path) {
    return (
      <div className={cls}>
        <img src={`/api/agents/${agent.id}/portrait`} alt={agent.name} />
      </div>
    );
  }
  return (
    <div className={cls}>
      <img src="/sigil.svg" alt="" />
    </div>
  );
}
