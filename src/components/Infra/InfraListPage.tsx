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
} from '@openshift-console/dynamic-plugin-sdk/api';
import { Link } from 'react-router-dom';

import '../styles.scss';

const columns: TableColumn<K8sResourceCommon>[] = [
  {
    title: 'Name',
  },
];

const InfraRow: React.FC<RowProps<K8sResourceCommon>> = ({ obj, index, style }) => (
  <TableRow id={obj.metadata.uid} index={index} trKey={obj.metadata.uid} style={style}>
    <TableData>
      <Link to="/k8s/cim/foo">{obj.metadata.name}</Link>
    </TableData>
  </TableRow>
);

const InfraListPage: React.FC = () => {
  const [infras, loaded, loadError] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: 'agent-install.openshift.io~v1beta1~InfraEnv',
    isList: true,
    namespaced: true,
  });

  return (
    <>
      <ListPageHeader title="CIM Infras"></ListPageHeader>
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
