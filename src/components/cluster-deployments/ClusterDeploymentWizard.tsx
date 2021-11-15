import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { useK8sWatchResource, useK8sModel } from '@openshift-console/dynamic-plugin-sdk';
import { CIM } from 'openshift-assisted-ui-lib';
import { ClusterDeploymentK8sResource } from 'openshift-assisted-ui-lib/dist/src/cim/types';

import {
  AgentClusterInstallKind,
  AgentKind,
  ClusterDeploymentKind,
  ClusterImageSetKind,
} from '../../kind';
import { ModalDialogsContextProvider, useModalDialogsContext } from '../modals';
import EditHostModal from '../modals/EditHostModal';
import { onEditHostAction, onEditRoleAction } from '../Agent/actions';
import {
  getOnClose,
  getOnClusterCreate,
  getOnClusterDetailsUpdate,
  getOnSaveDetails,
  getOnSaveHostsSelection,
  getOnSaveNetworking,
} from './transitionCallbacks';

const {
  ClusterDeploymentWizard: AIClusterDeploymentWizard,
  LoadingState,
  ACM_ENABLED_FEATURES,
  FeatureGateContextProvider,
} = CIM;

type ClusterDeploymentWizardProps = {
  history: RouteComponentProps['history'];
  namespace: string;
  queriedClusterDeploymentName?: string;
};

const getUsedClusterNames = (
  current?: ClusterDeploymentK8sResource,
  clusterDeployments: ClusterDeploymentK8sResource[] = [],
): string[] =>
  clusterDeployments
    .filter((cd) => current?.metadata?.uid !== cd.metadata?.uid)
    .map((cd): string => `${cd.metadata?.name}.${cd.spec?.baseDomain}`);

const getAgentClusterInstallQuery = (namespace: string, clusterInstallRefName?: string) =>
  clusterInstallRefName
    ? {
        kind: AgentClusterInstallKind,
        name: clusterInstallRefName,
        namespace,
        namespaced: true,
        isList: false,
      }
    : null;

const getClusterDeploymentQuery = (namespace: string, clusterDeploymentName?: string) =>
  clusterDeploymentName
    ? {
        kind: ClusterDeploymentKind,
        name: clusterDeploymentName,
        namespace,
        namespaced: true,
        isList: false,
      }
    : null;

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
    useK8sWatchResource<CIM.ClusterDeploymentK8sResource>(
      getClusterDeploymentQuery(namespace, clusterDeploymentName),
    );

  // it is ok if missing
  const [agentClusterInstall, agentClusterInstallLoaded] =
    useK8sWatchResource<CIM.AgentClusterInstallK8sResource>(
      getAgentClusterInstallQuery(namespace, clusterDeployment?.spec?.clusterInstallRef?.name),
    );

  const [clusterImageSets, loading] = useK8sWatchResource<CIM.ClusterImageSetK8sResource[]>({
    kind: ClusterImageSetKind,
    namespaced: false,
    isList: true,
  });

  const [clusterDeployments] = useK8sWatchResource<CIM.ClusterDeploymentK8sResource[]>({
    kind: ClusterDeploymentKind,
    namespace, // TODO(mlibra): Double check that we want to validate cluster name for namespace-only (and not cluster-scope, mind prvileges)
    namespaced: true,
    isList: true,
  });
  const usedClusterNames = React.useMemo(
    () => getUsedClusterNames(clusterDeployment, clusterDeployments),
    [clusterDeployments, clusterDeployment],
  );
  const [agents, , agentsError] = useK8sWatchResource<CIM.AgentK8sResource[]>({
    kind: AgentKind,
    isList: true,
    namespaced: true,
  });

  const onClose = React.useMemo(
    () => getOnClose({ namespace, history, clusterDeployment }),
    [namespace, history, clusterDeployment],
  );

  const onClusterDetailsUpdate = React.useMemo(
    () =>
      getOnClusterDetailsUpdate({
        agentClusterInstall,
        clusterDeployment,
        clusterDeploymentModel,
        agentClusterInstallModel,
      }),
    [agentClusterInstall, clusterDeployment, clusterDeploymentModel, agentClusterInstallModel],
  );

  const onClusterCreate = React.useMemo(
    () =>
      getOnClusterCreate({
        secretModel,
        namespace,
        clusterDeploymentModel,
        setClusterDeploymentName,
        agentClusterInstallModel,
      }),
    [
      secretModel,
      namespace,
      clusterDeploymentModel,
      setClusterDeploymentName,
      agentClusterInstallModel,
    ],
  );
  const onSaveDetails = React.useMemo(
    () => getOnSaveDetails({ clusterDeploymentName, onClusterDetailsUpdate, onClusterCreate }),
    [clusterDeploymentName, onClusterDetailsUpdate, onClusterCreate],
  );

  const onSaveNetworking = React.useMemo(
    () => getOnSaveNetworking({ agentClusterInstall, agentClusterInstallModel }),
    [agentClusterInstall, agentClusterInstallModel],
  );

  const onSaveHostsSelection = React.useMemo(
    () =>
      getOnSaveHostsSelection({
        clusterDeployment,
        agentModel,
        clusterDeploymentModel,
        agents,
      }),
    [clusterDeployment, agents, agentModel, clusterDeploymentModel],
  );

  const hostActions = {
    onEditHost: onEditHostAction(editHostModal, agentModel),
    canEditHost: () => true,
    onEditRole: onEditRoleAction(agentModel),
    canEditRole: () => true,
    onDeleteHost: () => {
      console.log('TODO: implement onDeleteHost');
    },
    canDelete: () => false,
  };
  if (
    !loading ||
    (queriedClusterDeploymentName && !clusterDeployment) ||
    !agentClusterInstallLoaded
  ) {
    return <LoadingState />;
  }

  if (clusterDeploymentError || agentsError) {
    // TODO(mlibra): Render error state instead
    throw new Error(`Data retieval error: ${clusterDeploymentError || agentsError}`);
  }

  // Careful: do not let the <AIClusterDeploymentWizard /> to be unmounted since it holds current step in its state
  return (
    <>
      <AIClusterDeploymentWizard
        className="cluster-deployment-wizard agent-table"
        clusterImages={clusterImageSets}
        clusterDeployment={clusterDeployment}
        agentClusterInstall={agentClusterInstall}
        hostActions={hostActions}
        usedClusterNames={usedClusterNames}
        agents={agents}
        onClose={onClose}
        onSaveDetails={onSaveDetails}
        onSaveNetworking={onSaveNetworking}
        onSaveHostsSelection={onSaveHostsSelection}
        onFinish={() => {
          console.log('TODO');
        }}
      />
      <EditHostModal />
    </>
  );
};

export default (props: ClusterDeploymentWizardProps) => (
  <FeatureGateContextProvider features={ACM_ENABLED_FEATURES}>
    <ModalDialogsContextProvider>
      <ClusterDeploymentWizard {...props} />
    </ModalDialogsContextProvider>
  </FeatureGateContextProvider>
);
