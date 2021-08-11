import * as React from 'react';
import _ from 'lodash';
import { RouteComponentProps } from 'react-router';
import { CIM } from 'openshift-assisted-ui-lib';
import {
  useK8sWatchResource,
  k8sCreate,
  k8sPatch,
  useK8sModel,
} from '@openshift-console/dynamic-plugin-sdk/api';
import { MatchExpression } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/console-types';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import {
  AgentClusterInstallKind,
  AgentKind,
  ClusterDeploymentKind,
  ClusterImageSetKind,
} from '../../kind';
import { ModalDialogsContextProvider, useModalDialogsContext } from '../modals';
import EditHostModal from '../modals/EditHostModal';
import { appendPatch, getClusterDeployment, getPullSecretResource } from '../../k8s';
import { getAgentClusterInstall } from '../../k8s/agentClusterInstall';
import { onEditHostAction, onEditRoleAction } from '../Agent/actions';

const {
  ClusterDeploymentWizard: AIClusterDeploymentWizard,
  LoadingState,
  parseStringLabels,
  labelsToArray,
  AGENT_LOCATION_LABEL_KEY,
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
    const loc = agent.metadata?.labels?.[AGENT_LOCATION_LABEL_KEY];
    if (loc) {
      agentLocationsTemp[loc] = agentLocationsTemp[loc] || {
        itemCount: 0,
        // additional stats come here
      };
      agentLocationsTemp[loc].itemCount++;
    }
  });
  const agentLocations: CIM.AgentLocation[] = Object.keys(agentLocationsTemp).map((loc) => ({
    value: loc,
    ...agentLocationsTemp[loc],
  }));

  return agentLocations;
};

const getAgentLocationMatchExpression = (locations?: string[]): MatchExpression[] => {
  // TODO(mlibra): Implement 'Unspecified' location matching all Agents without location-label set.
  // However, that will probably not be possible with matchExpressions (we need join the expressions with OR).
  return locations?.length
    ? [
        {
          key: AGENT_LOCATION_LABEL_KEY,
          operator: 'In',
          values: locations,
        },
      ]
    : undefined;
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

  // TODO(mlibra): set it empty to stop watching resources when not needed (i.e. when transitioning??)
  // Unsaved labels entered by the user on the Hosts Selection step
  const [masterAgentSelector, setMasterAgentSelector] =
    React.useState<CIM.AgentSelectorChageProps>();
  const [workerAgentSelector, setWorkerAgentSelector] =
    React.useState<CIM.AgentSelectorChageProps>();

  const { editHostModal } = useModalDialogsContext();
  const [clusterDeploymentName, setClusterDeploymentName] = React.useState<string>();
  React.useEffect(
    () => setClusterDeploymentName(queriedClusterDeploymentName),
    [queriedClusterDeploymentName],
  );

  const [clusterDeployment, , clusterDeploymentError] =
    useK8sWatchResource<CIM.ClusterDeploymentK8sResource>(
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
  const [agentClusterInstall] = useK8sWatchResource<CIM.AgentClusterInstallK8sResource>(
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

  React.useEffect(() => {
    if (clusterDeployment?.spec?.platform?.agentBareMetal?.agentSelector) {
      setMasterAgentSelector({
        labels: labelsToArray(clusterDeployment?.spec?.platform?.agentBareMetal?.agentSelector),
        locations: undefined, // TODO(mlibra): read from matchExpressions of the "agentSelector"
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    /* Just once to intialize */
    // eslint-disable-next-line react-hooks/exhaustive-deps
    !!clusterDeployment?.spec?.platform?.agentBareMetal?.agentSelector,
  ]);
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

  const agentSelector = clusterDeployment?.spec?.platform?.agentBareMetal?.agentSelector;
  const [agents, , agentsError] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    agentSelector
      ? {
          kind: AgentKind,
          isList: true,
          selector: agentSelector,
          namespaced: true,
        }
      : undefined,
  );

  // So far for agent-selector autosuggestion. Quite an expensive operation.
  const [allAgents, , allAgentsError] = useK8sWatchResource<CIM.AgentK8sResource[]>({
    kind: AgentKind,
    isList: true,
    // TODO(mlibra): Do we want an all-namespaces query for admins instead??
    namespaced: true,
    namespace,
  });
  const usedAgentlabels: string[] = React.useMemo(() => getUsedAgentLabels(allAgents), [allAgents]);
  const agentLocations = React.useMemo(() => getAgentLocations(allAgents), [allAgents]);

  // That can be calculated from the allAgents but this is easier and safer
  const [matchingMasterAgents] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    masterAgentSelector?.labels
      ? {
          kind: AgentKind,
          isList: true,
          selector: {
            matchLabels: parseStringLabels(masterAgentSelector.labels),
            matchExpressions: getAgentLocationMatchExpression(masterAgentSelector.locations),
          },
          namespaced: true,
        }
      : undefined,
  );
  // matchingMastersCount === undefined is valid value
  const matchingMastersCount = matchingMasterAgents?.length;

  const [matchingWorkersAgents] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    workerAgentSelector?.labels
      ? {
          kind: AgentKind,
          isList: true,
          selector: {
            matchLabels: parseStringLabels(workerAgentSelector.labels),
            matchExpressions: getAgentLocationMatchExpression(workerAgentSelector.locations),
          },
          namespaced: true,
        }
      : undefined,
  );
  // matchingWorkersCount === undefined is a valid value
  const matchingWorkersCount = matchingWorkersAgents?.length;

  const onMasterAgentSelectorChange = React.useCallback(
    (props: CIM.AgentSelectorChageProps) => setMasterAgentSelector(props),
    [setMasterAgentSelector],
  );

  const onWorkerAgentSelectorChange = React.useCallback(
    (props: CIM.AgentSelectorChageProps) => setWorkerAgentSelector(props),
    [setWorkerAgentSelector],
  );

  const onClusterCreate = React.useCallback(
    async ({ pullSecret, openshiftVersion, ...params }: CIM.ClusterDeploymentDetailsValues) => {
      try {
        const { name } = params;
        const labels = undefined; // will be set later (Hosts Selection)

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
    async (values: CIM.ClusterDeploymentDetailsValues) => {
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
          agentClusterInstall.spec?.imageSetRef?.name,
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
    async (values: CIM.ClusterDeploymentDetailsValues) => {
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
    async (values: CIM.ClusterDeploymentNetworkingValues) => {
      try {
        const agentClusterInstallPatches = [];

        appendPatch(
          agentClusterInstallPatches,
          '/spec/sshPublicKey',
          values.sshPublicKey,
          agentClusterInstall.spec?.sshPublicKey,
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

        // Setting Machine network CIDR is forbidden when cluster is not in vip-dhcp-allocation mode (which is not soppurted ATM anyway)
        if (values.vipDhcpAllocation) {
          const hostSubnet = values.hostSubnet?.split(' ')?.[0];
          const machineNetworkValue = hostSubnet ? [{ cidr: hostSubnet }] : [];
          appendPatch(
            agentClusterInstallPatches,
            '/spec/networking/machineNetwork',
            machineNetworkValue,
            agentClusterInstall.spec?.networking?.machineNetwork,
          );
        }

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

  const onSaveHostsSelection = React.useCallback(
    async (values: CIM.ClusterDeploymentHostsSelectionValues) => {
      try {
        console.log('--- onSaveHostsSelection, values: ', values);

        const clusterDeploymentPatches = [];

        // TODO(mlibra) To save:
        // - agentSelector (labels + locations)
        // - useMastersAsWorkers
        // - workerLabels
        //   - clusterDeployment.spec?.platform?.agentBareMetal?.agentSelector?.matchLabels must be specific
        // - autoSelectMasters - can be calculated based on presence of workerLabels
        // - locations - use set-based matchExpressions in agentSelectors??
        const masterLabels = parseStringLabels(values.masterLabels);

        // https://v1-18.docs.kubernetes.io/docs/concepts/overview/working-with-objects/labels/#resources-that-support-set-based-requirements
        const matchExpressions = getAgentLocationMatchExpression(values.locations);

        console.log(
          '--- onSaveHostsSelection, /spec/platform/agentBareMetal/agentSelector/matchLabels: ',
          masterLabels,
          ', matchExpressions: ',
          matchExpressions,
        );

        /* TODO(mlibra): This will not work, requires late binding
             https://issues.redhat.com/browse/MGMT-4968
        appendPatch(
          clusterDeploymentPatches,
          '/spec/platform/agentBareMetal/agentSelector/matchLabels',
          masterLabels,
          clusterDeployment.spec?.platform?.agentBareMetal?.agentSelector?.matchLabels,
        );
        // TODO: save matchExpressions as well
        */

        if (clusterDeploymentPatches.length > 0) {
          await k8sPatch(clusterDeploymentModel, clusterDeployment, clusterDeploymentPatches);
        }
      } catch (e) {
        throw `Failed to patch the AgentClusterInstall resource: ${e.message}`;
      }
    },
    [clusterDeployment, clusterDeploymentModel],
  );

  const onClose = () => {
    const ns = namespace ? `ns/${namespace}` : 'all-namespaces';
    // List page
    // history.push(`/k8s/${ns}/${ClusterDeploymentKind}`);

    // Details page
    history.push(`/k8s/${ns}/${ClusterDeploymentKind}/${clusterDeployment.metadata?.name}`);
  };

  /* The ocpVersions is needed for initialValues of the Details step.
     In case of the Edit flow (when queriedClusterDeploymentName is set), let's calculate initialValues just once.
   */
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
        pullSecretSet
        usedClusterNames={usedClusterNames}
        usedAgentLabels={usedAgentlabels}
        agentLocations={agentLocations}
        matchingMastersCount={matchingMastersCount}
        onMasterAgentSelectorChange={onMasterAgentSelectorChange}
        matchingWorkersCount={matchingWorkersCount}
        onWorkerAgentSelectorChange={onWorkerAgentSelectorChange}
        allAgentsCount={allAgents?.length || 0}
        onClose={onClose}
        onSaveDetails={onSaveDetails}
        onSaveNetworking={onSaveNetworking}
        onSaveHostsSelection={onSaveHostsSelection}
        onEditHost={onEditHostAction(editHostModal, agentModel)}
        onEditRole={onEditRoleAction(agentModel)}
        canEditHost={() => true}
        canEditRole={() => true}
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
