import * as React from 'react';
import { match as RMatch } from 'react-router-dom';
import { DetailsPage, K8sKind } from '@openshift-console/dynamic-plugin-sdk/api';
import AgentTable from '../Agent/AgentTable';
import { InfraEnv, KebabAction } from '../types';
import {} from 'openshift-assisted-ui-lib';
import {
  ModalDialogsContextProvider,
  useModalDialogsContext,
  DownloadIsoModal,
  ModalDialogsContextType,
} from '../modals';

import '../styles.scss';

type InfraEnvDetailsProps = {
  match: RMatch;
};

const addHostAction =
  (open: ModalDialogsContextType['downloadIsoDialog']['open']): KebabAction =>
  (kind: K8sKind, obj: InfraEnv, resources: {}) => {
    const isoDownloadURL = obj?.status?.isoDownloadURL;
    return {
      label: 'Add Host',
      hidden: !isoDownloadURL,
      callback: () =>
        open({ fileName: `discovery_image_${obj.metadata.name}.iso`, downloadUrl: isoDownloadURL }),
    };
  };

const InfraEnvDetails: React.FC<InfraEnvDetailsProps> = (props) => {
  const { downloadIsoDialog } = useModalDialogsContext();

  const menuActions = [addHostAction(downloadIsoDialog.open)];

  return (
    <>
      <DetailsPage
        {...props}
        kind="agent-install.openshift.io~v1beta1~InfraEnv"
        name="cluster-crd-tj4"
        namespace="assisted-installer"
        menuActions={menuActions}
        pages={[
          {
            href: '',
            nameKey: 'Hosts',
            component: AgentTable,
          },
        ]}
      />
      <DownloadIsoModal />
    </>
  );
};

export default (props: InfraEnvDetailsProps) => (
  <ModalDialogsContextProvider>
    <InfraEnvDetails {...props} />
  </ModalDialogsContextProvider>
);
