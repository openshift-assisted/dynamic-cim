import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/api';
import { HostsTable } from 'openshift-assisted-ui-lib';
import { Host } from 'openshift-assisted-ui-lib/dist/src/api';
import * as React from 'react';
import { agentcr } from './agentcr';
import { Stack, StackItem } from '@patternfly/react-core'
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
  { title: ''},
];


const AgentTable: React.FC = () => {
  const [hosts] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: `agent-install.openshift.io~v1beta1~Agent`,
    isList: true,
    namespaced: true,
  });

  hosts.push(agentcr);

  const restHosts = hosts.map((h: any) => {
    let restHost: Host;
    restHost = {
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
  return (
    <Stack className="agent-table">
      <StackItem>
        <HostsTable
          hosts={restHosts}
          EmptyState={() => <div>empty</div>}
          clusterStatus="foo"
          getColumns={getColumns}
        />
      </StackItem>
    </Stack>
  );
};

export default AgentTable;
