import _ from 'lodash';
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
  Inventory,
} from 'openshift-assisted-ui-lib/dist/src/api';

const conditionsByTypeReducer = (result, condition) => ({ ...result, [condition.type]: condition });

export const getClusterStatusFromConditions = (
  agentClusterInstall: AgentClusterInstallK8sResource,
): [AICluster['status'], string] => {
  const conditions = agentClusterInstall?.status?.conditions || [];

  const conditionsByType: {
    [key in AgentClusterInstallStatusConditionType]?: AgentClusterInstallStatusCondition;
  } = conditions.reduce(conditionsByTypeReducer, {});

  const { Validated, RequirementsMet, Completed, Stopped } = conditionsByType;

  if (!Validated || !RequirementsMet || !Completed || !Stopped) {
    return ['insufficient', 'AgentClusterInstall conditions are missing.'];
  }

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

  console.error('Unhandled conditions to cluster status mapping: ', conditionsByType);
  return ['insufficient', 'Unexpected AgentClusterInstall conditions.'];
};

export const getClusterStatus = (
  agentClusterInstall: AgentClusterInstallK8sResource,
): [AICluster['status'], AICluster['statusInfo']] => {
  const { state: status, stateInfo: statusInfo } = agentClusterInstall.status?.debugInfo || {};
  return [status, statusInfo];
};

export const getAgentStatusFromConditions = (
  agent: AgentK8sResource,
): [AIHost['status'], string] => {
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

const getAgentStatus = (agent: AgentK8sResource): [AIHost['status'], AIHost['statusInfo']] => [
  agent.status?.debugInfo?.state,
  agent.status?.debugInfo?.stateInfo,
];

export const getHostNetworks = (
  agents: AgentK8sResource[],
  agentClusterInstall?: AgentClusterInstallK8sResource,
) => {
  if (!agents?.length || !agentClusterInstall?.status?.connectivityMajorityGroups) {
    return [];
  }

  const connectivityMajorityGroups = JSON.parse(
    agentClusterInstall.status.connectivityMajorityGroups,
  );

  // Format: '{"192.168.122.0/24":["4ae8f799-7d60-4d13-be7b-f9c93ddec28e","c891ff23-9b0d-4b8e-be05-c9bcc145e823","cd188ad8-8290-4e7f-a86f-b85fef0e63aa"]}'
  return Object.keys(connectivityMajorityGroups).map((cidr) => {
    const hostIds: string[] = [];
    connectivityMajorityGroups[cidr].forEach((hostName: string) => {
      const agent: AgentK8sResource = agents.find((agent) => agent.metadata.name === hostName);
      if (!agent) {
        console.warn(`Can not find agent of ${hostName} name.`);
      } else {
        hostIds.push(agent.metadata.uid);
      }
    });

    return {
      cidr,
      hostIds,
    };
  });
};

export const getAIHosts = (agents: AgentK8sResource[] = []) =>
  agents.map((agent): AIHost => {
    const [status, statusInfo] = getAgentStatus(agent);

    // TODO(mlibra) Remove that workaround once https://issues.redhat.com/browse/MGMT-7052 is fixed
    const inventory: Inventory = _.cloneDeep(agent.status.inventory);
    inventory.interfaces?.forEach((intf) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      intf.ipv4Addresses = _.cloneDeep(intf.ipV4Addresses);
    });

    return {
      kind: 'Host',
      id: agent.metadata.uid,
      href: '',
      status,
      statusInfo,
      role: agent.spec.role,
      requestedHostname: agent.spec.hostname || inventory.hostname,
      // validationsInfo: JSON.stringify(agent.status.hostValidationInfo),
      createdAt: agent.metadata.creationTimestamp,
      validationsInfo: JSON.stringify({ hardware: [] }),
      inventory: JSON.stringify(inventory),
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
    id: clusterDeployment.metadata?.uid || '',
    kind: 'Cluster',
    href: '',
    name: clusterDeployment.spec?.clusterName,
    baseDnsDomain: clusterDeployment.spec?.baseDomain,
    openshiftVersion: agentClusterInstall?.spec?.imageSetRef?.name,
    apiVip: agentClusterInstall?.spec?.apiVIP,
    ingressVip: agentClusterInstall?.spec?.ingressVIP,
    status,
    statusInfo,
    imageInfo: {
      sshPublicKey: agentClusterInstall?.spec?.sshPublicKey,
    },
    sshPublicKey: agentClusterInstall?.spec?.sshPublicKey,
    clusterNetworkHostPrefix:
      agentClusterInstall?.spec?.networking?.clusterNetwork?.[0]?.hostPrefix,
    clusterNetworkCidr: agentClusterInstall?.spec?.networking?.clusterNetwork?.[0]?.cidr,
    serviceNetworkCidr: agentClusterInstall?.spec?.networking?.serviceNetwork?.[0],
    machineNetworkCidr: agentClusterInstall?.spec?.networking?.machineNetwork?.[0]?.cidr,
    monitoredOperators: [],
    pullSecretSet,
    vipDhcpAllocation: false,
    userManagedNetworking: false,
    hostNetworks: getHostNetworks(agents, agentClusterInstall),
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
