import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk/api';
import { ModalDialogsContextType } from '../modals';

export const onEditHostAction =
  (
    editHostModal: ModalDialogsContextType['editHostModal'],
    agentModel: any,
    agents: K8sResourceCommon[],
  ) =>
  (host, inventory) =>
    editHostModal.open({
      host,
      inventory,
      usedHostnames: [],
      onSave: async ({ hostname, hostId }) => {
        const host = agents.find((h) => h.metadata.uid === hostId);
        await k8sPatch(agentModel, host, [
          {
            op: 'add',
            path: `/spec/hostname`,
            value: hostname,
          },
          {
            op: 'replace',
            path: `/spec/approved`,
            value: true,
          },
        ]);
      },
    });

export const onEditRoleAction =
  (agentModel: any, agents: K8sResourceCommon[]) => async (host, role) => {
    const agent = agents.find((h) => h.metadata.uid === host.id);
    await k8sPatch(agentModel, agent, [
      {
        op: 'replace',
        path: `/spec/role`,
        value: role,
      },
    ]);
  };
