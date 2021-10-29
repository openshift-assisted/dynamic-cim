import * as React from 'react';
import {
  useK8sWatchResource,
  ListPageHeader,
  ListPageBody,
  VirtualizedTable,
  TableColumn,
  RowProps,
  TableData,
  ListPageCreate,
  ResourceLink,
} from '@openshift-console/dynamic-plugin-sdk';
import { CIM } from 'openshift-assisted-ui-lib';
import { sortable } from '@patternfly/react-table';

import { InfraEnvKind } from '../../kind';

const columns: TableColumn<CIM.InfraEnvK8sResource>[] = [
  {
    title: 'Name',
    id: 'infra-envs-table-name',
    transforms: [sortable],
    sort: 'metadata.name',
  },
];

const InfraRow: React.FC<RowProps<CIM.InfraEnvK8sResource>> = ({ obj, activeColumnIDs }) => {
  return (
    <>
      <TableData id={columns[0].id} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          kind={InfraEnvKind}
          name={obj.metadata?.name}
          namespace={obj.metadata?.namespace}
        />
      </TableData>
    </>
  );
};

type InfraListPageProps = {
  namespace: string;
};

const InfraListPage: React.FC<InfraListPageProps> = ({ namespace }) => {
  const [infras, loaded, loadError] = useK8sWatchResource<CIM.InfraEnvK8sResource[]>({
    kind: InfraEnvKind,
    isList: true,
    namespace,
  });

  return (
    <>
      <ListPageHeader title="Infrastructures">
        <ListPageCreate
          groupVersionKind={InfraEnvKind}
          // namespace={namespace || 'assisted-installer'}
        >
          Create
        </ListPageCreate>
      </ListPageHeader>
      <ListPageBody>
        <VirtualizedTable
          loaded={loaded}
          loadError={loadError}
          data={infras}
          unfilteredData={infras /* So far we do not have filters */}
          Row={InfraRow}
          columns={columns}
        />
      </ListPageBody>
    </>
  );
};

export default InfraListPage;
