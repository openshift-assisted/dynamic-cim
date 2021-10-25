import * as React from 'react';
import { useHistory } from 'react-router';
import { CreateResourceComponentProps } from '@openshift-console/dynamic-plugin-sdk';
import { CIM } from 'openshift-assisted-ui-lib';
import { getPreferredLang } from '../../utils';
import ClusterDeploymentWizard from './ClusterDeploymentWizard';

import './cluster-deployment.scss';

const { I18N } = CIM;

const CreateClusterWizard: React.FC<CreateResourceComponentProps> = ({ namespace = 'default' }) => {
  const history = useHistory(); // TODO(mlibra): Can we take this from the dynamic SDK?

  return (
    <I18N preferredLang={getPreferredLang()}>
      <ClusterDeploymentWizard history={history} namespace={namespace} />
    </I18N>
  );
};

export default CreateClusterWizard;
