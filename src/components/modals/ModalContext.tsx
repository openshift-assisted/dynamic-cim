import * as React from 'react';
import { CIM } from 'openshift-assisted-ui-lib';
import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';

const {
  reducer: dialogsReducer,
  actions: { openDialog: openDialogAction, closeDialog: closeDialogAction },
} = CIM.Reducers.dialogsSlice;

type DialogId = 'downloadIsoDialog' | 'addBmcDialog' | 'editHostModal';

type DownloadIsoDialogProps = {
  fileName: string;
  downloadUrl: string;
};

type AddBmcDialogProps = {};

export type EditHostModal = {
  agent: K8sResourceCommon;
  usedHostnames: string[] | undefined;
  onSave: (agent: K8sResourceCommon, hostname: string) => Promise<any>;
};

type ModalDialogsDataTypes = {
  downloadIsoDialog: DownloadIsoDialogProps;
  addBmcDialog: AddBmcDialogProps;
  editHostModal: EditHostModal;
};

export type ModalDialogsContextType = {
  [key in DialogId]: {
    isOpen: boolean;
    open: (data: ModalDialogsDataTypes[key]) => void;
    onClose: () => void;
    data?: ModalDialogsDataTypes[key];
  };
};

const dialogIds: DialogId[] = ['downloadIsoDialog', 'addBmcDialog', 'editHostModal'];

const ModalDialogsContext = React.createContext<ModalDialogsContextType | undefined>(undefined);

// Simplify common modal-related - isOpen, onClose and passing params
const ModalDialogsContextProvider: React.FC = ({ children }) => {
  const [dialogsState, dispatchDialogsAction] = React.useReducer(dialogsReducer, {});

  function getOpenDialog<DataType>(dialogId: string) {
    return (data: DataType) => dispatchDialogsAction(openDialogAction({ dialogId, data }));
  }

  const getCloseDialog = (dialogId: string) => () =>
    dispatchDialogsAction(closeDialogAction({ dialogId }));

  const context = dialogIds.reduce((context, dialogId) => {
    context[dialogId] = {
      isOpen: !!dialogsState[dialogId],
      open: (data: ModalDialogsDataTypes[typeof dialogId]) =>
        getOpenDialog<ModalDialogsDataTypes[typeof dialogId]>(dialogId)(data),
      onClose: () => getCloseDialog(dialogId)(),
      data: dialogsState[dialogId],
    };
    return context;
  }, {});

  return (
    <ModalDialogsContext.Provider value={context as ModalDialogsContextType}>
      {children}
    </ModalDialogsContext.Provider>
  );
};

const useModalDialogsContext = () => {
  const context = React.useContext(ModalDialogsContext);
  if (context === undefined) {
    throw new Error(
      'dynamic-cim: useModalDialogsContext must be used within a ModalDialogsContextProvider',
    );
  }
  return context;
};

export { ModalDialogsContextProvider, useModalDialogsContext };
