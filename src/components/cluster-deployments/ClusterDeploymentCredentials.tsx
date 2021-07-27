import React from 'react';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk/api';
import { CIM } from 'openshift-assisted-ui-lib';
import { SecretModel } from '../../models/ocp';

const { ClusterCredentials } = CIM;

type ClusterDeploymentCredentialsProps = {
  cluster: CIM.Cluster;
  consoleUrl: string;
  namespace: string;
  adminPasswordSecretRefName: string;
};

const ClusterDeploymentCredentials = ({
  cluster,
  consoleUrl,
  namespace,
  adminPasswordSecretRefName,
}: ClusterDeploymentCredentialsProps) => {
  const [credentials, setCredentials] = React.useState({});

  React.useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const secret = await k8sGet(SecretModel, adminPasswordSecretRefName, namespace);
        setCredentials({
          username: atob(secret.data.username),
          password: atob(secret.data.password),
        });
      } catch (e) {
        console.error('Failed to fetch adminPasswordSecret secret.', e);
      }
    };
    if (['installed', 'adding-hosts'].includes(cluster.status)) {
      fetchCredentials();
    }
  }, [cluster.status, adminPasswordSecretRefName, namespace]);

  return <ClusterCredentials cluster={cluster} credentials={{ ...credentials, consoleUrl }} />;
};

export default ClusterDeploymentCredentials;
