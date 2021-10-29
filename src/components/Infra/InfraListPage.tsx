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

const COL_NAME = 'infra-envs-table-name';
const COL_PROJECT = 'infra-envs-table-project';

const InfraRow: React.FC<RowProps<CIM.InfraEnvK8sResource> & { isNamespaced: boolean }> = ({
  obj,
  activeColumnIDs,
  isNamespaced,
}) => {
  return (
    <>
      <TableData id={COL_NAME} activeColumnIDs={activeColumnIDs}>
        <ResourceLink
          kind={InfraEnvKind}
          name={obj.metadata?.name}
          namespace={obj.metadata?.namespace}
        />
      </TableData>
      {!isNamespaced && (
        <TableData id={COL_PROJECT} activeColumnIDs={activeColumnIDs}>
          <ResourceLink kind="Project" name={obj.metadata?.namespace} />
        </TableData>
      )}
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

  const columns: TableColumn<CIM.InfraEnvK8sResource>[] = React.useMemo(() => {
    const cols = [
      {
        title: 'Name',
        id: COL_NAME,
        transforms: [sortable],
        sort: 'metadata.name',
      },
    ];
    if (!namespace) {
      cols.push({
        title: 'Project',
        id: COL_PROJECT,
        transforms: [sortable],
        sort: 'metadata.namespace',
      });
    }

    return cols;
  }, [namespace]);

  return (
    <>
      <ListPageHeader title="Infrastructures">
        <ListPageCreate groupVersionKind={InfraEnvKind}>Create</ListPageCreate>
      </ListPageHeader>
      <ListPageBody>
        <VirtualizedTable
          loaded={loaded}
          loadError={loadError}
          data={infras}
          unfilteredData={infras /* So far we do not have filters */}
          Row={(props) => <InfraRow isNamespaced={!!namespace} {...props} />}
          columns={columns}
        />
      </ListPageBody>
    </>
  );
};

export default InfraListPage;
