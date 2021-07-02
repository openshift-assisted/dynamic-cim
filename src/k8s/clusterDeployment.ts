export type ClusterDeploymentParams = {
  name: string;
  namespace: string;
  baseDnsDomain: string;
  labels?: string;
  pullSecretName: string;
};

export const getClusterDeployment = ({
  name,
  namespace,
  baseDnsDomain,
  labels,
  pullSecretName,
}: ClusterDeploymentParams) => ({
  apiVersion: 'hive.openshift.io/v1',
  kind: 'ClusterDeployment',
  metadata: {
    name: name,
    namespace,
  },
  spec: {
    baseDomain: baseDnsDomain,
    clusterInstallRef: {
      group: 'extensions.hive.openshift.io',
      kind: 'AgentClusterInstall',
      name: name,
      version: 'v1beta1',
    },
    clusterName: name,
    platform: {
      agentBareMetal: {
        agentSelector: {
          matchLabels: labels,
        },
      },
    },
    pullSecretRef: {
      name: pullSecretName,
    },
  },
});
