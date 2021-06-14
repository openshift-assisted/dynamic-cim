import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import {
  ClusterDeploymentWizard as AIClusterDeploymentWizard,
  ClusterDeploymentDetailsValues,
  Types,
} from 'openshift-assisted-ui-lib';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/api';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { ClusterDeploymentKind, ClusterImageSetKind } from '../../kind';
import { AgentClusterInstallK8sResource, ClusterDeploymentK8sResource } from '../types';
import { getAICluster } from '../ai-utils';
// import { ClusterDeploymentParams, getClusterDeployment, getPullSecretResource } from '../../k8s';

type ClusterDeploymentWizardProps = {
  history: RouteComponentProps['history'];
  namespace?: string;
  clusterDeployment?: ClusterDeploymentK8sResource;
  agentClusterInstall?: AgentClusterInstallK8sResource;
};
/* Not needed, we are passing AI Cluster object
const getWizardValues = (
  clusterDeployment?: ClusterDeploymentK8sResource,
  agentClusterInstall?: AgentClusterInstallK8sResource,
): ClusterDeploymentWizardValues|undefined => {
  if (!clusterDeployment) {
    return undefined;
  }
  return {
    name: clusterDeployment.metadata.name,
    highAvailabilityMode: 'Full', // TODO(mlibra)
    openshiftVersion: ;
    pullSecret: string;
    baseDnsDomain: string;
    SNODisclaimer: boolean;
    useRedHatDnsService: boolean;

  };
};
*/
const ClusterDeploymentWizard: React.FC<ClusterDeploymentWizardProps> = ({
  history,
  namespace,
  clusterDeployment,
  agentClusterInstall,
}) => {
  // const [clusterDeploymentModel] = useK8sModel(ClusterDeploymentKind);
  // const [secretModel] = useK8sModel('core~v1~Secret');

  const defaultPullSecret = ''; // Can be retrieved from c.rh.c . We can not query that here.

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
    namespace, // TODO(mlibra): Double check that we want to validate cluster name for namespace-only (and not cluster-scope, mind prvileges)
    namespaced: true,
    isList: true,
  });
  const usedClusterNames = (clusterDeployments || [])
    .filter((cd) => !clusterDeployment || clusterDeployment.metadata.uid !== cd.metadata.uid)
    .map((cd): string => `${cd.metadata.name}.${cd.spec?.baseDomain}`);
  /*
  const wizardValues: ClusterDeploymentWizardValues = React.useMemo(
    () => getWizardValues(clusterDeployments, agentClusterInstall) || getClusterDeploymentWizardEmptyValues(ocpVersions, defaultPullSecret),
    [clusterDeployments, agentClusterInstall, ocpVersions],
  );
  */

  // const onClusterCreate = async ({ pullSecret, ...params }: ClusterDeploymentParams & { pullSecret: string}) => {
  //   try {
  //     const { name } = params;
  //     const labels = undefined; // parseStringLabels(['foo=bar']); // TODO(mlibra): Required by backend but can be selected in a later step

  //     const secret = await k8sCreate(
  //       secretModel,
  //       getPullSecretResource({ namespace, name, pullSecret }),
  //     );
  //     const pullSecretName = secret?.metadata?.name;
  //     await k8sCreate(
  //       clusterDeploymentModel,
  //       getClusterDeployment({ namespace, labels, pullSecretName, ...params }),
  //     );

  //     // TODO(mlibra): InstallEnv should be patched for the ClusterDeployment reference
  //     // TODO(mlibra): create AgentClusterInstall
  //   } catch (e) {
  //     // A string-only is expected. or change ClusterDeploymentDetails in the assisted-ui-lib
  //     throw `Failed to cretate the ClusterDeployment resource: ${e.message}`;
  //   }
  // };

  // const onClusterSave = async (params: ClusterDeploymentWizardValues) => {
  //   console.log('--- onClusterSave: ', params);

  //   // TODO(mlibra): Decide about create vs. update
  //   await onClusterCreate(params);
  // };

  const onSaveDetails = React.useMemo(
    () => async (values: ClusterDeploymentDetailsValues) => {
      console.log('--- onSaveDetails, values: ', values);
    },
    [],
  );

  const onClose = () => {
    history.push(`/k8s/ns/${namespace || 'all-namespaces'}/${ClusterDeploymentKind}`);
  };

  const aiCluster = clusterDeployment
    ? getAICluster({ clusterDeployment, agentClusterInstall, pullSecretSet: true })
    : undefined;

  return (
    <AIClusterDeploymentWizard
      className="cluster-deployment-wizard"
      defaultPullSecret={defaultPullSecret}
      ocpVersions={ocpVersions}
      cluster={aiCluster}
      usedClusterNames={usedClusterNames}
      // onClusterSave={onClusterSave}
      onClose={onClose}
      onSaveDetails={onSaveDetails}
    />
  );
};

export default ClusterDeploymentWizard;
