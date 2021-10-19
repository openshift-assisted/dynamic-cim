import { CIM } from 'openshift-assisted-ui-lib';
import { K8sResourceCommon, k8sPatch } from '@openshift-console/dynamic-plugin-sdk';
import { ModalDialogsContextType } from '../modals';

export const onEditHostAction =
  (
    editHostModal: ModalDialogsContextType['editHostModal'],
    agentModel: any,
  ): CIM.ClusterDeploymentHostsTablePropsActions['onEditHost'] =>
  (agent: K8sResourceCommon) =>
    editHostModal.open({
      agent,
      usedHostnames: [],
      onSave: async (agent, hostname) => {
        await k8sPatch({
          model: agentModel,
          resource: agent,
          data: [
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
          ],
        });
      },
    });

export const onEditRoleAction =
  (agentModel: any): CIM.ClusterDeploymentHostsTablePropsActions['onEditRole'] =>
  async (agent: K8sResourceCommon, role: string) =>
    await k8sPatch({
      model: agentModel,
      resource: agent,
      data: [
        {
          op: 'replace',
          path: `/spec/role`,
          value: role,
        },
      ],
    });
