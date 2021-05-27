import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Inventory } from 'openshift-assisted-ui-lib/dist/src/api/types';
import { ValidationsInfo } from 'openshift-assisted-ui-lib/dist/src/types/hosts';

export type AgentK8sResource = K8sResourceCommon & {
  spec: {
    approved: boolean;
    clusterDeploymentName: {
      name: string;
      namespace: string;
    };
    role: string;
  };
  status: {
    conditions: any;
    hostValidationInfo: ValidationsInfo;
    inventory: Inventory;
  };
};
