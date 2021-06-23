import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import {
  ClusterDeploymentWizard as AIClusterDeploymentWizard,
  ClusterDeploymentDetailsValues,
  ClusterDeploymentNetworkingValues,
  Types,
  LoadingState,
} from 'openshift-assisted-ui-lib';
import {
  useK8sWatchResource,
  k8sCreate,
  k8sPatch,
  useK8sModel,
} from '@openshift-console/dynamic-plugin-sdk/api';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  AgentClusterInstallKind,
  AgentKind,
  ClusterDeploymentKind,
  ClusterImageSetKind,
} from '../../kind';
import {
  AgentClusterInstallK8sResource,
  AgentK8sResource,
  ClusterDeploymentK8sResource,
} from '../types';
import { ModalDialogsContextProvider, useModalDialogsContext } from '../modals';
import EditHostModal from '../modals/EditHostModal';
import { getAICluster } from '../ai-utils';
import { appendPatch, getClusterDeployment, getPullSecretResource } from '../../k8s';
import { getAgentClusterInstall } from '../../k8s/agentClusterInstall';
import { onEditHostAction } from '../Agent/actions';

type ClusterDeploymentWizardProps = {
  history: RouteComponentProps['history'];
  namespace?: string;
  queriedClusterDeploymentName?: string;
};

const ClusterDeploymentWizard: React.FC<ClusterDeploymentWizardProps> = ({
  history,
  namespace,
  queriedClusterDeploymentName,
}) => {
  const [clusterDeploymentModel] = useK8sModel(ClusterDeploymentKind);
  const [agentClusterInstallModel] = useK8sModel(AgentClusterInstallKind);
  const [agentModel] = useK8sModel(AgentKind);
  const [secretModel] = useK8sModel('core~v1~Secret');

  const { editHostModal } = useModalDialogsContext();
  const [clusterDeploymentName, setClusterDeploymentName] = React.useState<string>();
  React.useEffect(
    () => setClusterDeploymentName(queriedClusterDeploymentName),
    [queriedClusterDeploymentName],
  );

  const [clusterDeployment, , clusterDeploymentError] =
    useK8sWatchResource<ClusterDeploymentK8sResource>(
      clusterDeploymentName
        ? {
            kind: ClusterDeploymentKind,
            name: clusterDeploymentName,
            namespace,
            namespaced: true,
            isList: false,
          }
        : undefined,
    );

  // it is ok if missing
  const clusterInstallRefName = clusterDeployment?.spec?.clusterInstallRef?.name;
  const [agentClusterInstall] = useK8sWatchResource<AgentClusterInstallK8sResource>(
    clusterInstallRefName
      ? {
          kind: AgentClusterInstallKind,
          name: clusterInstallRefName,
          namespace,
          namespaced: true,
          isList: false,
        }
      : undefined,
  );

  const defaultPullSecret = ''; // Can be retrieved from c.rh.c . We can not query that here.

  const [clusterImageSets] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: ClusterImageSetKind,
    namespaced: false,
    isList: true,
  });
  const ocpVersions = React.useMemo(
    () =>
      (clusterImageSets || []).map((clusterImageSet, index): Types.OpenshiftVersionOptionType => {
        return {
          label: clusterImageSet.metadata.name,
          value: clusterImageSet.metadata.name, // TODO(mlibra): probably wrong but what is expected here?
          default: index === 0,
          supportLevel: 'beta', // TODO(mlibra): Map from label "channel"
        };
      }),
    [clusterImageSets],
  );

  const [clusterDeployments] = useK8sWatchResource<ClusterDeploymentK8sResource[]>({
    kind: ClusterDeploymentKind,
    namespace, // TODO(mlibra): Double check that we want to validate cluster name for namespace-only (and not cluster-scope, mind prvileges)
    namespaced: true,
    isList: true,
  });
  const usedClusterNames = React.useMemo(
    () =>
      (clusterDeployments || [])
        .filter((cd) => clusterDeployment?.metadata?.uid !== cd.metadata.uid)
        .map((cd): string => `${cd.metadata.name}.${cd.spec?.baseDomain}`),
    [clusterDeployments, clusterDeployment],
  );

  const agentSelector = clusterDeployment?.spec?.platform?.agentBareMetal?.agentSelector;
  const [agents, , agentsError] = useK8sWatchResource<AgentK8sResource[]>(
    agentSelector
      ? {
          kind: AgentKind,
          isList: true,
          selector: agentSelector,
          namespaced: true,
        }
      : undefined,
  );

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

        // keep watching the newly created resource from now on
        setClusterDeploymentName(createdClusterDeployment.metadata.name);

        await k8sCreate(
          agentClusterInstallModel,
          getAgentClusterInstall({
            name,
            clusterDeploymentRefName: createdClusterDeployment.metadata.name,
            namespace,
            ocpVersion: openshiftVersion,
          }),
        );

        // TODO(mlibra): InstallEnv should be patched for the ClusterDeployment reference
      } catch (e) {
        // A string-only is expected. Or change the ClusterDeploymentDetails in the assisted-ui-lib
        throw `Failed to cretate the ClusterDeployment or gentClusterInstall resource: ${e.message}`;
      }
    },
    [namespace, agentClusterInstallModel, secretModel, clusterDeploymentModel],
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
      if (clusterDeploymentName) {
        // we have already either queried (the Edit flow) or created it
        await onClusterDetailsUpdate(values);
      } else {
        await onClusterCreate(values);
      }
    },
    [onClusterCreate, onClusterDetailsUpdate, clusterDeploymentName],
  );

  const onSaveNetworking = React.useCallback(
    async (values: ClusterDeploymentNetworkingValues) => {
      try {
        const agentClusterInstallPatches = [];

        appendPatch(
          agentClusterInstallPatches,
          '/spec/sshPublicKey',
          values.sshPublicKey,
          agentClusterInstall.spec.sshPublicKey,
        );

        appendPatch(
          agentClusterInstallPatches,
          '/spec/networking/clusterNetwork',
          [
            {
              cidr: values.clusterNetworkCidr,
              hostPrefix: values.clusterNetworkHostPrefix,
            },
          ],
          agentClusterInstall.spec?.networking?.clusterNetwork,
        );

        appendPatch(
          agentClusterInstallPatches,
          '/spec/networking/serviceNetwork',
          [values.serviceNetworkCidr],
          agentClusterInstall.spec?.networking?.serviceNetwork,
        );

        appendPatch(
          agentClusterInstallPatches,
          '/spec/apiVIP',
          values.apiVip,
          agentClusterInstall.spec?.apiVIP,
        );

        appendPatch(
          agentClusterInstallPatches,
          '/spec/ingressVIP',
          values.ingressVip,
          agentClusterInstall.spec?.ingressVIP,
        );

        if (agentClusterInstallPatches.length > 0) {
          await k8sPatch(agentClusterInstallModel, agentClusterInstall, agentClusterInstallPatches);
        }
      } catch (e) {
        throw `Failed to patch the AgentClusterInstall resource: ${e.message}`;
      }
    },
    [agentClusterInstall, agentClusterInstallModel],
  );

  const onClose = () => {
    const ns = namespace ? `ns/${namespace}` : 'all-namespaces';
    history.push(`/k8s/${ns}/${ClusterDeploymentKind}`);
  };

  if (queriedClusterDeploymentName && !clusterDeployment) {
    return <LoadingState />;
  }

  if (clusterDeploymentError || agentsError) {
    // TODO(mlibra): Render error state
    throw new Error(agentsError);
  }

  const aiCluster = clusterDeployment
    ? getAICluster({ clusterDeployment, agentClusterInstall, pullSecretSet: true, agents })
    : undefined;

  // Careful: do not let the <AIClusterDeploymentWizard /> to be unmounted since it holds current step in its state
  return (
    <>
      <AIClusterDeploymentWizard
        className="cluster-deployment-wizard"
        defaultPullSecret={defaultPullSecret}
        ocpVersions={ocpVersions}
        cluster={aiCluster}
        usedClusterNames={usedClusterNames}
        onClose={onClose}
        onSaveDetails={onSaveDetails}
        onSaveNetworking={onSaveNetworking}
        onEditHost={onEditHostAction(editHostModal, agentModel, agents)}
        canEditHost={() => true}
      />
      <EditHostModal />
    </>
  );
};

export default (props: ClusterDeploymentWizardProps) => (
  <ModalDialogsContextProvider>
    <ClusterDeploymentWizard {...props} />
  </ModalDialogsContextProvider>
);
