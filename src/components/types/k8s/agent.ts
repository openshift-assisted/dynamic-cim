import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { HostRole, Inventory } from 'openshift-assisted-ui-lib/dist/src/api/types';
import { ValidationsInfo } from 'openshift-assisted-ui-lib/dist/src/types/hosts';
import { StatusCondition } from './common';

export type AgentStatusConditionType =
  | 'SpecSynced'
  | 'Validated'
  | 'Connected'
  | 'ReadyForInstallation'
  | 'Installed';

export type AgentStatusCondition = StatusCondition<AgentStatusConditionType>;

export type AgentK8sResource = K8sResourceCommon & {
  spec: {
    approved: boolean;
    clusterDeploymentName: {
      name: string;
      namespace: string;
    };
    role: HostRole;
    hostname: string;
  };
  status: {
    conditions: AgentStatusCondition[];
    hostValidationInfo: ValidationsInfo;
    inventory: Inventory;
  };
};
