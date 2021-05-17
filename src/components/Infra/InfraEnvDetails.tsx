import * as React from 'react';
import { match as RMatch } from 'react-router-dom';
import { DetailsPage } from '@openshift-console/dynamic-plugin-sdk/api';

import AgentTable from '../Agent/AgentTable';

type InfraEnvDetailsProps = {
  match: RMatch;
  namespace: string;
  name: string;
}

const InfraEnvDetails: React.FC<InfraEnvDetailsProps> = ({ namespace, name, ...rest }) => {
  return (
    <DetailsPage
      {...rest}
      kind="agent-install.openshift.io~v1beta1~InfraEnv"
      name={name}
      namespace={namespace}
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