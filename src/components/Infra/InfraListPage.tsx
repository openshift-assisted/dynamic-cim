import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
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

const columns: TableColumn<K8sResourceCommon>[] = [
  {
    title: 'Name',
  },
];

const InfraRow: React.FC<RowProps<K8sResourceCommon>> = ({ obj, index, style }) => (
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

  const [infras, loaded, loadError] = useK8sWatchResource<K8sResourceCommon[]>({
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
