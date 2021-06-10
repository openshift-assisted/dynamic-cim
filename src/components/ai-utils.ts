import {
  AgentK8sResource,
  ClusterDeploymentK8sResource,
  AgentClusterInstallK8sResource,
  AgentStatusConditionType,
  AgentStatusCondition,
  AgentClusterInstallStatusConditionType,
  AgentClusterInstallStatusCondition,
} from './types';
import { Cluster as AICluster, Host as AIHost } from 'openshift-assisted-ui-lib/dist/src/api';

const conditionsByTypeReducer = (result, condition) => ({ ...result, [condition.type]: condition });

export const getClusterStatus = (
  agentClusterInstall: AgentClusterInstallK8sResource,
): [AICluster['status'], string] => {
  const conditions = agentClusterInstall.status.conditions;
  const conditionsByType: {
    [key in AgentClusterInstallStatusConditionType]?: AgentClusterInstallStatusCondition;
  } = conditions.reduce(conditionsByTypeReducer, {});

  const { Validated, RequirementsMet, Completed, Stopped } = conditionsByType;

  if (Stopped.status === 'True' && Stopped.reason === 'InstallationCancelled')
    return ['cancelled', Stopped.message];
  if (Stopped.status === 'True' && Stopped.reason === 'InstallationFailed')
    return ['error', Stopped.message];
  if (Completed.status === 'True' && Completed.reason === 'InstallationCompleted')
    return ['installed', Completed.message];
  if (Completed.status === 'False' && Completed.reason === 'InstallationInProgress')
    return ['installing', Completed.message];
  if (Validated.status === 'False' && Validated.reason === 'ValidationsFailing')
    return ['insufficient', Validated.message];
  if (Validated.status === 'False' && Validated.reason === 'ValidationsUserPending')
    return ['pending-for-input', Validated.message];
  if (Validated.status === 'False' && Validated.reason === 'ValidationsUnknown')
    return ['insufficient', Validated.message];

  if (RequirementsMet.status === 'False' && RequirementsMet.reason === 'ClusterNotReady')
    return ['insufficient', RequirementsMet.message];
  if (RequirementsMet.status === 'False' && RequirementsMet.reason === 'InsufficientAgents')
    return ['insufficient', RequirementsMet.message];
  if (RequirementsMet.status === 'False' && RequirementsMet.reason === 'UnapprovedAgents')
    return ['insufficient', RequirementsMet.message];
  if (Completed.status === 'False' && Completed.reason === 'UnapprovedAgents')
    return ['insufficient', Completed.message];
};

export const getAgentStatus = (agent: AgentK8sResource): [AIHost['status'], string] => {
  const conditions = agent.status.conditions;

  const conditionsByType: { [key in AgentStatusConditionType]?: AgentStatusCondition } =
    conditions.reduce(conditionsByTypeReducer, {});

  const { Installed, Connected, ReadyForInstallation } = conditionsByType;

  if (Installed.status === 'True') return ['installed', Installed.message];
  if (Installed.status === 'False' && Installed.reason === 'InstallationFailed')
    return ['error', Installed.message];
  if (Installed.status === 'False' && Installed.reason === 'InstallationInProgress')
    return ['installing', Installed.message];
  if (Connected.status === 'False') return ['disconnected', Connected.message];
  if (ReadyForInstallation.status === 'True') return ['known', ReadyForInstallation.message];
  if (
    ReadyForInstallation.status === 'False' &&
    ReadyForInstallation.reason === 'AgentIsNotApproved'
  )
    return ['pending-for-input', ReadyForInstallation.message];
  if (ReadyForInstallation.status === 'False' && ReadyForInstallation.reason === 'AgentNotReady')
    return ['insufficient', ReadyForInstallation.message];
};

export const getAIHosts = (agents: AgentK8sResource[] = []) =>
  agents.map((agent): AIHost => {
    const [status, statusInfo] = getAgentStatus(agent);
    return {
      kind: 'Host',
      id: agent.metadata.uid,
      href: '',
      status: status,
      statusInfo: statusInfo,
      role: agent.spec.role,
      requestedHostname: agent.spec.hostname,
      // validationsInfo: JSON.stringify(agent.status.hostValidationInfo),
      validationsInfo: JSON.stringify({ hardware: [] }),
      inventory: JSON.stringify(agent.status.inventory),
    };
  });

export const getAICluster = ({
  clusterDeployment,
  agentClusterInstall,
  agents = [],
  pullSecretSet = false,
}: {
  clusterDeployment: ClusterDeploymentK8sResource;
  agentClusterInstall?: AgentClusterInstallK8sResource;
  agents?: AgentK8sResource[];
  pullSecretSet?: boolean;
}): AICluster => {
  const [status, statusInfo] = getClusterStatus(agentClusterInstall);
  return {
    id: clusterDeployment.metadata.uid,
    kind: 'Cluster',
    href: '',
    name: clusterDeployment.spec.clusterName,
    baseDnsDomain: clusterDeployment.spec.baseDomain,
    openshiftVersion: agentClusterInstall?.spec?.imageSetRef?.name,
    apiVip: agentClusterInstall?.spec?.apiVip,
    ingressVip: agentClusterInstall?.spec?.ingressVip,
    status,
    statusInfo,
    imageInfo: {},
    monitoredOperators: [],
    hosts: getAIHosts(agents),
    pullSecretSet,
  };
};
