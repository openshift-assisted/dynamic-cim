import {
  AgentK8sResource,
  ClusterDeploymentK8sResource,
  AgentClusterInstallK8sResource,
  AgentStatusConditionType,
  AgentStatusCondition,
  AgentClusterInstallStatusConditionType,
  AgentClusterInstallStatusCondition,
  StatusCondition,
} from './types';
import {
  Cluster as AICluster,
  Host as AIHost,
  Interface,
} from 'openshift-assisted-ui-lib/dist/src/api';

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

export const getHostNetworks = (
  agents: AgentK8sResource[] = [],
): { cidr: string; hostIds: string[] }[] => {
  const cidrs: { [key in string]: string[] } = {};
  agents.forEach((agent) => {
    agent.status?.inventory?.interfaces?.forEach((interf: Interface) => {
      // TODO(mlibra): re-enable TS after https://issues.redhat.com/browse/MGMT-7052
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      interf.ipV4Addresses?.forEach((addr: string) => {
        cidrs[addr] = cidrs[addr] || [];
        cidrs[addr].push(agent.metadata.uid);
      });
    });
  });

  return Object.keys(cidrs).map((cidr) => ({
    cidr,
    hostIds: cidrs[cidr],
  }));
};

export const getAIHosts = (agents: AgentK8sResource[] = []) =>
  agents.map((agent): AIHost => {
    const [status, statusInfo] = getAgentStatus(agent);
    return {
      kind: 'Host',
      id: agent.metadata.uid,
      href: '',
      status,
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
  const aiCluster: AICluster = {
    id: clusterDeployment.metadata.uid,
    kind: 'Cluster',
    href: '',
    name: clusterDeployment.spec.clusterName,
    baseDnsDomain: clusterDeployment.spec.baseDomain,
    openshiftVersion: agentClusterInstall?.spec?.imageSetRef?.name,
    apiVip: agentClusterInstall?.spec?.apiVIP,
    ingressVip: agentClusterInstall?.spec?.ingressVIP,
    status,
    statusInfo,
    imageInfo: {
      sshPublicKey: agentClusterInstall?.spec?.sshPublicKey,
    },
    sshPublicKey: agentClusterInstall?.spec?.sshPublicKey,
    clusterNetworkCidr: agentClusterInstall?.spec?.networking?.clusterNetwork?.[0]?.cidr,
    clusterNetworkHostPrefix:
      agentClusterInstall?.spec?.networking?.clusterNetwork?.[0]?.hostPrefix,
    serviceNetworkCidr: agentClusterInstall?.spec?.networking?.serviceNetwork?.[0],
    machineNetworkCidr: agentClusterInstall?.spec?.networking?.machineNetwork?.[0]?.cidr,
    monitoredOperators: [],
    pullSecretSet,
    vipDhcpAllocation: false,
    userManagedNetworking: false,
    hostNetworks: getHostNetworks(agents),
    totalHostCount: agents?.length,
    hosts: getAIHosts(agents),
  };
  return aiCluster;
};

export const getClusterValidatedCondition = (resource: AgentClusterInstallK8sResource) =>
  resource.status.conditions.find((c) => c.type === 'Validated') as StatusCondition<'Validated'>;

export const getAgentValidatedCondition = (agentClusterInstall: AgentK8sResource) =>
  agentClusterInstall.status.conditions.find(
    (c) => c.type === 'Validated',
  ) as StatusCondition<'Validated'>;
