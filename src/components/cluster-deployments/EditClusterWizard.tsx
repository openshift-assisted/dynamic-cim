import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { CIM } from 'openshift-assisted-ui-lib';
import ClusterDeploymentWizard from './ClusterDeploymentWizard';
import { getPreferredLang } from '../../utils';

const { I18N } = CIM;

const EditClusterWizard: React.FC<RouteComponentProps<{ ns: string; name: string }>> = ({
  match,
  history,
}) => {
  const namespace = match.params?.ns;
  const name = match.params?.name;

  return (
    <I18N preferredLang={getPreferredLang()}>
      <ClusterDeploymentWizard
        history={history}
        namespace={namespace}
        queriedClusterDeploymentName={name}
      />
    </I18N>
  );
};

export default EditClusterWizard;
