import * as React from 'react'
import { InfraEnvForm } from 'openshift-assisted-ui-lib';
import { useK8sModel, k8sCreate, history, useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk/api';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

import { InfraEnvKind } from '../../kind';

import '../styles.scss';
import './infra.scss';

const InfraEnvWizard: React.FC = () => {
  const [infraModel] = useK8sModel(InfraEnvKind);
  const [secretModel] = useK8sModel('core~v1~Secret');
  const [clusterDepModel] = useK8sModel('hive.openshift.io~v1~ClusterDeployment');
  const [agentClusterInstallModel] = useK8sModel('extensions.hive.openshift.io~v1beta1~AgentClusterInstall');
  const [infraEnvs] = useK8sWatchResource<K8sResourceCommon[]>({
    kind: InfraEnvKind,
    namespace: 'assisted-installer',
    isList: true,
  });
  const usedNames = infraEnvs.map((env) => env.metadata.name);
  const onSubmit = React.useCallback(async (values) => {
    await k8sCreate(secretModel, {
      kind: 'Secret',
      apiVersion: 'v1',
      metadata: {
        name: values.name,
        namespace: 'assisted-installer'
      },
      data: {
        '.dockerconfigjson': btoa(values.pullSecret),
      },
      type: 'kubernetes.io/dockerconfigjson',
    });

    const labels = values.labels.reduce((acc,curr) => {
      const label = curr.split('=');
      acc[label[0]] = label[1];
      return acc;
    }, {});
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
              matchLabels: labels,
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
        labels: {
          'assisted-install-location': values.location,
        }
      },
      spec: {
        agentLabelSelector: {
          matchLabels: labels,
        },
        agentLabels: labels,
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
      (infraEnv as any).spec.proxy = {
        httpProxy: values.httpProxy,
        httpsProxy: values.httpsProxy,
        noProxy: values.noProxy,
      }
    }

    return k8sCreate(infraModel, infraEnv);
  }, [infraModel]);
  return (
    <div className="infra-env__form">
      <InfraEnvForm
        usedNames={usedNames}
        onSubmit={onSubmit}
        onFinish={(values) => history.push(`/k8s/ns/assisted-installer/agent-install.openshift.io~v1beta1~InfraEnv/${values.name}`)}
        onClose={() => history.push('/k8s/ns/assisted-installer/agent-install.openshift.io~v1beta1~InfraEnv/')}
      />
    </div>
  );
}

export default InfraEnvWizard;