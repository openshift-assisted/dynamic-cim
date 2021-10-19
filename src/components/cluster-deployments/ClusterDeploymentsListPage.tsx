import * as React from 'react';
import { Link, useHistory } from 'react-router-dom';
import { Dropdown, DropdownProps, KebabToggle, DropdownItem } from '@patternfly/react-core';
import {
  useK8sWatchResource,
  ListPageHeader,
  ListPageBody,
  VirtualizedTable,
  TableColumn,
  RowProps,
  TableData,
  ListPageCreate,
  k8sDelete,
  useK8sModel,
} from '@openshift-console/dynamic-plugin-sdk';
import { CIM } from 'openshift-assisted-ui-lib';
import { useTranslation } from 'react-i18next';
import { sortable } from '@patternfly/react-table';

import { AgentClusterInstallKind, ClusterDeploymentKind } from '../../kind';
import { canEditCluster } from './utils';

type ClusterDeploymentRowData = {
  clusterDeployment: CIM.ClusterDeploymentK8sResource;
  agentClusterInstall?: CIM.AgentClusterInstallK8sResource;
};

const COL_NAME = 'cluster-deployments-table-name';
const COL_STATUS = 'cluster-deployments-table-status';
const COL_DISTRIB_VER = 'cluster-deployments-table-distribution-version';
const COL_ACTIONS = ''; // keep blank to force visibility

const ClusterDeploymentRow: React.FC<RowProps<ClusterDeploymentRowData>> = ({
  obj,
  activeColumnIDs,
}) => {
  const { t } = useTranslation();
  const history = useHistory(); // TODO(mlibra): Can we take this from the dynamic SDK?

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
        k8sDelete({
          model: clusterDeploymentModel,
          resource: clusterDeployment,
          requestInit: {},
          json: {},
        });
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
    <>
      <TableData id={COL_NAME} activeColumnIDs={activeColumnIDs}>
        <Link to={`/k8s/ns/${namespace}/${ClusterDeploymentKind}/${name}`}>{name}</Link>
      </TableData>
      <TableData id={COL_STATUS} activeColumnIDs={activeColumnIDs}>
        -
      </TableData>
      <TableData id={COL_DISTRIB_VER} activeColumnIDs={activeColumnIDs}>
        {agentClusterInstall?.spec?.imageSetRef?.name}
      </TableData>
      <TableData
        id={COL_ACTIONS}
        activeColumnIDs={activeColumnIDs}
        className="dropdown-kebab-pf pf-c-table__action"
      >
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
    </>
  );
};

const ClusterDeploymentsListPage: React.FC = () => {
  const { t } = useTranslation();
  const [clusterDeployments, loaded, error] = useK8sWatchResource<
    CIM.ClusterDeploymentK8sResource[]
  >({
    kind: ClusterDeploymentKind,
    isList: true,
    namespaced: true,
  });

  const [agentClusterInstalls, aciLoaded, aciError] = useK8sWatchResource<
    CIM.AgentClusterInstallK8sResource[]
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

  const columns: TableColumn<ClusterDeploymentRowData>[] = [
    {
      title: t('dynamic-cim~Name'),
      id: COL_NAME,
      transforms: [sortable],
      sort: 'metadata.name',
    },
    {
      title: t('dynamic-cim~Status'),
      id: COL_STATUS,
    },
    {
      title: t('dynamic-cim~Distribution version'),
      id: COL_DISTRIB_VER,
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
          unfilteredData={data /* So far there is no filtering */}
          Row={ClusterDeploymentRow}
          columns={columns}
        />
      </ListPageBody>
    </>
  );
};

export default ClusterDeploymentsListPage;
