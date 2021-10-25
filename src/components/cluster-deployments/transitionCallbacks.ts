import { k8sCreate, k8sPatch, K8sKind } from '@openshift-console/dynamic-plugin-sdk/api';
import { CIM } from 'openshift-assisted-ui-lib';
import { RouteComponentProps } from 'react-router';
import { ClusterDeploymentKind } from '../../kind';
import { appendPatch, getPullSecretResource, getAgentClusterInstall } from '../../k8s';

const { getAnnotationsFromAgentSelector, getClusterDeploymentResource } = CIM;

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
      const annotations = undefined; // will be set later (Hosts Selection)

      const secret = await k8sCreate(
        secretModel,
        getPullSecretResource({ namespace, name, pullSecret }),
      );
      const pullSecretName = secret?.metadata?.name;
      const createdClusterDeployment = await k8sCreate(
        clusterDeploymentModel,
        getClusterDeploymentResource({ namespace, annotations, pullSecretName, ...params }),
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

type getOnSaveHostsSelectionParams = {
  clusterDeployment: CIM.ClusterDeploymentK8sResource;
  agentModel: K8sKind;
  clusterDeploymentModel: K8sKind;
  agents: CIM.AgentK8sResource[];
};

export const getOnSaveHostsSelection =
  ({
    clusterDeployment,
    clusterDeploymentModel,
    agentModel,
    agents,
  }: getOnSaveHostsSelectionParams) =>
  async (values: CIM.ClusterDeploymentHostsSelectionValues) => {
    try {
      const hostIds = values.autoSelectHosts ? values.autoSelectedHostIds : values.selectedHostIds;
      const name = clusterDeployment.metadata.name;
      const namespace = clusterDeployment.metadata.namespace;
      const releasedAgents = agents.filter(
        (a) =>
          !hostIds.includes(a.metadata.uid) &&
          a.spec?.clusterDeploymentName?.name === name &&
          a.spec?.clusterDeploymentName?.namespace === namespace,
      );

      await Promise.all(
        releasedAgents.map((agent) => {
          return k8sPatch(agentModel, agent, [
            {
              op: 'remove',
              path: '/spec/clusterDeploymentName',
            },
          ]);
        }),
      );

      const addAgents = agents.filter(
        (a) =>
          hostIds.includes(a.metadata.uid) &&
          (a.spec?.clusterDeploymentName?.name !== name ||
            a.spec?.clusterDeploymentName?.namespace !== namespace),
      );
      await Promise.all(
        addAgents.map((agent) => {
          return k8sPatch(agentModel, agent, [
            {
              op: agent.spec?.clusterDeploymentName ? 'replace' : 'add',
              path: '/spec/clusterDeploymentName',
              value: {
                name,
                namespace,
              },
            },
          ]);
        }),
      );

      if (clusterDeployment) {
        await k8sPatch(clusterDeploymentModel, clusterDeployment, [
          {
            op: clusterDeployment.metadata.annotations ? 'replace' : 'add',
            path: '/metadata/annotations',
            value: getAnnotationsFromAgentSelector(clusterDeployment, values),
          },
        ]);
      }
    } catch (e) {
      throw `Failed to patch resources: ${e.message}`;
    }
  };

type getOnCloseParams = {
  namespace: string;
  history: RouteComponentProps['history'];
  clusterDeployment: CIM.ClusterDeploymentK8sResource;
};

export const getOnClose =
  ({ namespace, history, clusterDeployment }: getOnCloseParams) =>
  async () => {
    const ns = namespace ? `ns/${namespace}` : 'all-namespaces';

    if (clusterDeployment?.metadata?.name) {
      // Details page
      history.push(`/k8s/${ns}/${ClusterDeploymentKind}/${clusterDeployment.metadata.name}`);
    } else {
      // List page
      history.push(`/k8s/${ns}/${ClusterDeploymentKind}`);
    }
  };
