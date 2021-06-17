import { K8sResourceCommon, Selector } from '@openshift-console/dynamic-plugin-sdk';

export type InfraEnv = K8sResourceCommon & {
  spec?: {
    agentLabelSelector?: Selector;
    agentLabels?: string[];
    clusterRef?: {
      name: string;
      namespace: string;
    };
    pullSecretRef?: {
      name: string;
    };
    sshAuthorizedKey?: string;
    proxy?: {
      httpProxy: string;
      httpsProxy: string;
      noProxy: string;
    };
  };
  status?: {
    conditions?: any[];
    isoDownloadURL?: string;
  };
};
