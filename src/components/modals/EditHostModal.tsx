import * as React from 'react';

import { CIM } from 'openshift-assisted-ui-lib';
import { useModalDialogsContext } from './ModalContext';
const { EditAgentModal } = CIM;

// eslint-disable-next-line
const onFormSaveError = () => {};

const EditHostModal: React.FC = () => {
  const { editHostModal } = useModalDialogsContext();
  return (
    <EditAgentModal
      isOpen={editHostModal.isOpen}
      onClose={editHostModal.onClose}
      {...editHostModal.data}
      onFormSaveError={onFormSaveError}
    />
  );
};

export default EditHostModal;
