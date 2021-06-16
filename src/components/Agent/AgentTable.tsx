import * as React from 'react';
import {
  useK8sWatchResource,
  k8sPatch,
  useK8sModel,
} from '@openshift-console/dynamic-plugin-sdk/api';
import { LoadingState, AgentTable as AIAgentTable } from 'openshift-assisted-ui-lib';
import { Agent } from 'openshift-assisted-ui-lib/dist/src/cim/types/k8s';

import { AgentKind } from '../../kind';
import { InfraEnv } from '../types';

import './agenttable.scss';
import '../styles.scss';

type AgentTableProps = {
  obj: InfraEnv;
};

const AgentTable: React.FC<AgentTableProps> = ({ obj }) => {
  const [agentModel] = useK8sModel(AgentKind);
  const [agents, loaded] = useK8sWatchResource<Agent[]>({
    kind: AgentKind,
    isList: true,
    selector: obj.spec.agentLabelSelector,
  });

  return loaded ? (
    <div className="agent-table">
      <AIAgentTable
        agents={agents}
        onEditHostname={(agent, hostname) =>
          k8sPatch(agentModel, agent, [
            {
              op: agent.spec.hostname ? 'replace' : 'add',
              path: `/spec/hostname`,
              value: hostname,
            },
          ])
        }
        onApprove={(agent) =>
          k8sPatch(agentModel, agent, [
            {
              op: 'add',
              path: `/spec/approved`,
              value: true,
            },
          ])
        }
        onEditRole={(agent, role) =>
          k8sPatch(agentModel, agent, [
            {
              op: 'replace',
              path: `/spec/role`,
              value: role,
            },
          ])
        }
      />
    </div>
  ) : (
    <LoadingState />
  );
};

export default AgentTable;
