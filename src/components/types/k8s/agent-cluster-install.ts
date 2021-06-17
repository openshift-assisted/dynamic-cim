import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type AgentClusterInstallK8sResource = K8sResourceCommon & {
  spec?: {
    clusterDeploymentRef: {
      name: string;
    };
    apiVip?: string;
    ingressVip?: string;
    sshPublicKey?: string;
    imageSetRef?: {
      name?: string;
    };
    provisionRequirements: {
      controlPlaneAgents: number;
    };
    networking: {
      clusterNetwork?: {
        cidr: string;
        hostPrefix: number;
      }[];
      serviceNetwork?: string[];
    };
  };
  status?: {
    connectivityMajorityGroups?: string;
  };
};
