export const getClusterDeployment = ({
  name,
  namespace,
  baseDomain,
  labels,
  pullSecretName,
}: {
  name: string;
  namespace: string;
  baseDomain: string;
  labels: string;
  pullSecretName: string;
}) => ({
  apiVersion: 'hive.openshift.io/v1',
  kind: 'ClusterDeployment',
  metadata: {
    name: name,
    namespace,
  },
  spec: {
    baseDomain: baseDomain,
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
