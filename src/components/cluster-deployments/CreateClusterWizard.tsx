import * as React from 'react';
import { ClusterDeploymentWizard, Api, Types } from 'openshift-assisted-ui-lib';
import { useK8sModel, k8sCreate } from '@openshift-console/dynamic-plugin-sdk/api';
import { ClusterDeploymentKind } from '../../kind';
import { getClusterDeployment, getPullSecretResource, parseStringLabels } from '../../k8s';

const CreateClusterWizard: React.FC = () => {
  const [clusterDeploymentModel] = useK8sModel(ClusterDeploymentKind);
  const [secretModel] = useK8sModel('core~v1~Secret');

  const onClusterCreate = async (params: Api.ClusterCreateParams) => {
    console.log('--- TODO: create ClusterDeployment, params: ', params);
    try {
      const { baseDnsDomain: baseDomain, name, pullSecret } = params;
      const namespace = 'assisted-installer'; // TODO(mlibra)
      const labels = parseStringLabels(['foo=bar']); // TODO(mlibra)

      const secret = await k8sCreate(
        secretModel,
        getPullSecretResource({ namespace, name, pullSecret }),
      );
      const pullSecretName = secret?.metadata?.name;
      await k8sCreate(
        clusterDeploymentModel,
        getClusterDeployment({ namespace, pullSecretName, baseDomain, labels, name }),
      );
    } catch (e) {
      // A string-only is expected. or change ClusterDeploymentDetails in the assisted-ui-lib
      throw `Failed to cretate the ClusterDeployment resource: ${e.message}`;
    }
  };

  const pullSecret = ''; // TODO(mlibra): Query it. The user can overwrite it.
  const ocpVersions: Types.OpenshiftVersionOptionType[] = [
    // TODO(mlibra): query it
    {
      label: 'foo-4.8',
      value: 'bar-4.8',
      default: true,
      supportLevel: 'beta',
    },
  ];
  const usedClusterNames = ['mlibra-01.redhat.com']; // TODO(mlibra): query full cluster names (including baseDnsDomain)

  return (
    <ClusterDeploymentWizard
      onClusterCreate={onClusterCreate}
      pullSecret={pullSecret}
      ocpVersions={ocpVersions}
      usedClusterNames={usedClusterNames}
    />
  );
};

export default CreateClusterWizard;
