import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { CIM } from 'openshift-assisted-ui-lib';
import {
  useK8sModel,
  k8sCreate,
  useK8sWatchResource,
  CreateResourceComponentProps,
} from '@openshift-console/dynamic-plugin-sdk';
import { InfraEnvKind, AgentClusterInstallKind, ClusterDeploymentKind } from '../../kind';
import {
  ClusterDeploymentK8sResource,
  InfraEnvK8sResource,
  SecretK8sResource,
} from 'openshift-assisted-ui-lib/dist/src/cim/types';

import '../styles.scss';
import './infra.scss';

const {
  InfraEnvFormPage,
  getClusterDeploymentForInfraEnv,
  getAgentClusterInstall,
  getInfraEnv,
  getSecret,
} = CIM;

const InfraEnvWizard: React.FC<CreateResourceComponentProps> = ({ namespace = 'default' }) => {
  console.log('-- InfraEnvWizard namespace: ', namespace);
  const history = useHistory(); // TODO(mlibra): Can we take this from the dynamic SDK?
  const [infraModel] = useK8sModel(InfraEnvKind);
  const [secretModel] = useK8sModel('core~v1~Secret');
  const [clusterDepModel] = useK8sModel(ClusterDeploymentKind);
  const [agentClusterInstallModel] = useK8sModel(AgentClusterInstallKind);
  const [infraEnvs] = useK8sWatchResource<InfraEnvK8sResource[]>({
    kind: InfraEnvKind,
    namespace,
    isList: true,
  });
  const usedNames = infraEnvs.map((env) => env.metadata?.name).filter(Boolean) as string[];
  const onSubmit = React.useCallback(
    async (values) => {
      // TODO(mlibra): Secret, clusterDeployment and agentClusterinstall should be removed from here once we have Late Binding
      // TODO(mlibra): We already have, let's do it!
      const secret = await k8sCreate<SecretK8sResource>({
        model: secretModel,
        data: getSecret(namespace, values),
      });
      const clusterDeployment = await k8sCreate<ClusterDeploymentK8sResource>({
        model: clusterDepModel,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        data: getClusterDeploymentForInfraEnv(secret.metadata?.name!, namespace, values),
      });
      await k8sCreate({
        model: agentClusterInstallModel,
        data: getAgentClusterInstall({
          clusterDeploymentName: clusterDeployment.metadata?.name,
          namespace,
          values,
        }),
      });
      return k8sCreate({ model: infraModel, data: getInfraEnv(namespace, values) });
    },
    [infraModel, namespace, secretModel, agentClusterInstallModel, clusterDepModel],
  );
  return (
    <div className="co-m-pane__body">
      <InfraEnvFormPage
        usedNames={usedNames}
        onSubmit={onSubmit}
        onFinish={(values) => history.push(`/k8s/ns/${namespace}/${InfraEnvKind}/${values.name}`)}
        onClose={() => history.push(`/k8s/ns/${namespace}/${InfraEnvKind}/`)}
        isBMPlatform={false} // TODO
      />
    </div>
  );
};

export default InfraEnvWizard;
