import * as React from 'react';
import { Link } from 'react-router-dom';
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
import { CIM } from 'openshift-assisted-ui-lib';

import { InfraEnvKind } from '../../kind';

const columns: TableColumn<CIM.InfraEnvK8sResource>[] = [
  {
    title: 'Name',
  },
];

const InfraRow: React.FC<RowProps<CIM.InfraEnvK8sResource>> = ({ obj, index, style }) => (
  <TableRow id={obj.metadata?.uid} index={index} trKey={obj.metadata?.uid || ''} style={style}>
    <TableData>
      <Link to={`/k8s/ns/${obj.metadata?.namespace}/${InfraEnvKind}/${obj.metadata?.name}`}>
        {obj.metadata?.name}
      </Link>
    </TableData>
  </TableRow>
);

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
          namespace={namespace || 'assisted-installer'}
        >
          Create
        </ListPageCreate>
      </ListPageHeader>
      <ListPageBody>
        <VirtualizedTable
          loaded={loaded}
          loadError={loadError}
          data={infras}
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          Row={InfraRow}
          columns={columns}
        />
      </ListPageBody>
    </>
  );
};

export default InfraListPage;
