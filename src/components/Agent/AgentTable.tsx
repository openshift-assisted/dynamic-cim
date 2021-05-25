import * as React from 'react';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/api';
import { HostsTable, Api } from 'openshift-assisted-ui-lib';
import { agentcr } from './agentcr';
import { Stack, StackItem } from '@patternfly/react-core';
import { sortable, expandable } from '@patternfly/react-table';

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

const AgentTable: React.FC = () => {
  const [hosts] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: 'agent-install.openshift.io~v1beta1~Agent',
    isList: true,
    namespaced: true,
  });
  
  const [baremetalhosts] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: 'metal3.io~v1alpha1~BareMetalHost',
    isList: true,
    namespaced: true,
  });

  // mock agent, so we always have at least one
  hosts.push(agentcr);

  const restHosts = hosts.map((h: any) => {
    const restHost: Api.Host = {
      id: h.metadata.uid,
      href: '',
      kind: 'Host',
      status: 'known',
      statusInfo: 'foo',
      inventory: JSON.stringify(h.status.inventory),
      requestedHostname: h.status.hostname,
      role: h.spec.role,
      createdAt: h.metadata.creationTimestamp,
    };
    return restHost;
  });

  // TODO(mlibra): filter-out BMHs which have already Agents
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
  const mergedHosts = [...restHosts, ...restBmhs];

  return (
    <Stack className="agent-table">
      <StackItem>
        <HostsTable
          hosts={mergedHosts}
          EmptyState={() => <div>empty</div>}
          clusterStatus="foo"
          getColumns={getColumns}
        />
      </StackItem>
    </Stack>
  );
};

export default AgentTable;
