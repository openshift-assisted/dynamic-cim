import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { k8sPatch } from '@openshift-console/dynamic-plugin-sdk/api';
import { ModalDialogsContextType } from '../modals';

export const onEditHostAction =
  (editHostModal: ModalDialogsContextType['editHostModal'], agentModel: any) =>
  (agent: K8sResourceCommon) =>
    editHostModal.open({
      agent,
      usedHostnames: [],
      onSave: async (agent, hostname) => {
        await k8sPatch(agentModel, agent, [
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
  (agentModel: any) => async (agent: K8sResourceCommon, role: string) =>
    await k8sPatch(agentModel, agent, [
      {
        op: 'replace',
        path: `/spec/role`,
        value: role,
      },
    ]);
