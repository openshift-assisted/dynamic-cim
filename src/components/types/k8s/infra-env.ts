import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

export type InfraEnv = K8sResourceCommon & {
  status?: {
    conditions?: any[];
    isoDownloadURL?: string;
  };
};
