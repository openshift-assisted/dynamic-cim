import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/api-types';

export const SecretModel: K8sKind = {
  apiVersion: 'v1',
  label: 'Secret',
  labelKey: 'public~Secret',
  plural: 'secrets',
  abbr: 'S',
  namespaced: true,
  kind: 'Secret',
  id: 'secret',
  labelPlural: 'Secrets',
  labelPluralKey: 'public~Secrets',
};
