import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import {
  ClusterDeploymentWizard as AIClusterDeploymentWizard,
  ClusterDeploymentDetailsValues,
  Types,
} from 'openshift-assisted-ui-lib';
import {
  useK8sWatchResource,
  k8sCreate,
  k8sPatch,
  useK8sModel,
} from '@openshift-console/dynamic-plugin-sdk/api';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { AgentClusterInstallKind, ClusterDeploymentKind, ClusterImageSetKind } from '../../kind';
import { AgentClusterInstallK8sResource, ClusterDeploymentK8sResource } from '../types';
import { getAICluster } from '../ai-utils';
import { appendPatch, getClusterDeployment, getPullSecretResource } from '../../k8s';
import { getAgentClusterInstall } from '../../k8s/agentClusterInstall';

type ClusterDeploymentWizardProps = {
  history: RouteComponentProps['history'];
  namespace?: string;
  clusterDeployment?: ClusterDeploymentK8sResource;
  agentClusterInstall?: AgentClusterInstallK8sResource;
};

const ClusterDeploymentWizard: React.FC<ClusterDeploymentWizardProps> = ({
  history,
  namespace,
  clusterDeployment: queriedClusterDeployment,
  agentClusterInstall: queriedAgentClusterInstall,
}) => {
  const [clusterDeploymentModel] = useK8sModel(ClusterDeploymentKind);
  const [agentClusterInstallModel] = useK8sModel(AgentClusterInstallKind);
  const [secretModel] = useK8sModel('core~v1~Secret');

  const [clusterDeployment, setClusterDeployment] =
    React.useState<ClusterDeploymentK8sResource>(queriedClusterDeployment);
  const [agentClusterInstall, setAgentClusterInstall] =
    React.useState<AgentClusterInstallK8sResource>(queriedAgentClusterInstall);

  React.useEffect(() => {
    if (clusterDeployment !== queriedClusterDeployment) {
      setClusterDeployment(queriedClusterDeployment);
    }
  }, [clusterDeployment, queriedClusterDeployment]);
  React.useEffect(() => {
    if (agentClusterInstall !== queriedAgentClusterInstall) {
      setAgentClusterInstall(queriedAgentClusterInstall);
    }
  }, [agentClusterInstall, queriedAgentClusterInstall]);

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

  const onClusterCreate = React.useCallback(
    async ({ pullSecret, openshiftVersion, ...params }: ClusterDeploymentDetailsValues) => {
      try {
        const { name } = params;
        const labels = undefined; // parseStringLabels(['foo=bar']); // TODO(mlibra): Required by backend but can be selected in a later step

        const secret = await k8sCreate(
          secretModel,
          getPullSecretResource({ namespace, name, pullSecret }),
        );
        const pullSecretName = secret?.metadata?.name;
        const createdClusterDeployment = await k8sCreate(
          clusterDeploymentModel,
          getClusterDeployment({ namespace, labels, pullSecretName, ...params }),
        );
        setClusterDeployment(createdClusterDeployment);

        const agentClusterInstall = await k8sCreate(
          agentClusterInstallModel,
          getAgentClusterInstall({
            name,
            clusterDeploymentRefName: createdClusterDeployment.metadata.name,
            namespace,
            ocpVersion: openshiftVersion,
            /* will be updated in a next step
            controlPlaneAgents: 3, 
            sshPublicKey: values.sshPublicKey,
            clusterNetworkCidr: '10.128.0.0/14',
            clusterNetworkHostPrefix: 23,
            serviceNetwork: '172.30.0.0/16',
            apiVip,
            ingressVip,
            */
          }),
        );
        setAgentClusterInstall(agentClusterInstall);

        // TODO(mlibra): InstallEnv should be patched for the ClusterDeployment reference
      } catch (e) {
        // A string-only is expected. Or change the ClusterDeploymentDetails in the assisted-ui-lib
        throw `Failed to cretate the ClusterDeployment or gentClusterInstall resource: ${e.message}`;
      }
    },
    [
      setClusterDeployment,
      setAgentClusterInstall,
      namespace,
      agentClusterInstallModel,
      secretModel,
      clusterDeploymentModel,
    ],
  );

  const onClusterDetailsUpdate = React.useCallback(
    async (values: ClusterDeploymentDetailsValues) => {
      // do we need to re-query the ClusterDeployment??
      try {
        const clusterDeploymentPatches = [];
        const agentClusterInstallPatches = [];

        // pullSecret, highAvailabilityMode, useRedHatDnsService can not be changed

        /* TODO(mlibra): Uncomment once we can update the ClusterDeployment resource
      Issue: Failed to patch the ClusterDeployment resource: admission webhook "clusterdeploymentvalidators.admission.hive.openshift.io" denied
      the request: Attempted to change ClusterDeployment.Spec which is immutable 
      except for CertificateBundles,ClusterMetadata,ControlPlaneConfig,Ingress,Installed,PreserveOnDelete,ClusterPoolRef,PowerState,HibernateAfter,InstallAttemptsLimit,MachineManagement fields.
      Unsupported change: ClusterName: (mlibra-05 => mlibra-07)

        appendPatch(clusterDeploymentPatches, '/spec/clusterName', values.name, clusterDeployment.spec?.clusterName);
        appendPatch(
          clusterDeploymentPatches,
          '/spec/baseDomain',
          values.baseDnsDomain,
          clusterDeployment.spec?.baseDomain,
        );
        */

        // TODO(mlibra): set values.openshiftVersion to agentClusterInstall?.spec?.imageSetRef?.name
        appendPatch(
          agentClusterInstallPatches,
          '/spec/imageSetRef/name',
          values.openshiftVersion,
          agentClusterInstall.spec.imageSetRef?.name,
        );

        if (clusterDeploymentPatches.length > 0) {
          await k8sPatch(clusterDeploymentModel, clusterDeployment, clusterDeploymentPatches);
        }
        if (agentClusterInstallPatches.length > 0) {
          await k8sPatch(agentClusterInstallModel, agentClusterInstall, agentClusterInstallPatches);
        }
      } catch (e) {
        throw `Failed to patch the ClusterDeployment or AgentClusterInstall resource: ${e.message}`;
      }
    },
    [agentClusterInstall, clusterDeployment, agentClusterInstallModel, clusterDeploymentModel],
  );

  const onSaveDetails = React.useCallback(
    async (values: ClusterDeploymentDetailsValues) => {
      if (clusterDeployment) {
        // we have already either queried (the Edit flow) or created it
        await onClusterDetailsUpdate(values);
      } else {
        await onClusterCreate(values);
      }
    },
    [onClusterCreate, onClusterDetailsUpdate, clusterDeployment],
  );

  const onClose = () => {
    const ns = namespace ? `ns/${namespace}` : 'all-namespaces';
    history.push(`/k8s/${ns}/${ClusterDeploymentKind}`);
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
      onClose={onClose}
      onSaveDetails={onSaveDetails}
    />
  );
};

export default ClusterDeploymentWizard;
