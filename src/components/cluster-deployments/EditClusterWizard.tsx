import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import ClusterDeploymentWizard from './ClusterDeploymentWizard';

const EditClusterWizard: React.FC<RouteComponentProps<{ ns: string; name: string }>> = ({
  match,
  history,
}) => {
  const namespace = match.params?.ns;
  const name = match.params?.name;

  return (
    <ClusterDeploymentWizard
      history={history}
      namespace={namespace}
      queriedClusterDeploymentName={name}
    />
  );
};

export default EditClusterWizard;
