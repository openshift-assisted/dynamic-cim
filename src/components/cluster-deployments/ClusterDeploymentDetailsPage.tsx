import * as React from 'react';
import { saveAs } from 'file-saver';
import { match as RMatch } from 'react-router-dom';
import {
  DetailsPage,
  K8sKind,
  KebabOptionsCreator,
  PageComponentProps,
  useK8sWatchResource,
} from '@openshift-console/dynamic-plugin-sdk/api';
import { CIM } from 'openshift-assisted-ui-lib';
import { K8sResourceCommon, K8sResourceKindReference } from '@openshift-console/dynamic-plugin-sdk';
import { k8sGet } from '@openshift-console/dynamic-plugin-sdk/api';
import { AgentClusterInstallKind, AgentKind, ClusterDeploymentKind } from '../../kind';
import { canEditCluster } from './utils';
import { SecretModel } from '../../models/ocp';

const { LoadingState, ClusterDeploymentDetails } = CIM;

type DetailsTabProps = React.PropsWithChildren<
  PageComponentProps<CIM.ClusterDeploymentK8sResource>
> & {
  agentClusterInstall: K8sResourceCommon;
};

const getClusterDeploymentActions =
  (agentClusterInstall?: CIM.AgentClusterInstallK8sResource): KebabOptionsCreator =>
  (kindObj: K8sKind, clusterDeployment: K8sResourceCommon) => {
    const { namespace, name } = clusterDeployment.metadata || {};
    return [
      {
        label: 'Edit',
        href: `/k8s/ns/${namespace}/${ClusterDeploymentKind}/${name}/edit`,
        isDisabled: !canEditCluster(agentClusterInstall),
      },
    ];
  };

export const ClusterDeploymentOverview = (props: DetailsTabProps) => {
  const { obj: clusterDeployment } = props;
  const [agentClusterInstall, agentClusterInstallLoaded, agentClusterInstallError] =
    useK8sWatchResource<CIM.AgentClusterInstallK8sResource>(
      clusterDeployment?.spec?.clusterInstallRef.name
        ? {
            kind: AgentClusterInstallKind,
            name: clusterDeployment?.spec?.clusterInstallRef.name,
            namespace: clusterDeployment?.metadata?.namespace,
            namespaced: true,
            isList: false,
          }
        : undefined,
    );

  const agentSelector = clusterDeployment.spec?.platform?.agentBareMetal?.agentSelector;
  const [agents, agentsLoaded, agentsError] = useK8sWatchResource<CIM.AgentK8sResource[]>(
    agentSelector
      ? {
          kind: AgentKind,
          isList: true,
          selector: agentSelector,
          namespaced: true,
        }
      : undefined,
  );

  if (!clusterDeployment) return null;
  if (agentsError) throw new Error(agentsError);
  if (agentClusterInstallError) throw new Error(agentClusterInstallError);
  if (!(agentsLoaded && agentClusterInstallLoaded)) return <LoadingState />;

  const handleKubeconfigDownload = async () => {
    const kubeconfigSecretName =
      agentClusterInstall.spec?.clusterMetadata?.adminKubeconfigSecretRef.name;
    const kubeconfigSecretNamespace = clusterDeployment.metadata.namespace;
    agentClusterInstall.spec?.clusterMetadata?.adminKubeconfigSecretRef.name;
    try {
      const kubeconfigSecret = await k8sGet(
        SecretModel,
        kubeconfigSecretName,
        kubeconfigSecretNamespace,
      );
      const blob = new Blob([atob(kubeconfigSecret.data.kubeconfig)], {
        type: 'text/plain;charset=utf-8',
      });
      saveAs(blob, 'kubeconfig.json');
    } catch (e) {
      console.error('Failed to fetch kubeconfig secret.', e);
    }
  };

  const handleFetchEvents = async (props, onSuccess, onError) => {
    try {
      const res = await fetch(agentClusterInstall.status?.debugInfo?.eventsURL, {
        mode: 'same-origin',
      });
      const data = await res.json();
      onSuccess(
        data.map((event: any) => ({
          clusterId: event.cluster_id,
          eventTime: event.event_time,
          message: event.message,
          severity: event.severity,
        })),
      );
    } catch (e) {
      onError('Failed to fetch cluster events.');
    }
  };

  const handleFetchCredentials = async (setCredentials) => {
    const adminPasswordSecretRefName =
      agentClusterInstall.spec?.clusterMetadata?.adminPasswordSecretRef.name;
    const namespace = clusterDeployment.metadata.namespace;

    try {
      const secret = await k8sGet(SecretModel, adminPasswordSecretRefName, namespace);
      setCredentials({
        username: atob(secret.data.username),
        password: atob(secret.data.password),
      });
    } catch (e) {
      console.error('Failed to fetch adminPasswordSecret secret.', e);
    }
  };

  return (
    <div className="co-dashboard-body">
      <ClusterDeploymentDetails
        clusterDeployment={clusterDeployment}
        agentClusterInstall={agentClusterInstall}
        agents={agents}
        downloadKubeconfig={handleKubeconfigDownload}
        fetchEvents={handleFetchEvents}
        fetchCredentials={handleFetchCredentials}
        agentTableClassName="agents-table"
      />
    </div>
  );
};

type ClusterDeploymentDetailsPageProps = {
  match: RMatch<{ name: string }>;
  kind: K8sResourceKindReference;
  name: string;
  namespace: string;
};

const ClusterDeploymentDetailsPage: React.FC<ClusterDeploymentDetailsPageProps> = (props) => {
  const [agentClusterInstall] = useK8sWatchResource<CIM.AgentClusterInstallK8sResource>({
    kind: AgentClusterInstallKind,
    name: props.name,
    namespace: props.namespace,
    namespaced: true,
    isList: false,
  });

  return (
    <DetailsPage
      {...props}
      menuActions={getClusterDeploymentActions(agentClusterInstall)}
      pages={[
        {
          href: '',
          nameKey: 'Overview',
          component: ClusterDeploymentOverview,
        },
      ]}
    />
  );
};

export default ClusterDeploymentDetailsPage;
