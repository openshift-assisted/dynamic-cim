import { SecretModel } from '../models';

export const getBareMetalHostCredentialsSecret = (
  values: {
    username: string;
    password: string;
    hostname: string;
  },
  namespace: string,
) => {
  const credentialsSecret = {
    apiVersion: SecretModel.apiVersion,
    kind: SecretModel.kind,
    stringData: {
      username: btoa(values.username),
      password: btoa(values.password),
    },
    metadata: {
      generateName: `bmc-${values.hostname.split('.').shift()}-`,
      namespace,
    },
    type: 'Opaque',
  };

  return credentialsSecret;
};

export const getPullSecretResource = ({
  name,
  namespace,
  pullSecret,
}: {
  name: string;
  namespace: string;
  pullSecret: string;
}) => ({
  kind: 'Secret',
  apiVersion: 'v1',
  metadata: {
    generateName: `pullsecret-${name}-`,
    namespace,
  },
  data: {
    '.dockerconfigjson': btoa(pullSecret),
  },
  type: 'kubernetes.io/dockerconfigjson',
});
