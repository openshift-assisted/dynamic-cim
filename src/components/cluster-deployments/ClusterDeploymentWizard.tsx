import * as React from 'react';
import _ from 'lodash';
import { RouteComponentProps } from 'react-router';
import { useK8sWatchResource, useK8sModel } from '@openshift-console/dynamic-plugin-sdk/api';
import {
  MatchExpression,
  Selector,
} from '@openshift-console/dynamic-plugin-sdk/lib/extensions/console-types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { CIM } from 'openshift-assisted-ui-lib';
import {
  AgentClusterInstallKind,
  AgentKind,
  ClusterDeploymentKind,
  ClusterImageSetKind,
} from '../../kind';
import { ModalDialogsContextProvider, useModalDialogsContext } from '../modals';
import EditHostModal from '../modals/EditHostModal';
import { onEditHostAction, onEditRoleAction } from '../Agent/actions';
import { getAgentLocationMatchExpression } from './utils';
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
  parseStringLabels,
  labelsToArray,
  getLocationsFormMatchExpressions,
  AGENT_LOCATION_LABEL_KEY,
  RESERVED_AGENT_LABEL_KEY,
  AGENT_NOLOCATION_VALUE,
} = CIM;

type ClusterDeploymentWizardProps = {
  history: RouteComponentProps['history'];
  namespace: string;
  queriedClusterDeploymentName?: string;
};

const getUsedClusterNames = (
  current?: CIM.ClusterDeploymentK8sResource,
  clusterDeployments: CIM.ClusterDeploymentK8sResource[] = [],
): string[] =>
  clusterDeployments
    .filter((cd) => current?.metadata?.uid !== cd.metadata.uid)
    .map((cd): string => `${cd.metadata.name}.${cd.spec?.baseDomain}`);

const getUsedAgentLabels = (agents: CIM.AgentK8sResource[] = []): string[] =>
  _.uniq(_.flatten(agents.map((agent) => Object.keys(agent.metadata.labels || {}))));

const getAgentLocations = (agents: CIM.AgentK8sResource[] = []): CIM.AgentLocation[] => {
  const agentLocationsTemp = {};
  agents.forEach((agent) => {
    const loc = agent.metadata?.labels?.[AGENT_LOCATION_LABEL_KEY] || AGENT_NOLOCATION_VALUE;

    agentLocationsTemp[loc] = agentLocationsTemp[loc] || {
      itemCount: 0,
      // additional stats come here
    };
    agentLocationsTemp[loc].itemCount++;
  });
  const agentLocations: CIM.AgentLocation[] = Object.keys(agentLocationsTemp).map(
    (loc): CIM.AgentLocation => ({
      value: loc,
      displayName: loc === AGENT_NOLOCATION_VALUE ? 'No location' : loc,
      ...agentLocationsTemp[loc],
    }),
  );

  return agentLocations;
};

const getMatchingAgentsQueries = (agentSelector?: CIM.AgentSelectorChageProps) => [
  // Assumption: The user is requested to enter at least one location before query can start
  agentSelector?.locations?.length
    ? {
        kind: AgentKind,
        isList: true,
        selector: {
          matchLabels: parseStringLabels(agentSelector?.labels || []),
          matchExpressions: getAgentLocationMatchExpression(agentSelector.locations),
        },
        namespaced: true,
      }
    : undefined,
  agentSelector?.locations?.includes(AGENT_NOLOCATION_VALUE)
    ? {
        kind: AgentKind,
        isList: true,
        selector: {
          matchLabels: parseStringLabels(agentSelector?.labels || []),
          matchExpressions: [
            {
              key: AGENT_LOCATION_LABEL_KEY,
              operator: 'DoesNotExist',
              // values: [] as string[],
            },
          ] as MatchExpression[],
        },
        namespaced: true,
      }
    : undefined,
];

const getStoredAgentsQuery = (storedAgentSelector?: Selector) =>
  storedAgentSelector
    ? {
        kind: AgentKind,
        isList: true,
        selector: storedAgentSelector,
        namespaced: true,
      }
    : undefined;

const getAgentClusterInstallQuery = (namespace: string, clusterInstallRefName?: string) =>
  clusterInstallRefName
    ? {
        kind: AgentClusterInstallKind,
        name: clusterInstallRefName,
        namespace,
        namespaced: true,
        isList: false,
      }
    : undefined;

const getClusterDeploymentQuery = (namespace: string, clusterDeploymentName?: string) =>
  clusterDeploymentName
    ? {
        kind: ClusterDeploymentKind,
        name: clusterDeploymentName,
        namespace,
        namespaced: true,
        isList: false,
      }
    : undefined;

const getReservedAgentsQuery = (namespace: string, clusterDeploymentUID?: string) =>
  clusterDeploymentUID
    ? {
        kind: AgentKind,
        isList: true,
        selector: {
          matchLabels: {
            [RESERVED_AGENT_LABEL_KEY]: clusterDeploymentUID,
          },
        },
        namespaced: true,
      }
    : undefined;

const ClusterDeploymentWizard: React.FC<ClusterDeploymentWizardProps> = ({
  history,
  namespace,
  queriedClusterDeploymentName,
}) => {
  const [clusterDeploymentModel] = useK8sModel(ClusterDeploymentKind);
  const [agentClusterInstallModel] = useK8sModel(AgentClusterInstallKind);
  const [agentModel] = useK8sModel(AgentKind);
  const [secretModel] = useK8sModel('core~v1~Secret');

  // TODO(mlibra): set it empty to stop watching resources when not needed (i.e. when transitioning??)
  // Unsaved labels entered by the user on the Hosts Selection step
  const [agentSelector, setAgentSelector] = React.useState<CIM.AgentSelectorChageProps>();

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
  const [agentClusterInstall] = useK8sWatchResource<CIM.AgentClusterInstallK8sResource>(
    getAgentClusterInstallQuery(namespace, clusterDeployment?.spec?.clusterInstallRef?.name),
  );

  const defaultPullSecret = ''; // Can be retrieved from c.rh.c . We can not query that here.

  const [clusterImageSets, loading] = useK8sWatchResource<K8sResourceCommon[]>({
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

  const storedAgentSelector = clusterDeployment?.spec?.platform?.agentBareMetal?.agentSelector;
  const [agents, , agentsError] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    getStoredAgentsQuery(storedAgentSelector),
  );

  // Initialize the first read of matchingAgents
  React.useEffect(() => {
    if (storedAgentSelector) {
      const filteredLabels = { ...(storedAgentSelector.matchLabels || {}) };
      delete filteredLabels[RESERVED_AGENT_LABEL_KEY];
      setAgentSelector({
        labels: labelsToArray(filteredLabels),
        locations: getLocationsFormMatchExpressions(storedAgentSelector.matchExpressions),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedAgentSelector]);

  // So far for agent-selector autosuggestion only. Quite an expensive operation considering how little info we need...
  const [allAgents, , allAgentsError] = useK8sWatchResource<CIM.AgentK8sResource[]>({
    kind: AgentKind,
    isList: true,
    // TODO(mlibra): Do we want an all-namespaces query for admins instead??
    namespaced: true,
    namespace,
  });
  // const usedAgentlabels: string[] = React.useMemo(() => getUsedAgentLabels(allAgents), [allAgents]);
  const agentLocations = React.useMemo(() => getAgentLocations(allAgents), [allAgents]);

  const matchingAgentsQueries = getMatchingAgentsQueries(agentSelector);
  const [matchingAgentsOfAllClustersLocSet] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    matchingAgentsQueries[0],
  );
  const [matchingAgentsOfAllClustersNoLocSet] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    matchingAgentsQueries[1],
  );
  const matchingAgentsOfAllClusters = [
    // workaround to missing "OR" operator in the k8s matchExpressions
    ...(matchingAgentsOfAllClustersLocSet || []),
    ...(matchingAgentsOfAllClustersNoLocSet || []),
  ];

  // Use only those which are not reserved for anoother cluster.
  // Use agents of all statuses - filtering will be done later (i.e. for Ready-only status).
  //
  // TODO(mlibra): Following requires late-binding. Recently every agent is assigned to a cluster,
  // so breaking the concept of having a pool of __unassigned__ Agents to pick-up by the Cluster Creator.
  const matchingAgents = matchingAgentsOfAllClusters.filter(
    (agent: CIM.AgentK8sResource) =>
      !agent.spec?.clusterDeploymentName ||
      (agent.spec.clusterDeploymentName.name === clusterDeploymentName &&
        agent.spec.clusterDeploymentName.namespace === namespace),
  );
  console.log(
    '--- matchingAgents: ',
    matchingAgents,
    ', matchingAgentsOfAllClusters: ',
    matchingAgentsOfAllClusters,
    ', 2 queries: ',
    getMatchingAgentsQueries(agentSelector),
  );

  // Assuption: A location is mandatory and labels are use to just narrow the search.
  // If that is not met, gather usedAgentlabels from allAgents instead of matchingAgents
  const usedAgentlabels: string[] = React.useMemo(
    () => getUsedAgentLabels(matchingAgents),
    [matchingAgents],
  );

  // Since we keep maintaining the RESERVED_AGENT_LABEL_KEY, we can filter on it. Otherwise we would need to filter on agent.spec.clusterDeploymentName
  const [reservedAgents] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    getReservedAgentsQuery(namespace, clusterDeployment?.metadata?.uid),
  );
  const selectedHostIds: string[] = reservedAgents?.map((agent) => agent.metadata.uid) || [];

  const onAgentSelectorChange = React.useCallback(
    (props: CIM.AgentSelectorChageProps) => setAgentSelector(props),
    [setAgentSelector],
  );

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
        oldReservedAgents: reservedAgents,
        agentModel,
        matchingAgents,
      }),
    [clusterDeployment, reservedAgents, agentModel, matchingAgents],
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
  if (!loading || (queriedClusterDeploymentName && !clusterDeployment)) {
    return <LoadingState />;
  }

  if (clusterDeploymentError || agentsError || allAgentsError) {
    // TODO(mlibra): Render error state instead
    throw new Error(agentsError);
  }

  // Careful: do not let the <AIClusterDeploymentWizard /> to be unmounted since it holds current step in its state
  return (
    <>
      <AIClusterDeploymentWizard
        className="cluster-deployment-wizard agent-table"
        defaultPullSecret={defaultPullSecret}
        clusterImages={clusterImageSets}
        clusterDeployment={clusterDeployment}
        agentClusterInstall={agentClusterInstall}
        agents={agents}
        hostActions={hostActions}
        selectedHostIds={selectedHostIds}
        pullSecretSet
        usedClusterNames={usedClusterNames}
        usedAgentLabels={usedAgentlabels}
        agentLocations={agentLocations}
        matchingAgents={matchingAgents}
        onAgentSelectorChange={onAgentSelectorChange}
        // allAgentsCount={allAgents?.length || 0}
        onClose={onClose}
        onSaveDetails={onSaveDetails}
        onSaveNetworking={onSaveNetworking}
        onSaveHostsSelection={onSaveHostsSelection}
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
