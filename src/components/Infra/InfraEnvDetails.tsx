import * as React from 'react';
import { match as RMatch } from 'react-router-dom';
import { DetailsPage, K8sKind } from '@openshift-console/dynamic-plugin-sdk/api';
// import { InfraEnvDetails as InfraEnvDetailsAssisted } from 'openshift-assisted-ui-lib';
import AgentTable from '../Agent/AgentTable';
import { InfraEnv, KebabAction } from '../types';

type InfraEnvDetailsProps = {
  match: RMatch;
}

const AddHostAction: KebabAction = (
  kind: K8sKind,
  obj: InfraEnv,
  resources: {},
) => {
  console.log('-- kind: ', kind, ', obj: ', obj, ', resources: ', resources);
  const isoDownloadURL = obj?.status?.isoDownloadURL;

  return {
  label: 'Add Host',
  hidden: !isoDownloadURL,
  callback: () => {console.log('Add Host action: ', isoDownloadURL);},
  /*
  accessReview: {
    group: kind.apiGroup,
    resource: kind.plural,
    name: obj.metadata.name,
    namespace: obj.metadata.namespace,
    verb: 'patch',
  },
  */
}
};

const InfraEnvDetails: React.FC<InfraEnvDetailsProps> = (props) => {
  const menuActions = [
    AddHostAction,
  ];

  return (
    <DetailsPage
      {...props}
      kind="agent-install.openshift.io~v1beta1~InfraEnv"
      name="cluster-crd-tj4"
      namespace="assisted-installer"
      menuActions={menuActions}
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
