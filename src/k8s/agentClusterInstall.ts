import { CIM } from 'openshift-assisted-ui-lib';

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

  apiVIP?: string;
  ingressVIP?: string;
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
  apiVIP,
  ingressVIP,
}: AgentClusterInstallParams): CIM.AgentClusterInstallK8sResource => {
  const obj: CIM.AgentClusterInstallK8sResource = {
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
      apiVIP,
      ingressVIP,
      networking: {},
      provisionRequirements: {
        controlPlaneAgents,
      },
      holdInstallation: true, // will be changed to false to trigger the installation start (at the Review step)
      imageSetRef: {
        name: ocpVersion, // 'openshift-v4.7.0',
      },
    },
  };

  if (sshPublicKey) {
    obj.spec['sshPublicKey'] = sshPublicKey;
  }

  if (clusterNetworkCidr && clusterNetworkHostPrefix) {
    obj.spec.networking['clusterNetwork'] = [
      {
        cidr: clusterNetworkCidr, // '10.128.0.0/14',
        hostPrefix: clusterNetworkHostPrefix, // 23,
      },
    ];
  }

  if (serviceNetwork) {
    obj.spec.networking = obj.spec.networking || {};
    obj.spec.networking['serviceNetwork'] = [serviceNetwork];
  }

  return obj;
};
