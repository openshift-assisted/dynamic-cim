import {
  AgentK8sResource,
  ClusterDeploymentK8sResource,
  AgentClusterInstallK8sResource,
} from './types';
import { Cluster as AICluster, Host as AIHost } from 'openshift-assisted-ui-lib/dist/src/api';

export const getAIHosts = (agents: AgentK8sResource[]) =>
  agents.map(
    (agent): AIHost => ({
      kind: 'Host',
      id: agent.metadata.uid,
      href: '',
      status: 'known',
      statusInfo: 'Host is Ready',
      // validationsInfo: JSON.stringify(agent.status.hostValidationInfo),
      validationsInfo: JSON.stringify({ hardware: [] }),
      inventory: JSON.stringify(agent.status.inventory),
    }),
  );

export const getAICluster = (
  clusterDeployment: ClusterDeploymentK8sResource,
  agentClusterInstall: AgentClusterInstallK8sResource,
  agents: AgentK8sResource[],
): AICluster => ({
  id: clusterDeployment.metadata.uid,
  kind: 'Cluster',
  href: '',
  name: clusterDeployment.spec.clusterName,
  baseDnsDomain: clusterDeployment.spec.baseDomain,
  apiVip: agentClusterInstall.spec.apiVip,
  ingressVip: agentClusterInstall.spec.ingressVip,
  status: 'installing',
  statusInfo: '',
  imageInfo: {},
  monitoredOperators: [],
  hosts: getAIHosts(agents),
});
