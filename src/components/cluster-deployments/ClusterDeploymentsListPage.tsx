import * as React from 'react';
import { Link } from 'react-router-dom';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Dropdown, DropdownProps, KebabToggle, DropdownItem } from '@patternfly/react-core';
import {
  useK8sWatchResource,
  k8sKill,
  ListPageHeader,
  ListPageBody,
  VirtualizedTable,
  TableColumn,
  RowProps,
  TableRow,
  TableData,
  ListPageCreate,
  history,
  useK8sModel,
} from '@openshift-console/dynamic-plugin-sdk/api';
import {
  AgentClusterInstallK8sResource,
  ClusterDeploymentK8sResource,
} from 'openshift-assisted-ui-lib/dist/src/cim';
import { AgentClusterInstallKind, ClusterDeploymentKind } from '../../kind';
import { canEditCluster } from './utils';
import { useTranslation } from 'react-i18next';

type ClusterDeploymentRowData = {
  clusterDeployment: ClusterDeploymentK8sResource;
  agentClusterInstall?: AgentClusterInstallK8sResource;
};

const ClusterDeploymentRow: React.FC<RowProps<ClusterDeploymentRowData>> = ({
  obj,
  index,
  style,
}) => {
  const { t } = useTranslation();

  const [isKebabOpen, setKebabOpen] = React.useState(false);
  const [clusterDeploymentModel] = useK8sModel(ClusterDeploymentKind);

  const { clusterDeployment, agentClusterInstall } = obj;
  const { uid = '', name, namespace } = clusterDeployment?.metadata || {};

  const kebabActions = [
    <DropdownItem
      key="edit"
      component="button"
      onClick={() => history.push(`/k8s/ns/${namespace}/${ClusterDeploymentKind}/${name}/edit`)}
      isDisabled={!canEditCluster(agentClusterInstall)}
    >
      {t('dynamic-cim~Edit')}
    </DropdownItem>,
    <DropdownItem
      key="delete"
      component="button"
      onClick={() => {
        // Do not ask, the user knows what is he doing
        k8sKill(clusterDeploymentModel, clusterDeployment);
      }}
    >
      {t('dynamic-cim~Delete')}
    </DropdownItem>,
  ];

  // eslint-disable-next-line
  const onSelect: DropdownProps['onSelect'] = () => {
    setKebabOpen(false);
  };

  return (
    <TableRow id={uid} index={index} trKey={uid} style={style}>
      <TableData>
        <Link to={`/k8s/ns/${namespace}/${ClusterDeploymentKind}/${name}`}>{name}</Link>
      </TableData>
      <TableData>-</TableData>
      <TableData>{agentClusterInstall?.spec?.imageSetRef?.name}</TableData>
      <TableData className="dropdown-kebab-pf pf-c-table__action">
        <Dropdown
          onSelect={onSelect}
          toggle={
            <KebabToggle onToggle={() => setKebabOpen(!isKebabOpen)} id={`kebab-toggle-${uid}`} />
          }
          isOpen={isKebabOpen}
          isPlain
          dropdownItems={kebabActions}
        />
      </TableData>
    </TableRow>
  );
};

const ClusterDeploymentsListPage: React.FC = () => {
  const { t } = useTranslation();
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

  const data = clusterDeployments
    .sort((cdA, cdB) => {
      let cmpr = cdA.metadata?.name?.localeCompare(cdB.metadata?.name || '');
      cmpr = cmpr === undefined ? -1 : cmpr;
      return cmpr;
    })
    .map((cd) => ({
      clusterDeployment: cd,
      agentClusterInstall: agentClusterInstalls.find(
        (aci) => aci.metadata?.name === cd.spec?.clusterInstallRef.name,
      ),
    }));

  const columns: TableColumn<K8sResourceCommon>[] = [
    {
      title: t('dynamic-cim~Name'),
    },
    {
      title: t('dynamic-cim~Status'),
    },
    {
      title: t('dynamic-cim~Distribution version'),
    },
    // plus actions
  ];

  return (
    <>
      <ListPageHeader title={t('dynamic-cim~Clusters')}>
        {<ListPageCreate groupVersionKind={ClusterDeploymentKind}>Create Cluster</ListPageCreate>}
      </ListPageHeader>
      <ListPageBody>
        <VirtualizedTable
          loaded={loaded && aciLoaded}
          loadError={error || aciError}
          data={data}
          // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
          // @ts-ignore
          Row={ClusterDeploymentRow}
          columns={columns}
        />
      </ListPageBody>
    </>
  );
};

export default ClusterDeploymentsListPage;
