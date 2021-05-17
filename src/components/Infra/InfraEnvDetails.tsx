import * as React from 'react';
import { match as RMatch } from 'react-router-dom';
import { DetailsPage } from '@openshift-console/dynamic-plugin-sdk/api';

import AgentTable from '../Agent/AgentTable';

type InfraEnvDetailsProps = {
  match: RMatch;
}

const InfraEnvDetails: React.FC<InfraEnvDetailsProps> = (props) => {
  return (
    <DetailsPage
      {...props}
      kind="agent-install.openshift.io~v1beta1~InfraEnv"
      name="cluster-crd-tj4"
      namespace="assisted-installer"
      menuActions={[]}
      pages={[
        {
          href: '',
          nameKey: 'Hosts',
          component: AgentTable,
        },
      ]}
    />
  );
}

export default InfraEnvDetails;