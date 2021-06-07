import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import {
  ClusterDeploymentWizard,
  Types,
  ClusterDeploymentWizardValues,
} from 'openshift-assisted-ui-lib';
import {
  useK8sModel,
  k8sCreate,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk/api';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { ClusterDeploymentKind, ClusterImageSetKind } from '../../kind';
import { getClusterDeployment, getPullSecretResource } from '../../k8s';
import { ClusterDeploymentK8sResource } from '../types';

import './cluster-deployment.scss';

const CreateClusterWizard: React.FC<RouteComponentProps<{ ns: string }>> = ({ match, history }) => {
  const [clusterDeploymentModel] = useK8sModel(ClusterDeploymentKind);
  const [secretModel] = useK8sModel('core~v1~Secret');

  const namespace = match?.params?.ns || 'assisted-installer';
  const defaultPullSecret = ''; // Can be retrieved from c.rh.c . We can not query that here.

  const onClusterCreate = async (params: ClusterDeploymentWizardValues) => {
    try {
      const { name, pullSecret } = params;
      const labels = undefined; // parseStringLabels(['foo=bar']); // TODO(mlibra): Required by backend but can be selected in a later step

      const secret = await k8sCreate(
        secretModel,
        getPullSecretResource({ namespace, name, pullSecret }),
      );
      const pullSecretName = secret?.metadata?.name;
      await k8sCreate(
        clusterDeploymentModel,
        getClusterDeployment({ namespace, labels, pullSecretName, ...params }),
      );

      // TODO(mlibra): InstallEnv should be patched for the ClusterDeployment reference
    } catch (e) {
      // A string-only is expected. or change ClusterDeploymentDetails in the assisted-ui-lib
      throw `Failed to cretate the ClusterDeployment resource: ${e.message}`;
    }
  };

  const onClose = () => {
    history.push(`/k8s/${match?.params?.ns || 'all-namespaces'}/${ClusterDeploymentKind}`);
  };

  const [clusterImageSets] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: ClusterImageSetKind,
    namespaced: false,
    isList: true,
  });
  const ocpVersions = (clusterImageSets || []).map(
    (clusterImageSet, index): Types.OpenshiftVersionOptionType => {
      return {
        label: clusterImageSet.metadata.name,
        value: clusterImageSet.metadata.name, // TODO(mlibra): probably wrong but what is expected here?
        default: index === 0,
        supportLevel: 'beta', // TODO(mlibra): Map from label "channel"
      };
    },
  );

  const [clusterDeployments] = useK8sWatchResource<ClusterDeploymentK8sResource[]>({
    kind: ClusterDeploymentKind,
    namespace, // TODO(mlibra): Double check that we want validate cluster name for namespace-only (and not cluster-scope, mind prvileges)
    namespaced: true,
    isList: true,
  });
  const usedClusterNames = (clusterDeployments || []).map(
    (clusterDeployment): string =>
      `${clusterDeployment.metadata.name}.${clusterDeployment.spec?.baseDomain}`,
  );

  return (
    <ClusterDeploymentWizard
      className="cluster-deployment-wizard"
      onClusterCreate={onClusterCreate}
      onClose={onClose}
      defaultPullSecret={defaultPullSecret}
      ocpVersions={ocpVersions}
      usedClusterNames={usedClusterNames}
    />
  );
};

export default CreateClusterWizard;
