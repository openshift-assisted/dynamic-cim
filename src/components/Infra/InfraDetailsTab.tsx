import * as React from 'react';
import { CIM } from 'openshift-assisted-ui-lib';

import './infra.scss';

const { EnvironmentDetails } = CIM;

type InfraDetailsTabProps = {
  obj: CIM.InfraEnvK8sResource;
};

const InfraDetailsTab: React.FC<InfraDetailsTabProps> = ({ obj }) => (
  <div className="co-m-pane__body">
    <EnvironmentDetails infraEnv={obj} />
  </div>
);

export default InfraDetailsTab;
