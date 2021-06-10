import * as React from 'react';
import { match as RMatch } from 'react-router-dom';
import { sortable, expandable } from '@patternfly/react-table';
import {
  DetailsPage,
  PageComponentProps,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk/api';
import { ClusterProgress, HostsTable, LoadingState } from 'openshift-assisted-ui-lib';
import { K8sResourceCommon, K8sResourceKindReference } from '@openshift-console/dynamic-plugin-sdk';
import {
  AgentClusterInstallK8sResource,
  AgentK8sResource,
  ClusterDeploymentK8sResource,
} from '../types';
import { AgentClusterInstallKind, AgentKind } from '../../kind';
import { getAICluster } from '../ai-utils';

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
        nameKey: 'Details',
        component: ClusterDetail,
      },
    ]}
  />
);

export default ClusterDeploymentDetails;

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
    <div className="co-m-pane__body">
      {/* <pre style={{ fontSize: 10 }}>{JSON.stringify(clusterDeployment, null, 2)}</pre>
      <pre style={{ fontSize: 10 }}>{JSON.stringify(agentClusterInstall, null, 2)}</pre>
      <pre style={{ fontSize: 10 }}>{JSON.stringify(agents.length, null, 2)}</pre>
      <pre style={{ fontSize: 10 }}>{JSON.stringify(agents, null, 2)}</pre> */}
      <ClusterProgress cluster={cluster} />
      <HostsTable
        hosts={cluster.hosts}
        EmptyState={() => <div>empty</div>}
        columns={columns}
      />
    </div>
  );
};
