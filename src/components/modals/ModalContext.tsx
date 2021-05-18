import * as React from 'react';
import { Reducers } from 'openshift-assisted-ui-lib';

const {
  dialogsReducer,
  openDialog: openDialogAction,
  closeDialog: closeDialogAction,
} = Reducers.Dialogs;

type DialogId = 'downloadIsoDialog'; // TODO: list additional dialogs here

type DownloadIsoDialogProps = {
  fileName: string;
  downloadUrl: string;
};

type ModalDialogsDataTypes = {
  downloadIsoDialog: DownloadIsoDialogProps;
};

export type ModalDialogsContextType = {
  [key in DialogId]: {
    isOpen: boolean;
    open: (data: ModalDialogsDataTypes[key]) => void;
    onClose: () => void;
    data?: ModalDialogsDataTypes[key];
  };
};

const dialogIds: DialogId[] = ['downloadIsoDialog'];

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
