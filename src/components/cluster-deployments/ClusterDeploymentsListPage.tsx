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

const columns: TableColumn<K8sResourceCommon>[] = [
  {
    title: 'Name',
  },
  {
    title: 'Status',
  },
  {
    title: 'Distribution version',
  },
  {
    title: 'Infrastructure provider',
  },
  {
    title: 'Labels',
  },
];

const ClusterDeploymentRow: React.FC<RowProps<K8sResourceCommon>> = ({ obj, index, style }) => (
  <TableRow id={obj.metadata.uid} index={index} trKey={obj.metadata.uid} style={style}>
    <TableData>
      <Link to={`/k8s/all-namespaces/clusters/${obj.metadata.name}`}>{obj.metadata.name}</Link>
    </TableData>
    <TableData>?</TableData>
    <TableData>?</TableData>
    <TableData>?</TableData>
    <TableData>?</TableData>
  </TableRow>
);

const ClusterDeploymentsListPage: React.FC = () => {
  const [clusterDeployments, cdLoaded, cdLoadError] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: 'hive.openshift.io~v1~ClusterDeployment',
    isList: true,
    namespaced: true,
  });

  const [agentClusterInstalls, aciLoaded, aciLoadError] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: 'extensions.hive.openshift.io~v1beta1~AgentClusterInstall',
    isList: true,
    namespaced: true,
  });

  console.log('clusterDeployments', clusterDeployments);
  console.log('agentClusterInstalls', agentClusterInstalls);

  return (
    <>
      <ListPageHeader title="Clusters" />
      <ListPageBody>
        <VirtualizedTable
          loaded={cdLoaded && aciLoaded}
          loadError={cdLoadError || aciLoadError}
          data={clusterDeployments}
          Row={ClusterDeploymentRow}
          columns={columns}
        />
      </ListPageBody>
    </>
  );
};

export default ClusterDeploymentsListPage;
