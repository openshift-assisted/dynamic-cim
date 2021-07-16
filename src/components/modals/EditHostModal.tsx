import * as React from 'react';

import { CIM } from 'openshift-assisted-ui-lib';
import { useModalDialogsContext } from './ModalContext';

const { EditHostModal: AIEditHostModal } = CIM;

const EditHostModal: React.FC = () => {
  const { editHostModal } = useModalDialogsContext();
  return (
    <AIEditHostModal
      isOpen={editHostModal.isOpen}
      onClose={editHostModal.onClose}
      {...editHostModal.data}
      onFormSaveError={editHostModal.data?.onSave}
    />
  );
};

export default EditHostModal;
