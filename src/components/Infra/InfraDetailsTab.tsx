import * as React from 'react';
import { CIM } from 'openshift-assisted-ui-lib';

import './infra.scss';

const { EnvironmentDetails } = CIM;

type InfraDetailsTabProps = {
  obj: CIM.InfraEnv;
};

const InfraDetailsTab: React.FC<InfraDetailsTabProps> = ({ obj }) => {
  const labels = Object.keys(obj.status?.agentLabelSelector?.matchLabels || {}).map(
    (k) => `${k}=${obj.status.agentLabelSelector.matchLabels[k]}`,
  );
  return (
    <div className="co-m-pane__body">
      <EnvironmentDetails
        title="Environment details"
        name={obj.metadata.name}
        baseDomain="foo.com"
        labels={labels}
        location={obj.metadata.labels?.['assisted-installer-location'] || 'no location'}
        creationDate={obj.metadata.creationTimestamp}
        pullSecret="foo"
        sshPublicKey="bar"
      />
    </div>
  );
};

export default InfraDetailsTab;
