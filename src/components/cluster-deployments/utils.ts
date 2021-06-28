import { getClusterStatus } from '../ai-utils';
import { AgentClusterInstallK8sResource } from '../types';

export const canEditCluster = (agentClusterInstall?: AgentClusterInstallK8sResource): boolean => {
  if (!agentClusterInstall) {
    return false;
  }
  const [status] = getClusterStatus(agentClusterInstall);
  return ['insufficient', 'ready', 'pending-for-input'].includes(status);
};
