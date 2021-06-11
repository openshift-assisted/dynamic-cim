import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import ClusterDeploymentWizard from './ClusterDeploymentWizard';

import './cluster-deployment.scss';

const CreateClusterWizard: React.FC<RouteComponentProps<{ ns: string }>> = ({ match, history }) => {
  const namespace = match?.params?.ns || 'assisted-installer';

  return (
    <ClusterDeploymentWizard
      history={history}
      namespace={namespace}
    />
  );
};

export default CreateClusterWizard;
