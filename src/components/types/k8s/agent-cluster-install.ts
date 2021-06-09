import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type AgentClusterInstallK8sResource = K8sResourceCommon & {
  spec?: {
    apiVip?: string;
    ingressVip?: string;
    imageSetRef?: {
      name?: string;
    };
  };
  status?: {
    connectivityMajorityGroups?: string;
  };
};
