import * as React from 'react';

import { CIM } from 'openshift-assisted-ui-lib';
import { useModalDialogsContext } from './ModalContext';

const { DownloadIsoModal: AIDownloadIsoModal } = CIM;

const DownloadIsoModal: React.FC = () => {
  const { downloadIsoDialog } = useModalDialogsContext();
  return (
    <AIDownloadIsoModal
      isOpen={downloadIsoDialog.isOpen}
      onClose={downloadIsoDialog.onClose}
      {...downloadIsoDialog.data}
    />
  );
};

export default DownloadIsoModal;
