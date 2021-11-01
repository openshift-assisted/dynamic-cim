import * as React from 'react';
import {
  useK8sWatchResource,
  ListPageHeader,
  ListPageBody,
  VirtualizedTable,
  RowProps,
  TableData,
  ListPageCreate,
  ResourceLink,
  useActiveColumns,
} from '@openshift-console/dynamic-plugin-sdk';
import { CIM } from 'openshift-assisted-ui-lib';
import { sortable } from '@patternfly/react-table';

import { AgentKind, InfraEnvKind } from '../../kind';
import InlineStatusGroup from './InlineStatusGroup';

const { AGENT_LOCATION_LABEL_KEY, getAgentStatus } = CIM;

const COL_NAME = 'infra-envs-table-name';
const COL_PROJECT = 'namespace';
const COL_LOCATION = 'infra-envs-table-location';
const COL_AGENTS = 'infra-envs-table-hosts';

const InfraRow: React.FC<RowProps<CIM.InfraEnvK8sResource>> = ({ obj, activeColumnIDs }) => {
  const agentSelector = obj.status?.agentLabelSelector?.matchLabels;
  const [infraAgents] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    agentSelector
      ? {
          kind: AgentKind,
          isList: true,
          selector: agentSelector,
        }
      : null,
  );
  const errorAgents = infraAgents.filter((a) => getAgentStatus(a)[0] === 'error');
  const warningAgents = infraAgents.filter((a) => getAgentStatus(a)[0] === 'insufficient');

  return (
    <>
      <TableData id={COL_NAME} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          kind={InfraEnvKind}
          name={obj.metadata?.name}
          namespace={obj.metadata?.namespace}
        />
      </TableData>
      <TableData id={COL_PROJECT} activeColumnIDs={activeColumnIDs}>
        <ResourceLink kind="Project" name={obj.metadata?.namespace} />
      </TableData>
      <TableData id={COL_LOCATION} activeColumnIDs={activeColumnIDs}>
        {obj.metadata?.labels[AGENT_LOCATION_LABEL_KEY] || 'N/A'}
      </TableData>
      <TableData id={COL_AGENTS} activeColumnIDs={activeColumnIDs}>
        {infraAgents.length ? (
          <InlineStatusGroup
            healthy={infraAgents.length - errorAgents.length - warningAgents.length}
            danger={errorAgents.length}
            warning={warningAgents.length}
          />
        ) : (
          0
        )}
      </TableData>
    </>
  );
};
const columns = [
  {
    title: 'Name',
    id: COL_NAME,
    transforms: [sortable],
    sort: 'metadata.name',
  },
  {
    title: 'Project X',
    id: COL_PROJECT,
    transforms: [sortable],
    sort: 'metadata.namespace',
  },
  {
    title: 'Location',
    id: COL_LOCATION,
    transforms: [sortable],
    sort: `metadata.labels['${AGENT_LOCATION_LABEL_KEY}']`,
  },
  {
    title: 'Hosts',
    id: COL_AGENTS,
    transforms: [],
    sort: '',
  },
];

type InfraListPageProps = {
  namespace: string;
};

const InfraListPage: React.FC<InfraListPageProps> = ({ namespace }) => {
  const [infras, loaded, loadError] = useK8sWatchResource<CIM.InfraEnvK8sResource[]>({
    kind: InfraEnvKind,
    isList: true,
    namespace,
  });
  const [activeColumns, userSettingsLoaded] = useActiveColumns({
    columns,
    showNamespaceOverride: false, // TODO(mlibra): remove once GH openshift/console/pull/10368 gets merged
    columnManagementID: '', // TODO(mlibra): remove once GH openshift/console/pull/10368 gets merged
  });
  return (
    <>
      <ListPageHeader title="Infrastructures">
        <ListPageCreate groupVersionKind={InfraEnvKind}>Create</ListPageCreate>
      </ListPageHeader>
      <ListPageBody>
        {userSettingsLoaded && (
          <VirtualizedTable
            loaded={loaded}
            loadError={loadError}
            data={infras}
            unfilteredData={infras /* So far we do not have filters */}
            Row={InfraRow}
            columns={activeColumns}
          />
        )}
      </ListPageBody>
    </>
  );
};

export default InfraListPage;
