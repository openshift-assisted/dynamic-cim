import * as React from 'react';
import { match as RMatch } from 'react-router-dom';
import {
  DetailsPage,
  PageComponentProps,
  useK8sWatchResource,
  k8sGet,
  consoleFetchJSON,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { K8sModel } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { KebabOptionsCreatorProps } from '@openshift-console/dynamic-plugin-sdk/lib/extensions/console-types';
import { CIM } from 'openshift-assisted-ui-lib';
import { K8sResourceKindReference } from '@openshift-console/dynamic-plugin-sdk';
import {
  AgentClusterInstallKind,
  AgentKind,
  ClusterDeploymentKind,
  InfraEnvKind,
} from '../../kind';
import { canEditCluster } from './utils';
import { SecretModel } from '../../models/ocp';
import {
  AgentK8sResource,
  ClusterDeploymentK8sResource,
  SecretK8sResource,
} from 'openshift-assisted-ui-lib/dist/src/cim/types';

const { LoadingState, ClusterDeploymentDetails, getOnFetchEventsHandler } = CIM;

const backendUrl = '/api/kubernetes/';

const fetchEvents = (url: string) => consoleFetchJSON(`${backendUrl}${url}`);

type DetailsTabProps =
  React.PropsWithChildren<PageComponentProps /* Should be generic. The DetailsPage API is about to evolve in the SDK: <CIM.ClusterDeploymentK8sResource> */> & {
    agentClusterInstall: AgentK8sResource;
  };

const getClusterDeploymentActions =
  (agentClusterInstall?: CIM.AgentClusterInstallK8sResource): KebabOptionsCreatorProps =>
  (kindObj: K8sModel, clusterDeployment: ClusterDeploymentK8sResource) => {
    const { namespace, name } = clusterDeployment.metadata || {};
    return [
      {
        label: 'Edit',
        href: `/k8s/ns/${namespace}/${ClusterDeploymentKind}/${name}/edit`,
        isDisabled: !canEditCluster(agentClusterInstall),
      },
    ];
  };

const getInfraEnvLink = ({ name, namespace }) => (
  <ResourceLink kind={InfraEnvKind} name={name} namespace={namespace} />
);

export const ClusterDeploymentOverview = (props: DetailsTabProps) => {
  const { obj } = props;
  const clusterDeployment =
    obj as CIM.ClusterDeploymentK8sResource; /* That re-typying should not be needed with generic PageComponentProps */
  const [agentClusterInstall, agentClusterInstallLoaded, agentClusterInstallError] =
    useK8sWatchResource<CIM.AgentClusterInstallK8sResource>(
      clusterDeployment?.spec?.clusterInstallRef.name
        ? {
            kind: AgentClusterInstallKind,
            name: clusterDeployment?.spec?.clusterInstallRef.name,
            namespace: clusterDeployment?.metadata?.namespace,
            namespaced: true,
            isList: false,
          }
        : null,
    );

  const agentSelector = clusterDeployment.spec?.platform?.agentBareMetal?.agentSelector;
  const [agents, agentsLoaded, agentsError] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    agentSelector
      ? {
          kind: AgentKind,
          isList: true,
          selector: agentSelector,
          namespaced: true,
        }
      : null,
  );

  if (!clusterDeployment) return null;
  if (agentsError) throw new Error(agentsError);
  if (agentClusterInstallError) throw new Error(agentClusterInstallError);
  if (!(agentsLoaded && agentClusterInstallLoaded)) return <LoadingState />;

  const fetchSecret: React.ComponentProps<typeof ClusterDeploymentDetails>['fetchSecret'] = (
    name: string,
    namespace: string,
  ): Promise<SecretK8sResource> => k8sGet({ model: SecretModel, name, ns: namespace });

  const onFetchEvents = getOnFetchEventsHandler(
    fetchEvents,
    'open-cluster-management',
    agentClusterInstall,
  );

  return (
    <div className="co-dashboard-body">
      <ClusterDeploymentDetails
        clusterDeployment={clusterDeployment}
        agentClusterInstall={agentClusterInstall}
        agents={agents}
        getInfraEnvLink={getInfraEnvLink}
        fetchSecret={fetchSecret}
        agentTableClassName="agents-table"
        onFetchEvents={onFetchEvents}
      />
    </div>
  );
};

type ClusterDeploymentDetailsPageProps = {
  match: RMatch<{ name: string }>;
  kind: K8sResourceKindReference;
  name: string;
  namespace: string;
};

const ClusterDeploymentDetailsPage: React.FC<ClusterDeploymentDetailsPageProps> = (props) => {
  const [agentClusterInstall] = useK8sWatchResource<CIM.AgentClusterInstallK8sResource>({
    kind: AgentClusterInstallKind,
    name: props.name,
    namespace: props.namespace,
    namespaced: true,
    isList: false,
  });

  return (
    <DetailsPage
      {...props}
      menuActions={getClusterDeploymentActions(agentClusterInstall)}
      pages={[
        {
          href: '',
          nameKey: 'Overview',
          component: ClusterDeploymentOverview,
        },
      ]}
    />
  );
};

export default ClusterDeploymentDetailsPage;
