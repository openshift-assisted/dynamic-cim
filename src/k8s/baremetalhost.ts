import { BareMetalHostModel } from '../models';

export const getBareMetalHost = (
  values: {
    hostname: string;
    bmcAddress: string;
    disableCertificateVerification: boolean;
    bootMACAddress: string;
    online: boolean;
  },
  namespace: string,
  secretName: string,
) => {
  const bmh = {
    apiVersion: `${BareMetalHostModel.apiGroup}/${BareMetalHostModel.apiVersion}`,
    kind: BareMetalHostModel.kind,
    metadata: {
      name: values.hostname,
      namespace,
      labels: {
        'infraenvs.agent-install.openshift.io': 'test-cluster-virtual-installenv',
      },
      annotations: {
        'inspect.metal3.io': 'disabled',
      },
    },
    spec: {
      bmc: {
        address: values.bmcAddress,
        credentialsName: secretName,
        disableCertificateVerification: !!values.disableCertificateVerification,
      },
      bootMACAddress: values.bootMACAddress,
      description: '', // TODO(mlibra)
      online: !!values.online,
      automatedCleaningMode: 'disabled',
    },
  };
  return bmh;
};
