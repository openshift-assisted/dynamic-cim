import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/api';
import { AgentClusterInstallK8sResource, ClusterDeploymentK8sResource } from '../types';
import { AgentClusterInstallKind, ClusterDeploymentKind } from '../../kind';
import ClusterDeploymentWizard from './ClusterDeploymentWizard';

const EditClusterWizard: React.FC<RouteComponentProps<{ ns: string; name: string }>> = ({
  match,
  history,
}) => {
  const namespace = match.params?.ns;
  const name = match.params?.name;

  const [clusterDeployment, clusterDeploymentLoaded, clusterDeploymentError] =
    useK8sWatchResource<ClusterDeploymentK8sResource>({
      kind: ClusterDeploymentKind,
      name,
      namespace,
      namespaced: true,
      isList: false,
    });

  // it is ok if missing
  const clusterInstallRefName = clusterDeployment?.spec?.clusterInstallRef?.name;
  const [agentClusterInstall] = useK8sWatchResource<AgentClusterInstallK8sResource>(
    clusterInstallRefName
      ? {
          kind: AgentClusterInstallKind,
          name: clusterInstallRefName,
          namespace,
          namespaced: true,
          isList: false,
        }
      : undefined,
  );

  if (!clusterDeploymentLoaded) {
    // TODO(mlibra): render Loading state
    return <div>Loading ...</div>;
  }

  if (clusterDeploymentError) {
    // TODO(mlibra): render Error state
    return <div>Error: {JSON.stringify(clusterDeploymentError)}</div>;
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
