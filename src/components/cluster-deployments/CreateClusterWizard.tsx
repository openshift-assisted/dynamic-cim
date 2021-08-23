import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { CIM } from 'openshift-assisted-ui-lib';
import ClusterDeploymentWizard from './ClusterDeploymentWizard';
import { getPreferredLang } from '../../utils';

import './cluster-deployment.scss';

const { I18N } = CIM;

const CreateClusterWizard: React.FC<RouteComponentProps<{ ns: string }>> = ({ match, history }) => {
  const namespace = match?.params?.ns || 'assisted-installer';

  return (
    <I18N preferredLang={getPreferredLang()}>
      <ClusterDeploymentWizard history={history} namespace={namespace} />
    </I18N>
  );
};

export default CreateClusterWizard;
