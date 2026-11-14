import { LocalAgentCore } from './core.js';
import { Logger } from '../../../packages/shared/src/logger.js';
import { DEFAULT_AGENT_PORT } from '../../../packages/shared/src/constants.js';

export async function startLocalAgent(port: number = DEFAULT_AGENT_PORT): Promise<LocalAgentCore> {
  const logger = new Logger('kavach-agent');
  const agent = new LocalAgentCore(port, logger);
  await agent.start();
  return agent;
}

export * from './core.js';
export * from './lifecycle.js';
export * from './ipc-server.js';
export * from './cloud-sync.js';

