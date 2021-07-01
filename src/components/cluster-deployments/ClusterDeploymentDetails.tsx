import * as React from 'react';
import { match as RMatch } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { sortable, expandable } from '@patternfly/react-table';
import {
  DetailsPage,
  K8sKind,
  KebabOptionsCreator,
  PageComponentProps,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk/api';
import {
  ClusterProgress,
  HostsTable,
  LoadingState,
  ClusterPropertiesList,
} from 'openshift-assisted-ui-lib';
import { K8sResourceCommon, K8sResourceKindReference } from '@openshift-console/dynamic-plugin-sdk';
import {
  AgentClusterInstallK8sResource,
  AgentK8sResource,
  ClusterDeploymentK8sResource,
} from '../types';
import { AgentClusterInstallKind, AgentKind, ClusterDeploymentKind } from '../../kind';
import { getAICluster, getClusterValidatedCondition } from '../ai-utils';
import ValidatedConditionAlert from './ValidatedConditionAlert';
import { canEditCluster } from './utils';

type DetailsTabProps = React.PropsWithChildren<PageComponentProps<ClusterDeploymentK8sResource>> & {
  agentClusterInstall: K8sResourceCommon;
};

const getClusterDeploymentActions =
  (agentClusterInstall?: AgentClusterInstallK8sResource): KebabOptionsCreator =>
  (kindObj: K8sKind, clusterDeployment: K8sResourceCommon) => {
    const { namespace, name } = clusterDeployment.metadata;
    return [
      {
        label: 'Edit',
        href: `/k8s/ns/${namespace}/${ClusterDeploymentKind}/${name}/edit`,
        isDisabled: !canEditCluster(agentClusterInstall),
      },
    ];
  };

const columns = [
  { title: 'Hostname', transforms: [sortable], cellFormatters: [expandable] },
  { title: 'Role', transforms: [sortable] },
  { title: 'Status', transforms: [sortable] },
  { title: 'Discovered At', transforms: [sortable] },
  { title: 'CPU Cores', transforms: [sortable] }, // cores per machine (sockets x cores)
  { title: 'Memory', transforms: [sortable] },
  { title: 'Disk', transforms: [sortable] },
  { title: '' },
];

export const ClusterDetail = (props: DetailsTabProps) => {
  const { obj: clusterDeployment } = props;
  const [progressCardExpanded, setProgressCardExpanded] = React.useState(true);
  const [inventoryCardExpanded, setInventoryCardExpanded] = React.useState(true);
  const [detailsCardExpanded, setDetailsCardExpanded] = React.useState(true);

  const [agentClusterInstall, agentClusterInstallLoaded, agentClusterInstallError] =
    useK8sWatchResource<AgentClusterInstallK8sResource>({
      kind: AgentClusterInstallKind,
      name: clusterDeployment.spec.clusterInstallRef.name,
      namespace: clusterDeployment.metadata.namespace,
      namespaced: true,
      isList: false,
    });

  const agentSelector = clusterDeployment.spec?.platform?.agentBareMetal?.agentSelector;
  const [agents, agentsLoaded, agentsError] = useK8sWatchResource<AgentK8sResource[]>(
    agentSelector
      ? {
          kind: AgentKind,
          isList: true,
          selector: agentSelector,
          namespaced: true,
        }
      : undefined,
  );

  if (agentsError) throw new Error(agentsError);
  if (agentClusterInstallError) throw new Error(agentClusterInstallError);
  if (!(agentsLoaded && agentClusterInstallLoaded)) return <LoadingState />;

  const cluster = getAICluster({ clusterDeployment, agentClusterInstall, agents });
  return (
    <div className="co-dashboard-body">
      {/* <pre style={{ fontSize: 10 }}>{JSON.stringify(clusterDeployment, null, 2)}</pre>
      <pre style={{ fontSize: 10 }}>{JSON.stringify(agentClusterInstall, null, 2)}</pre>
      <pre style={{ fontSize: 10 }}>{JSON.stringify(agents, null, 2)}</pre> */}
      <Stack hasGutter>
        {[
          'preparing-for-installation',
          'installing',
          'installing-pending-user-action',
          'finalizing',
          'installed',
          'error',
          'cancelled',
        ].includes(cluster.status) && (
          <StackItem>
            <Card id="cluster-installation-progress-card" isExpanded={progressCardExpanded}>
              <CardHeader
                onExpand={() => setProgressCardExpanded(!progressCardExpanded)}
                toggleButtonProps={{
                  id: 'progress-card-toggle-button',
                  'aria-label': 'Cluster installation process',
                  'aria-labelledby': 'titleId progress-card-toggle-button',
                  'aria-expanded': progressCardExpanded,
                }}
              >
                <CardTitle id="titleId">Cluster installation process</CardTitle>
              </CardHeader>
              <CardExpandableContent>
                <CardBody>
                  <ClusterProgress cluster={cluster} />
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>
        )}
        <StackItem>
          <Card id="cluster-inventory-card" isExpanded={inventoryCardExpanded}>
            <CardHeader
              onExpand={() => setInventoryCardExpanded(!inventoryCardExpanded)}
              toggleButtonProps={{
                id: 'inventory-card-toggle-button',
                'aria-label': 'Hosts inventory',
                'aria-labelledby': 'titleId inventory-card-toggle-button',
                'aria-expanded': inventoryCardExpanded,
              }}
            >
              <CardTitle id="titleId">Hosts inventory</CardTitle>
            </CardHeader>
            <CardExpandableContent>
              <CardBody>
                <HostsTable
                  hosts={cluster.hosts}
                  EmptyState={() => <div>empty</div>}
                  columns={columns}
                  className="agents-table"
                />
              </CardBody>
            </CardExpandableContent>
          </Card>
        </StackItem>
        <StackItem>
          <Card id="cluster-details-card" isExpanded={detailsCardExpanded}>
            <CardHeader
              onExpand={() => setDetailsCardExpanded(!detailsCardExpanded)}
              toggleButtonProps={{
                id: 'details-card-toggle-button',
                'aria-label': 'Details',
                'aria-labelledby': 'titleId details-card-toggle-button',
                'aria-expanded': detailsCardExpanded,
              }}
            >
              <CardTitle id="titleId">Details</CardTitle>
            </CardHeader>
            <CardExpandableContent>
              <CardBody>
                {console.log('status.webConsoleUrl', clusterDeployment.status?.webConsoleUrl)}
                <ClusterPropertiesList
                  name={clusterDeployment.metadata.name}
                  id={clusterDeployment.metadata.uid}
                  openshiftVersion={agentClusterInstall.spec.imageSetRef.name}
                  baseDnsDomain={clusterDeployment.spec.baseDomain}
                  apiVip={agentClusterInstall?.spec?.apiVIP}
                  ingressVip={agentClusterInstall?.spec?.ingressVIP}
                  clusterNetworkCidr={agentClusterInstall.spec?.networking.clusterNetwork[0].cidr}
                  clusterNetworkHostPrefix={
                    agentClusterInstall.spec?.networking.clusterNetwork[0].hostPrefix
                  }
                  serviceNetworkCidr={agentClusterInstall.spec?.networking.serviceNetwork[0]}
                  installedTimestamp={clusterDeployment.status?.installedTimestamp}
                />
              </CardBody>
            </CardExpandableContent>
          </Card>
        </StackItem>
        <StackItem>
          <ValidatedConditionAlert condition={getClusterValidatedCondition(agentClusterInstall)} />
        </StackItem>
      </Stack>
    </div>
  );
};

type ClusterDeploymentDetailsProps = {
  match: RMatch<{ name: string }>;
  kind: K8sResourceKindReference;
  name: string;
  namespace: string;
};

const ClusterDeploymentDetails: React.FC<ClusterDeploymentDetailsProps> = (props) => {
  const [agentClusterInstall] = useK8sWatchResource<AgentClusterInstallK8sResource>({
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
          component: ClusterDetail,
        },
      ]}
    />
  );
};

export default ClusterDeploymentDetails;
