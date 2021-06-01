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
import { AgentClusterInstallKind, ClusterDeploymentKind } from '../../kind';
import { AgentClusterInstallK8sResource, ClusterDeploymentK8sResource } from '../types';

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
];

type ClusterDeploymentRowData = {
  clusterDeployment: ClusterDeploymentK8sResource;
  agentClusterInstall?: AgentClusterInstallK8sResource;
};

const ClusterDeploymentRow: React.FC<RowProps<ClusterDeploymentRowData>> = ({
  obj,
  index,
  style,
}) => {
  const { clusterDeployment, agentClusterInstall } = obj;
  const {
    metadata: { uid, name, namespace },
  } = clusterDeployment;
  return (
    <TableRow id={uid} index={index} trKey={uid} style={style}>
      <TableData>
        <Link to={`/k8s/ns/${namespace}/${ClusterDeploymentKind}/${name}`}>{name}</Link>
      </TableData>
      <TableData>-</TableData>
      <TableData>{agentClusterInstall?.spec?.imageSetRef?.name}</TableData>
    </TableRow>
  );
};

const ClusterDeploymentsListPage: React.FC = () => {
  const [clusterDeployments, loaded, error] = useK8sWatchResource<ClusterDeploymentK8sResource[]>({
    kind: ClusterDeploymentKind,
    isList: true,
    namespaced: true,
  });

  const [agentClusterInstalls, aciLoaded, aciError] = useK8sWatchResource<
    AgentClusterInstallK8sResource[]
  >({
    kind: AgentClusterInstallKind,
    isList: true,
    namespaced: true,
  });

  const data = clusterDeployments.map((cd) => ({
    clusterDeployment: cd,
    agentClusterInstall: agentClusterInstalls.find(
      (aci) => aci.metadata.name === cd.spec.clusterInstallRef.name,
    ),
  }));

  return (
    <>
      <ListPageHeader title="Clusters">
        <ListPageCreate groupVersionKind={ClusterDeploymentKind}>Create Cluster</ListPageCreate>
      </ListPageHeader>
      <ListPageBody>
        <VirtualizedTable
          loaded={loaded && aciLoaded}
          loadError={error || aciError}
          data={data}
          Row={ClusterDeploymentRow}
          columns={columns}
        />
      </ListPageBody>
    </>
  );
};

export default ClusterDeploymentsListPage;
