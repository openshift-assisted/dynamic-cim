import * as React from 'react';
import * as _ from 'lodash';
import { match as RMatch } from 'react-router-dom';
import { DetailsPage, PageComponentProps } from '@openshift-console/dynamic-plugin-sdk/api';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { Cluster as AICluster } from 'openshift-assisted-ui-lib/dist/src/api';
import { ClusterProgress } from 'openshift-assisted-ui-lib';

type ClusterInstallRef = {
  group: string;
  kind: string;
  version: string;
  name: string;
};

type ClusterDeploymentK8sResource = K8sResourceCommon & {
  spec?: {
    baseDomain: string;
    clusterInstallRef: ClusterInstallRef;
    clusterName: string;
  };
};

type AgentClusterInstallK8sResource = K8sResourceCommon & {
  spec?: {
    apiVip: string;
    ingressVip: string;
  };
};

type ClusterDeploymentDetailsProps = {
  match: RMatch<{ name: string }>;
};

const ClusterDeploymentDetails: React.FC<ClusterDeploymentDetailsProps> = (props) => {
  const { match } = props;

  return (
    <DetailsPage
      {...props}
      kind="hive.openshift.io~v1~ClusterDeployment"
      name={match.params.name}
      namespace="assisted-installer"
      menuActions={[]}
      resources={[
        {
          kind: 'extensions.hive.openshift.io~v1beta1~AgentClusterInstall',
          prop: 'agentClusterInstall',
          name: 'test-agent-cluster-install',
          namespace: 'assisted-installer',
          isList: false,
        },
      ]}
      pages={[
        {
          href: '',
          nameKey: 'Details',
          component: ClusterDetail,
        },
      ]}
    />
  );
};

export default ClusterDeploymentDetails;

const getAICluster = (
  clusterDeployment: ClusterDeploymentK8sResource,
  agentClusterInstall: AgentClusterInstallK8sResource,
): AICluster => ({
  id: clusterDeployment.metadata.uid,
  kind: 'Cluster',
  href: '',
  name: clusterDeployment.spec.clusterName,
  baseDnsDomain: clusterDeployment.spec.baseDomain,
  apiVip: agentClusterInstall.spec.apiVip,
  ingressVip: agentClusterInstall.spec.ingressVip,
  status: 'installing',
  statusInfo: '',
  imageInfo: {},
  monitoredOperators: [],
});

type DetailsTabProps = React.PropsWithChildren<PageComponentProps<ClusterDeploymentK8sResource>> & {
  agentClusterInstall: K8sResourceCommon;
};

export const ClusterDetail = (props: DetailsTabProps) => {
  console.log('props', props);
  const { obj: clusterDeployment, agentClusterInstall } = props;
  if (_.isEmpty(clusterDeployment) || _.isEmpty(agentClusterInstall)) {
    return (
      <div className="co-m-pane__body">
        Loading
      </div>
    );
  }
  const cluster = getAICluster(clusterDeployment, agentClusterInstall);
  return (
    <div className="co-m-pane__body">
      <ClusterProgress cluster={cluster} />
    </div>
  );
};
