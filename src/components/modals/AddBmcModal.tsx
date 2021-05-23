import * as React from 'react';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk/api';
import {
  AddBmcModal as AIAddBmcModal,
  AddBmcValues,
  getBareMetalHostCredentialsSecret,
  getBareMetalHost,
} from 'openshift-assisted-ui-lib';
import { useModalDialogsContext } from './ModalContext';
import { BareMetalHostModel, SecretModel } from '../../models';
import { BareMetalHostKind, SecretKind } from '../types';

const DownloadIsoModal: React.FC<{ namespace: string }> = ({ namespace }) => {
  const { addBmcDialog } = useModalDialogsContext();

  const onCreate = async (values: AddBmcValues) => {
    const secret: SecretKind = getBareMetalHostCredentialsSecret(values, namespace, SecretModel);
    const secretRes = await k8sCreate(SecretModel, secret);
    const bmh: BareMetalHostKind = getBareMetalHost(
      values,
      namespace,
      secretRes.metadata.name,
      BareMetalHostModel,
    );
    return k8sCreate(BareMetalHostModel, bmh);
  };

  return <AIAddBmcModal {...addBmcDialog} {...addBmcDialog.data} onCreate={onCreate} />;
};

export default DownloadIsoModal;
