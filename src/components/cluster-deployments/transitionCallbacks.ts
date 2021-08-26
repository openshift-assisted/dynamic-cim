import { k8sCreate, k8sPatch, K8sKind } from '@openshift-console/dynamic-plugin-sdk/api';
import { CIM } from 'openshift-assisted-ui-lib';
import { RouteComponentProps } from 'react-router';
import { ClusterDeploymentKind } from '../../kind';
import {
  appendPatch,
  getClusterDeployment,
  getPullSecretResource,
  getAgentClusterInstall,
} from '../../k8s';
import { getAgentLocationMatchExpression } from './utils';

const { RESERVED_AGENT_LABEL_KEY, parseStringLabels } = CIM;

type getOnClusterCreateParams = {
  secretModel: K8sKind;
  clusterDeploymentModel: K8sKind;
  agentClusterInstallModel: K8sKind;
  namespace: string;
  setClusterDeploymentName: (name: string) => void;
};
export const getOnClusterCreate =
  ({
    secretModel,
    namespace,
    clusterDeploymentModel,
    setClusterDeploymentName,
    agentClusterInstallModel,
  }: getOnClusterCreateParams) =>
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
      throw `Failed to cretate the ClusterDeployment or agentClusterInstall resource: ${e.message}`;
    }
  };

// [namespace, agentClusterInstallModel, secretModel, clusterDeploymentModel],

type getOnClusterDetailsUpdateParams = {
  agentClusterInstall: CIM.AgentClusterInstallK8sResource;
  clusterDeployment: CIM.ClusterDeploymentK8sResource;
  clusterDeploymentModel: K8sKind;
  agentClusterInstallModel: K8sKind;
};

export const getOnClusterDetailsUpdate =
  ({
    agentClusterInstall,
    clusterDeployment,
    clusterDeploymentModel,
    agentClusterInstallModel,
  }: getOnClusterDetailsUpdateParams) =>
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
  };
//  [agentClusterInstall, clusterDeployment, agentClusterInstallModel, clusterDeploymentModel],

type getOnSaveDetailsParams = {
  clusterDeploymentName?: string;
  onClusterDetailsUpdate: (values: CIM.ClusterDeploymentDetailsValues) => Promise<void>;
  onClusterCreate: (values: CIM.ClusterDeploymentDetailsValues) => Promise<void>;
};

export const getOnSaveDetails =
  ({ clusterDeploymentName, onClusterDetailsUpdate, onClusterCreate }: getOnSaveDetailsParams) =>
  async (values: CIM.ClusterDeploymentDetailsValues) => {
    if (clusterDeploymentName) {
      // we have already either queried (the Edit flow) or created it
      await onClusterDetailsUpdate(values);
    } else {
      await onClusterCreate(values);
    }
  };
//  [onClusterCreate, onClusterDetailsUpdate, clusterDeploymentName],

type getOnSaveNetworkingParams = {
  agentClusterInstall: CIM.AgentClusterInstallK8sResource;
  agentClusterInstallModel: K8sKind;
};

export const getOnSaveNetworking =
  ({ agentClusterInstall, agentClusterInstallModel }: getOnSaveNetworkingParams) =>
  async (values: CIM.ClusterDeploymentNetworkingValues) => {
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
  };
//  [agentClusterInstall, agentClusterInstallModel],

type getOnSaveHostsSelectionParams = {
  clusterDeployment: CIM.ClusterDeploymentK8sResource;
  agentModel: K8sKind;
  matchingAgents: CIM.AgentK8sResource[];
  oldReservedAgents: CIM.AgentK8sResource;
};

export const getOnSaveHostsSelection =
  ({
    clusterDeployment,
    agentModel,
    matchingAgents,
    oldReservedAgents,
  }: getOnSaveHostsSelectionParams) =>
  async (values: CIM.ClusterDeploymentHostsSelectionValues) => {
    try {
      console.log('--- onSaveHostsSelection, values: ', values);

      const clusterDeploymentPatches = [];

      // TODO(mlibra) To save:
      // - agentSelector (labels + locations)
      // - useMastersAsWorkers
      // - locations - use set-based matchExpressions in agentSelectors??
      const agentLabels = parseStringLabels(values.agentLabels);

      // https://v1-18.docs.kubernetes.io/docs/concepts/overview/working-with-objects/labels/#resources-that-support-set-based-requirements
      const matchExpressions = getAgentLocationMatchExpression(values.locations);

      const reservedAgentlabelValue = clusterDeployment.metadata.uid;

      // remove RESERVED_AGENT_LABEL_KEY from de-selected ones
      const releasedAgents = oldReservedAgents.filter(
        // agent was either deselected or not visible in the latest user's matchingLabel selection
        (agent) =>
          !values.selectedHostIds.includes(agent.metadata.uid) ||
          !matchingAgents.find(
            (matchingAgent: CIM.AgentK8sResource) =>
              matchingAgent.metadata.uid === agent.metadata.uid,
          ),
      );
      const releaseResults = await Promise.all(
        releasedAgents.map((agent) => {
          const newLabels = { ...agent.metadata.labels };
          delete newLabels[RESERVED_AGENT_LABEL_KEY];
          return k8sPatch(agentModel, agent, [
            {
              op: 'replace',
              path: `/metadata/labels`,
              value: newLabels,
            },
            {
              op: 'replace',
              path: '/spec/clusterDeploymentName',
              value: {}, // means: delete
            },
          ]);
        }),
      );

      // add RESERVED_AGENT_LABEL_KEY to the newly selected agents
      const newAgentIds = values.selectedHostIds.filter(
        (agentId) => !oldReservedAgents.find((agent) => agent.metadata.uid === agentId),
      );
      const reservedResults = await Promise.all(
        newAgentIds
          .map((agentId) =>
            matchingAgents.find((agent: CIM.AgentK8sResource) => agent.metadata.uid === agentId),
          )
          // why filter()? The user can change labels after making a host-selection and than continue. Take selection of just those "visible ones".
          .filter(Boolean)
          .map((agent) => {
            const newLabels = { ...(agent.metadata.labels || {}) };
            newLabels[RESERVED_AGENT_LABEL_KEY] = reservedAgentlabelValue;
            return k8sPatch(agentModel, agent, [
              {
                op: agent.metadata.labels ? 'replace' : 'add',
                path: '/metadata/labels',
                value: newLabels,
              },
              {
                op: agent.spec?.clusterDeploymentName ? 'replace' : 'add',
                path: '/spec/clusterDeploymentName',
                value: {
                  name: clusterDeployment.metadata.name,
                  namespace: clusterDeployment.metadata.namespace,
                },
              },
            ]);
          }),
      );

      // include in the agentSelector of CD
      agentLabels[RESERVED_AGENT_LABEL_KEY] = reservedAgentlabelValue;

      // TODO(mlibra): check for errors in the releasedResults and reservedResults
      console.log('--- releaseResults (TODO): ', releaseResults);
      console.log('--- reservedResults (TODO): ', reservedResults);

      appendPatch(
        clusterDeploymentPatches,
        '/spec/platform/agentBareMetal/agentSelector/matchLabels',
        agentLabels,
        clusterDeployment.spec?.platform?.agentBareMetal?.agentSelector?.matchLabels,
      );
      if (matchExpressions?.length) {
        appendPatch(
          clusterDeploymentPatches,
          '/spec/platform/agentBareMetal/agentSelector/matchExpressions',
          matchExpressions,
          clusterDeployment.spec?.platform?.agentBareMetal?.agentSelector?.matchExpressions,
        );
      }
      console.log(
        '--- Following patches were skipped due to missing late binding: ',
        clusterDeploymentPatches,
      );
      /* TODO(mlibra): This will not work, requires late binding
           https://issues.redhat.com/browse/MGMT-4968
      if (clusterDeploymentPatches.length > 0) {
        await k8sPatch(clusterDeploymentModel, clusterDeployment, clusterDeploymentPatches);
      }
      */
    } catch (e) {
      throw `Failed to patch the AgentClusterInstall resource: ${e.message}`;
    }
  };
//  [clusterDeployment, clusterDeploymentModel],

type getOnCloseParams = {
  namespace: string;
  history: RouteComponentProps['history'];
  clusterDeployment: CIM.ClusterDeploymentK8sResource;
};

export const getOnClose =
  ({ namespace, history, clusterDeployment }: getOnCloseParams) =>
  async () => {
    const ns = namespace ? `ns/${namespace}` : 'all-namespaces';
    // List page
    // history.push(`/k8s/${ns}/${ClusterDeploymentKind}`);

    // Details page
    history.push(`/k8s/${ns}/${ClusterDeploymentKind}/${clusterDeployment.metadata.name}`);
  };
