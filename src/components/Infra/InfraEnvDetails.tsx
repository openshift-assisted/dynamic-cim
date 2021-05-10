import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/api';
import { InfraEnvDetails as InfraEnvDetailsAssisted } from 'openshift-assisted-ui-lib';
import * as React from 'react';

const InfraEnvDetails: React.FC = () => {
  const [infra] = useK8sWatchResource<K8sResourceCommon>({
    kind: 'agent-install.openshift.io~v1beta1~InfraEnv',
    name: 'example',
    namespace: 'default',
    namespaced: true,
  });

  return <InfraEnvDetailsAssisted name={infra?.metadata?.name} provider="Foo" location="foo" labels={{}} />
}

export default InfraEnvDetails;