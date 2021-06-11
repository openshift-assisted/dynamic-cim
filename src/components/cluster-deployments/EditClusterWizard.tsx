import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/lib/api/api';
import { AgentClusterInstallK8sResource, ClusterDeploymentK8sResource } from '../types';
import { AgentClusterInstallKind } from '../../kind';
import ClusterDeploymentWizard from './ClusterDeploymentWizard';

const EditClusterWizard: React.FC<RouteComponentProps<{ ns: string; name: string }>> = ({
  match,
  history,
}) => {
  const namespace = match.params?.ns;
  const name = match.params?.name;

  const [clusterDeployment, clusterDeploymentError] =
    useK8sWatchResource<ClusterDeploymentK8sResource>({
      kind: AgentClusterInstallKind,
      name,
      namespace,
      namespaced: true,
      isList: false,
    });

  let agentClusterInstall, agentClusterInstallError;
  if (clusterDeployment?.spec?.clusterInstallRef?.name) {
    [agentClusterInstall, agentClusterInstallError] =
      useK8sWatchResource<AgentClusterInstallK8sResource>({
        kind: AgentClusterInstallKind,
        name: clusterDeployment.spec.clusterInstallRef.name,
        namespace,
        namespaced: true,
        isList: false,
      });
  }

  if (clusterDeploymentError || agentClusterInstallError) {
    // TODO(mlibra): render Error state
    return (
      <div>
        Error: {clusterDeploymentError}, {agentClusterInstallError}
      </div>
    );
  }

  return (
    <ClusterDeploymentWizard
      history={history}
      namespace={namespace}
      clusterDeployment={clusterDeployment}
      agentClusterInstall={agentClusterInstall}
    />
  );
};

export default EditClusterWizard;
