import * as React from 'react';
import {
  useK8sWatchResource,
  ListPageHeader,
  ListPageBody,
  VirtualizedTable,
  TableColumn, 
  RowProps,
  TableRow, 
  TableData,
  ListPageCreate,
} from '@openshift-console/dynamic-plugin-sdk/api';
import { Link } from 'react-router-dom';

import { InfraEnvKind } from '../../kind';
import { InfraEnv } from '../types';

const columns: TableColumn<InfraEnv>[] = [
  {
    title: 'Name',
  },
];

const InfraRow: React.FC<RowProps<InfraEnv>> = ({ obj, index, style }) => (
  <TableRow id={obj.metadata.uid} index={index} trKey={obj.metadata.uid} style={style}>
    <TableData>
      <Link to={`/k8s/ns/${obj.metadata.namespace}/${InfraEnvKind}/${obj.metadata.name}`}>
        {obj.metadata.name}
      </Link>
    </TableData>
  </TableRow>
);

type InfraListPageProps = {
  namespace: string;
}

const InfraListPage: React.FC<InfraListPageProps> = ({ namespace }) => {

  const [infras, loaded, loadError] = useK8sWatchResource<InfraEnv[]>({
    kind: InfraEnvKind,
    isList: true,
    namespace,
  });

  return (
    <>
      <ListPageHeader title="Infrastructures">
        <ListPageCreate groupVersionKind={InfraEnvKind} namespace={namespace || "assisted-installer"}>
          Create
        </ListPageCreate>
      </ListPageHeader>
      <ListPageBody>
        <VirtualizedTable
          loaded={loaded}
          loadError={loadError}
          data={infras}
          Row={InfraRow}
          columns={columns}
        />
      </ListPageBody>
    </>
  );
};

export default InfraListPage;
