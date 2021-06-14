import { AgentClusterInstallK8sResource } from 'src/components/types';

export type AgentClusterInstallParams = {
  name: string;
  namespace: string;
  ocpVersion: string; // an ImageSet name

  clusterDeploymentRefName: string;

  controlPlaneAgents?: number;
  sshPublicKey?: string;
  clusterNetworkCidr?: string;
  clusterNetworkHostPrefix?: number;
  serviceNetwork?: string;

  apiVip?: string;
  ingressVip?: string;
};

export const getAgentClusterInstall = ({
  name,
  clusterDeploymentRefName,
  namespace,
  ocpVersion,
  controlPlaneAgents = 0,
  sshPublicKey,
  clusterNetworkCidr,
  clusterNetworkHostPrefix,
  serviceNetwork,
  apiVip,
  ingressVip,
}: AgentClusterInstallParams): AgentClusterInstallK8sResource => {
  const obj: AgentClusterInstallK8sResource = {
    apiVersion: 'extensions.hive.openshift.io/v1beta1',
    kind: 'AgentClusterInstall',
    metadata: {
      name,
      namespace,
    },
    spec: {
      clusterDeploymentRef: {
        name: clusterDeploymentRefName,
      },
      apiVip,
      ingressVip,
      networking: {},
      provisionRequirements: {
        controlPlaneAgents,
      },
      imageSetRef: {
        name: ocpVersion, // 'openshift-v4.7.0',
      },
    },
  };

  if (sshPublicKey) {
    obj.spec.sshPublicKey = sshPublicKey;
  }

  if (clusterNetworkCidr && clusterNetworkHostPrefix) {
    obj.spec.networking.clusterNetwork = [
      {
        cidr: clusterNetworkCidr, // '10.128.0.0/14',
        hostPrefix: clusterNetworkHostPrefix, // 23,
      },
    ];
  }

  if (serviceNetwork) {
    obj.spec.networking = obj.spec.networking || {};
    obj.spec.networking.serviceNetwork = [serviceNetwork];
  }

  return obj;
};
