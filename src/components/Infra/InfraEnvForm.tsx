import * as React from 'react';
import { match as RMatch } from 'react-router-dom';
import { CIM } from 'openshift-assisted-ui-lib';
import {
  useK8sModel,
  k8sCreate,
  history,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk/api';
import { InfraEnvKind, AgentClusterInstallKind, ClusterDeploymentKind } from '../../kind';

import '../styles.scss';
import './infra.scss';

const {
  InfraEnvFormPage,
  getClusterDeploymentForInfraEnv,
  getAgentClusterInstall,
  getInfraEnv,
  getSecret,
} = CIM;

type InfraEnvWizardProps = {
  match: RMatch<{ ns: string }>;
};

const InfraEnvWizard: React.FC<InfraEnvWizardProps> = ({ match }) => {
  const namespace = match.params.ns;
  const [infraModel] = useK8sModel(InfraEnvKind);
  const [secretModel] = useK8sModel('core~v1~Secret');
  const [clusterDepModel] = useK8sModel(ClusterDeploymentKind);
  const [agentClusterInstallModel] = useK8sModel(AgentClusterInstallKind);
  const [infraEnvs] = useK8sWatchResource<CIM.InfraEnvK8sResource[]>({
    kind: InfraEnvKind,
    namespace,
    isList: true,
  });
  const usedNames = infraEnvs.map((env) => env.metadata?.name).filter(Boolean) as string[];
  const onSubmit = React.useCallback(
    async (values) => {
      // TODO(mlibra): Secret, clusterDeployment and agentClusterinstall should removed from here once we have Late Binding
      const secret = await k8sCreate(secretModel, getSecret(namespace, values));
      const clusterDeployment = await k8sCreate(
        clusterDepModel,
        getClusterDeploymentForInfraEnv(secret.metadata.name, namespace, values),
      );
      await k8sCreate(
        agentClusterInstallModel,
        getAgentClusterInstall({
          clusterDeploymentName: clusterDeployment.metadata.name,
          namespace,
          values,
        }),
      );
      return k8sCreate(infraModel, getInfraEnv(namespace, values));
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
