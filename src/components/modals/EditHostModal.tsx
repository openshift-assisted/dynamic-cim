import * as React from 'react';

import { EditHostModal as AIEditHostModal } from 'openshift-assisted-ui-lib';
import { useModalDialogsContext } from './ModalContext';

const EditHostModal: React.FC = () => {
  const { editHostModal } = useModalDialogsContext();
  return (
    <AIEditHostModal
      isOpen={editHostModal.isOpen}
      onClose={editHostModal.onClose}
      {...editHostModal.data}
    />
  );
};

export default EditHostModal;
