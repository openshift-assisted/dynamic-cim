import * as React from 'react';
import { useK8sWatchResource, useK8sModel } from '@openshift-console/dynamic-plugin-sdk/api';
import { CIM } from 'openshift-assisted-ui-lib';
import { sortable, expandable } from '@patternfly/react-table';
import { AgentKind } from '../../kind';
import { ModalDialogsContextProvider, useModalDialogsContext } from '../modals';
import EditHostModal from '../modals/EditHostModal';
import { onEditHostAction, onEditRoleAction } from './actions';

const { getAIHosts, HostsTable, LoadingState } = CIM;

const getColumns = () => [
  { title: 'Hostname', transforms: [sortable], cellFormatters: [expandable] },
  { title: 'Role', transforms: [sortable] },
  { title: 'Status', transforms: [sortable] },
  { title: 'Discovered At', transforms: [sortable] },
  { title: 'CPU Cores', transforms: [sortable] }, // cores per machine (sockets x cores)
  { title: 'Memory', transforms: [sortable] },
  { title: 'Disk', transforms: [sortable] },
  { title: '' },
];

type AgentTableProps = {
  obj: CIM.AgentK8sResource;
};

const AgentTable: React.FC<AgentTableProps> = ({ obj }) => {
  const { editHostModal } = useModalDialogsContext();
  const [agentModel] = useK8sModel(AgentKind);
  const selector = obj.status?.agentLabelSelector;
  const [agents, loaded] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    selector
      ? {
          kind: AgentKind,
          isList: true,
          selector,
        }
      : undefined,
  );

  /* TODO(mlibra)
  const [baremetalhosts] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: 'metal3.io~v1alpha1~BareMetalHost',
    isList: true,
  });
  */

  const restHosts = getAIHosts(agents);

  // TODO(mlibra): filter-out BMHs which have already Agents
  /*
  const restBmhs = baremetalhosts.map((h: any) => {
    const hostInventory: Api.Inventory = {
      hostname: h.metadata.name,
      bmcAddress: h.spec?.bmc?.address,
      systemVendor: {
        virtual: false,
        productName: 'Bare Metal Host',
      },
    };

    const restBmh: Api.Host = {
      id: h.metadata.uid,
      href: '',
      kind: undefined, // It's BMC
      status: 'known',
      statusInfo: undefined,
      inventory: JSON.stringify(hostInventory),
      requestedHostname: h.metadata.name,
      role: undefined,
      createdAt: h.metadata.creationTimestamp,
    };

    return restBmh;
  });
  */
  const mergedHosts = [...restHosts]; //, ...restBmhs];

  return (
    <div className="co-m-pane__body">
      {loaded ? (
        <HostsTable
          hosts={mergedHosts}
          EmptyState={() => <div>no hosts</div>}
          columns={getColumns()}
          canEditHost={() => true}
          onEditHost={onEditHostAction(editHostModal, agentModel)}
          canEditRole={() => true}
          onEditRole={onEditRoleAction(agentModel)}
          className="agents-table"
          AdditionalNTPSourcesDialogToggleComponent={CIM.AdditionalNTPSourcesDialogToggle}
        />
      ) : (
        <LoadingState />
      )}
      <EditHostModal />
    </div>
  );
};

export default (props: AgentTableProps) => (
  <ModalDialogsContextProvider>
    <AgentTable {...props} />
  </ModalDialogsContextProvider>
);
