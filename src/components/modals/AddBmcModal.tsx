import * as React from 'react';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk/api';
import { AddBmcModal as AIAddBmcModal, AddBmcValues } from 'openshift-assisted-ui-lib';
import { useModalDialogsContext } from './ModalContext';
import { BareMetalHostModel, SecretModel } from '../../models';
import { BareMetalHostKind, SecretKind } from '../types';

const DownloadIsoModal: React.FC<{ namespace: string }> = ({ namespace }) => {
  const { addBmcDialog } = useModalDialogsContext();

  const onCreate = async (values: AddBmcValues) => {
    const credentialsSecret: SecretKind = {
      apiVersion: SecretModel.apiVersion,
      kind: SecretModel.kind,
      stringData: {
        username: btoa(values.username),
        password: btoa(values.password),
      },
      metadata: {
        generateName: `bmc-${values.hostname.split('.').shift()}-`,
        namespace,
      },
      type: 'Opaque',
    };
    const secretRes = await k8sCreate(SecretModel, credentialsSecret);

    const bmh: BareMetalHostKind = {
      apiVersion: `${BareMetalHostModel.apiGroup}/${BareMetalHostModel.apiVersion}`,
      kind: BareMetalHostModel.kind,
      metadata: {
        name: values.hostname,
        namespace,
        labels: {
          'infraenvs.agent-install.openshift.io': 'test-cluster-virtual-installenv',
        },
        annotations: {
          'inspect.metal3.io': 'disabled',
        },
      },
      spec: {
        bmc: {
          address: values.bmcAddress,
          credentialsName: secretRes.metadata.name,
          disableCertificateVerification: !!values.disableCertificateVerification,
        },
        bootMACAddress: values.bootMACAddress,
        description: '', // TODO(mlibra)
        online: !!values.online,
        automatedCleaningMode: 'disabled',
      },
    };

    return k8sCreate(BareMetalHostModel, bmh);
  };

  return <AIAddBmcModal {...addBmcDialog} {...addBmcDialog.data} onCreate={onCreate} />;
};

export default DownloadIsoModal;
