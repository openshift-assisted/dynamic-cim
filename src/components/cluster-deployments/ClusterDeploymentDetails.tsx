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
import { AgentClusterInstallKind, AgentKind } from '../../kind';
import { getAICluster, getClusterValidatedCondition } from '../ai-utils';
import ValidatedConditionAlert from './ValidatedConditionAlert';

type DetailsTabProps = React.PropsWithChildren<PageComponentProps<ClusterDeploymentK8sResource>> & {
  agentClusterInstall: K8sResourceCommon;
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
                <Stack hasGutter>
                  <StackItem>
                    <ClusterProgress cluster={cluster} />
                  </StackItem>
                  <StackItem>
                    <HostsTable
                      hosts={cluster.hosts}
                      EmptyState={() => <div>empty</div>}
                      columns={columns}
                    />
                  </StackItem>
                </Stack>
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

const ClusterDeploymentDetails: React.FC<ClusterDeploymentDetailsProps> = (props) => (
  <DetailsPage
    {...props}
    menuActions={[]}
    pages={[
      {
        href: '',
        nameKey: 'Overview',
        component: ClusterDetail,
      },
    ]}
  />
);

export default ClusterDeploymentDetails;
