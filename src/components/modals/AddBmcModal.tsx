import * as React from 'react';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk/api';
import { AddBmcModal as AIAddBmcModal, AddBmcValues } from 'openshift-assisted-ui-lib';
import { BareMetalHostKind, SecretKind } from 'openshift-assisted-ui-lib/dist/src/cim';
import { BareMetalHostModel, SecretModel } from '../../models';
import { getBareMetalHost, getBareMetalHostCredentialsSecret } from '../../k8s';
import { useModalDialogsContext } from './ModalContext';

const DownloadIsoModal: React.FC<{ namespace: string }> = ({ namespace }) => {
  const { addBmcDialog } = useModalDialogsContext();

  const onCreate = async (values: AddBmcValues) => {
    const secret: SecretKind = getBareMetalHostCredentialsSecret(values, namespace);
    const secretRes = await k8sCreate(SecretModel, secret);
    const bmh: BareMetalHostKind = getBareMetalHost(values, namespace, secretRes.metadata.name);
    return k8sCreate(BareMetalHostModel, bmh);
  };

  return <AIAddBmcModal {...addBmcDialog} {...addBmcDialog.data} onCreate={onCreate} />;
};

export default DownloadIsoModal;
