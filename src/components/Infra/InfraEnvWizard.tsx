import * as React from 'react'
import { InfraWizard } from 'openshift-assisted-ui-lib';
import { useK8sModel, k8sCreate, history } from '@openshift-console/dynamic-plugin-sdk/api';
import { Base64 } from 'js-base64';

const InfraEnvWizard: React.FC = () => {
  const [infraModel] = useK8sModel('agent-install.openshift.io~v1beta1~InfraEnv');
  const [secretModel] = useK8sModel('core~v1~Secret');
  const [clusterDepModel] = useK8sModel('hive.openshift.io~v1~ClusterDeployment');
  const [agentClusterInstallModel] = useK8sModel('extensions.hive.openshift.io~v1beta1~AgentClusterInstall');
  const [name, setName] = React.useState<string>();
  const onSubmit = React.useCallback(async (values) => {
    setName(values.name);
    await k8sCreate(secretModel, {
      kind: 'Secret',
      apiVersion: 'v1',
      metadata: {
        name: values.name,
        namespace: 'assisted-installer'
      },
      data: {
        '.dockerconfigjson': Base64.encode(values.pullSecret),
      },
      type: 'kubernetes.io/dockerconfigjson',
    });
    await k8sCreate(clusterDepModel, {
      apiVersion: 'hive.openshift.io/v1',
      kind: 'ClusterDeployment',
      metadata: {
        name: values.name,
        namespace: 'assisted-installer',
      },
      spec: {
        baseDomain: values.baseDomain,
        clusterInstallRef:{
          group: 'extensions.hive.openshift.io',
          kind: 'AgentClusterInstall',
          name: values.name,
          version: 'v1beta1',
        },
        clusterName: values.name,
        platform: {
          agentBareMetal: {
            agentSelector: {
              matchLabels: {
                bla: 'aaa',
              },
            },
          },
        },
        pullSecretRef: {
          name: values.name
        }
      },
    });
    await k8sCreate(agentClusterInstallModel, {
      apiVersion: 'extensions.hive.openshift.io/v1beta1',
      kind: 'AgentClusterInstall',
      metadata: {
        name: values.name,
        namespace: 'assisted-installer',
      },
      spec: {
        clusterDeploymentRef: {
          name: values.name,
        },
        imageSetRef: {
          name: 'openshift-v4.7.0',
        },
        networking: {
          clusterNetwork: [{
            cidr: '10.128.0.0/14',
            hostPrefix: 23
          }],
          serviceNetwork: ['172.30.0.0/16'],
        },
        provisionRequirements: {
          controlPlaneAgents: 3,
        },
        sshPublicKey: values.sshPublicKey,
      },
    });

    const infraEnv = {
      apiVersion: 'agent-install.openshift.io/v1beta1',
      kind: 'InfraEnv',
      metadata: {
        name: values.name,
        namespace: 'assisted-installer',
      },
      spec: {
        agentLabelSelector: {
          matchLabels: {
            bla: 'aaa',
          },
        },
        clusterRef: {
          name: values.name,
          namespace: 'assisted-installer',
        },
        pullSecretRef: {
          name: values.name,
        },
        sshAuthorizedKey: values.sshPublicKey,
      },
    };

    if (values.enableProxy) {
      (infraEnv as any).proxy = {
        httpProxy: values.httpProxy,
        httpsProxy: values.httpsProxy,
        noProxy: values.noProxy,
      }
    }

    return k8sCreate(infraModel, infraEnv);
  }, [infraModel]);
  return (
    <InfraWizard
      onSubmit={onSubmit}
      onFinish={() => history.push(`/k8s/ns/assisted-installer/agent-install.openshift.io~v1beta1~InfraEnv/${name}`)}
    />
  );
}

export default InfraEnvWizard;