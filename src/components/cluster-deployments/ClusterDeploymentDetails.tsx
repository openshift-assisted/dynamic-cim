import * as React from 'react';
import { saveAs } from 'file-saver';
import { match as RMatch } from 'react-router-dom';
import {
  Button,
  ButtonVariant,
  Card,
  CardBody,
  CardExpandableContent,
  CardHeader,
  CardTitle,
  Stack,
  StackItem,
} from '@patternfly/react-core';
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
import ClusterDeploymentCredentials from './ClusterDeploymentCredentials';

const {
  getAICluster,
  getClusterValidatedCondition,
  ValidatedConditionAlert,
  ClusterProgress,
  AgentTable,
  LoadingState,
  ClusterPropertiesList,
  ClusterInstallationError,
  getClusterStatus,
  KubeconfigDownload,
  EventsModalButton,
} = CIM;

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

export const ClusterDetail = (props: DetailsTabProps) => {
  const { obj: clusterDeployment } = props;
  const [progressCardExpanded, setProgressCardExpanded] = React.useState(true);
  const [inventoryCardExpanded, setInventoryCardExpanded] = React.useState(true);
  const [detailsCardExpanded, setDetailsCardExpanded] = React.useState(true);

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

  const cluster = getAICluster({ clusterDeployment, agentClusterInstall, agents });
  const [clusterStatus, clusterStatusInfo] = getClusterStatus(agentClusterInstall);

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

  return (
    <div className="co-dashboard-body">
      {/* <pre style={{ fontSize: 10 }}>{JSON.stringify(clusterDeployment, null, 2)}</pre> */}
      {/* <pre style={{ fontSize: 10 }}>{JSON.stringify(agentClusterInstall, null, 2)}</pre> */}
      {/* <pre style={{ fontSize: 10 }}>{JSON.stringify(agents, null, 2)}</pre> */}
      <Stack hasGutter>
        {[
          'preparing-for-installation',
          'installing',
          'installing-pending-user-action',
          'finalizing',
          'installed',
          'error',
          'cancelled',
          'adding-hosts',
        ].includes(clusterStatus) && (
          <StackItem>
            <Card id="cluster-installation-progress-card" isExpanded={progressCardExpanded}>
              <CardHeader
                onExpand={() => setProgressCardExpanded(!progressCardExpanded)}
                toggleButtonProps={{
                  id: 'progress-card-toggle-button',
                  'aria-label': 'Cluster installation process',
                  'aria-labelledby': 'titleId progress-card-toggle-button',
                  'aria-expanded': progressCardExpanded,
                }}
              >
                <CardTitle id="titleId">Cluster installation process</CardTitle>
              </CardHeader>
              <CardExpandableContent>
                <CardBody>
                  <Stack hasGutter>
                    <StackItem>
                      <ClusterProgress
                        cluster={cluster}
                        onFetchEvents={async () =>
                          console.log('ClusterProgress - onFetchEvents missing implementation')
                        }
                      />
                    </StackItem>
                    {['installed', 'adding-hosts'].includes(clusterStatus) && (
                      <StackItem>
                        <ClusterDeploymentCredentials
                          cluster={cluster}
                          namespace={clusterDeployment.metadata.namespace}
                          adminPasswordSecretRefName={
                            agentClusterInstall.spec?.clusterMetadata?.adminPasswordSecretRef.name
                          }
                          consoleUrl={
                            clusterDeployment.status?.webConsoleURL ||
                            `https://console-openshift-console.apps.${cluster.name}.${cluster.baseDnsDomain}`
                          }
                        />
                      </StackItem>
                    )}
                    <StackItem>
                      <KubeconfigDownload
                        handleDownload={handleKubeconfigDownload}
                        clusterId={clusterDeployment.metadata?.uid || ''}
                        status={clusterStatus}
                      />{' '}
                      <EventsModalButton
                        id="cluster-events-button"
                        entityKind="cluster"
                        cluster={cluster}
                        title="Cluster Events"
                        variant={ButtonVariant.link}
                        style={{ textAlign: 'right' }}
                        onFetchEvents={handleFetchEvents}
                        ButtonComponent={Button}
                      >
                        View Cluster Events
                      </EventsModalButton>
                    </StackItem>
                    {['error', 'cancelled'].includes(clusterStatus) && (
                      <StackItem>
                        <ClusterInstallationError
                          title={
                            clusterStatus === 'cancelled'
                              ? 'Cluster installation was cancelled'
                              : undefined
                          }
                          statusInfo={clusterStatusInfo}
                          logsUrl={agentClusterInstall.status?.debugInfo?.logsURL}
                          openshiftVersion={clusterDeployment.status?.installVersion}
                        />
                      </StackItem>
                    )}
                  </Stack>
                </CardBody>
              </CardExpandableContent>
            </Card>
          </StackItem>
        )}
        <StackItem>
          <Card id="cluster-inventory-card" isExpanded={inventoryCardExpanded}>
            <CardHeader
              onExpand={() => setInventoryCardExpanded(!inventoryCardExpanded)}
              toggleButtonProps={{
                id: 'inventory-card-toggle-button',
                'aria-label': 'Hosts inventory',
                'aria-labelledby': 'titleId inventory-card-toggle-button',
                'aria-expanded': inventoryCardExpanded,
              }}
            >
              <CardTitle id="titleId">Hosts inventory</CardTitle>
            </CardHeader>
            <CardExpandableContent>
              <CardBody>
                <AgentTable agents={agents} className="agents-table" />
              </CardBody>
            </CardExpandableContent>
          </Card>
        </StackItem>
        <StackItem>
          <Card id="cluster-details-card" isExpanded={detailsCardExpanded}>
            <CardHeader
              onExpand={() => setDetailsCardExpanded(!detailsCardExpanded)}
              toggleButtonProps={{
                id: 'details-card-toggle-button',
                'aria-label': 'Details',
                'aria-labelledby': 'titleId details-card-toggle-button',
                'aria-expanded': detailsCardExpanded,
              }}
            >
              <CardTitle id="titleId">Details</CardTitle>
            </CardHeader>
            <CardExpandableContent>
              <CardBody>
                <ClusterPropertiesList
                  name={clusterDeployment.metadata?.name}
                  id={clusterDeployment.metadata?.uid}
                  openshiftVersion={agentClusterInstall?.spec?.imageSetRef?.name}
                  baseDnsDomain={clusterDeployment.spec?.baseDomain}
                  apiVip={agentClusterInstall?.spec?.apiVIP}
                  ingressVip={agentClusterInstall?.spec?.ingressVIP}
                  clusterNetworkCidr={
                    agentClusterInstall.spec?.networking?.clusterNetwork?.[0].cidr
                  }
                  clusterNetworkHostPrefix={
                    agentClusterInstall.spec?.networking?.clusterNetwork?.[0]?.hostPrefix
                  }
                  serviceNetworkCidr={agentClusterInstall.spec?.networking?.serviceNetwork?.[0]}
                  installedTimestamp={clusterDeployment.status?.installedTimestamp}
                />
              </CardBody>
            </CardExpandableContent>
          </Card>
        </StackItem>
        <StackItem>
          <ValidatedConditionAlert condition={getClusterValidatedCondition(agentClusterInstall)} />
        </StackItem>
      </Stack>
    </div>
  );
};

type ClusterDeploymentDetailsProps = {
  match: RMatch<{ name: string }>;
  kind: K8sResourceKindReference;
  name: string;
  namespace: string;
};

const ClusterDeploymentDetails: React.FC<ClusterDeploymentDetailsProps> = (props) => {
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
          component: ClusterDetail,
        },
      ]}
    />
  );
};

export default ClusterDeploymentDetails;
