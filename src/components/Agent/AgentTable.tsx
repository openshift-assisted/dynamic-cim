import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource, k8sPatch, useK8sModel } from '@openshift-console/dynamic-plugin-sdk/api';
import { HostsTable, Api, LoadingState } from 'openshift-assisted-ui-lib';
import { Stack, StackItem } from '@patternfly/react-core';
import { sortable, expandable } from '@patternfly/react-table';

import { AgentKind } from '../../kind';
import { ModalDialogsContextProvider, useModalDialogsContext } from '../modals';
import EditHostModal from '../modals/EditHostModal';
import { InfraEnv } from '../types';

import './agenttable.scss';

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
  obj: InfraEnv;
}

const AgentTable: React.FC<AgentTableProps> = ({ obj }) => {
  const { editHostModal } = useModalDialogsContext();
  const [ agentModel ] = useK8sModel(AgentKind);
  const [hosts, loaded] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: AgentKind,
    isList: true,
    selector: obj.spec.agentLabelSelector,
  });

  /*
  const [baremetalhosts] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: 'metal3.io~v1alpha1~BareMetalHost',
    isList: true,
  });
  */

  const restHosts = hosts.map((h: any) => {
    const restHost: Api.Host = {
      id: h.metadata.uid,
      href: '',
      kind: 'Host',
      status: 'known',
      statusInfo: 'foo',
      inventory: JSON.stringify(h.status.inventory),
      requestedHostname: h.spec.hostname,
      role: h.spec.role,
      createdAt: h.metadata.creationTimestamp,
    };
    return restHost;
  });

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
    <>
      <Stack className="agent-table">
        <StackItem>
          {loaded ? (
            <HostsTable
              hosts={mergedHosts}
              EmptyState={() => <div>no hosts</div>}
              columns={getColumns()}
              canEditHost={() => true}
              onEditHost={(host, inventory) =>
                editHostModal.open({
                  host,
                  inventory,
                  usedHostnames: [],
                  onSave: async ({ hostname, hostId }) => {
                    const host = hosts.find((h) => h.metadata.uid === hostId);
                    await k8sPatch(agentModel, host, [{
                      op: 'add',
                      path: `/spec/hostname`,
                      value: hostname,
                    },
                    {
                      op: 'replace',
                      path: `/spec/approved`,
                      value: true,
                    }]);
                  },
                })
              }
              canEditRole={() => true}
              onEditRole={async (host, role) => {
                const agent = hosts.find((h) => h.metadata.uid === host.id);
                await k8sPatch(agentModel, agent, [{
                  op: 'replace',
                  path: `/spec/role`,
                  value: role,
                }]);
              }}
            />
          ) : (
            <LoadingState />
          )}
        </StackItem>
      </Stack>
      <EditHostModal />
    </>
  );
};


export default (props: AgentTableProps) => (
  <ModalDialogsContextProvider>
    <AgentTable {...props} />
  </ModalDialogsContextProvider>
);
