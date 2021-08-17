import { MatchExpression } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/console-types';
import { CIM } from 'openshift-assisted-ui-lib';
import { AgentClusterInstallK8sResource } from 'openshift-assisted-ui-lib/dist/src/cim';

const { getClusterStatus, AGENT_LOCATION_LABEL_KEY } = CIM;

export const canEditCluster = (agentClusterInstall?: AgentClusterInstallK8sResource): boolean => {
  if (!agentClusterInstall) {
    return false;
  }
  const [status] = getClusterStatus(agentClusterInstall);
  return ['insufficient', 'ready', 'pending-for-input'].includes(status);
};

export const getAgentLocationMatchExpression = (
  locations?: string[],
): MatchExpression[] | undefined => {
  // TODO(mlibra): Implement 'Unspecified' location matching all Agents without location-label set.
  // However, that will probably not be possible with matchExpressions (we need join the expressions with OR).
  return locations?.length
    ? [
        {
          key: AGENT_LOCATION_LABEL_KEY,
          operator: 'In',
          values: locations,
        },
      ]
    : undefined;
};
