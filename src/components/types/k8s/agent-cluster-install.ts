import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { StatusCondition } from './common';

export type AgentClusterInstallStatusConditionType =
  | 'SpecSynced'
  | 'Validated'
  | 'RequirementsMet'
  | 'Completed'
  | 'Failed'
  | 'Stopped';

export type AgentClusterInstallStatusCondition =
  StatusCondition<AgentClusterInstallStatusConditionType>;

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
    conditions: AgentClusterInstallStatusCondition[];
  };
};
