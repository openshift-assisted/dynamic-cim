import * as React from 'react';
import { match as RMatch } from 'react-router-dom';
import { K8sKind } from '@openshift-console/dynamic-plugin-sdk/lib/api/common-types';
import { DetailsPage } from '@openshift-console/dynamic-plugin-sdk';
import { CIM } from 'openshift-assisted-ui-lib';
import AgentTable from '../Agent/AgentTable';
import {
  ModalDialogsContextProvider,
  useModalDialogsContext,
  ModalDialogsContextType,
  DownloadIsoModal,
} from '../modals';
import InfraDetailsTab from './InfraDetailsTab';
import { InfraEnvKind } from '../../kind';

import '../styles.scss';

type InfraEnvDetailsProps = {
  match: RMatch;
  namespace: string;
  name: string;
};

const addHostAction =
  (open: ModalDialogsContextType['downloadIsoDialog']['open']): CIM.KebabAction =>
  (kind: K8sKind, obj: CIM.InfraEnvK8sResource) => {
    const isoDownloadURL = obj?.status?.isoDownloadURL;
    return {
      label: 'Add Host',
      hidden: !isoDownloadURL,
      callback: () =>
        open({
          fileName: `discovery_image_${obj.metadata?.name}.iso`,
          downloadUrl: isoDownloadURL || '',
        }),
    };
  };

const InfraEnvDetails: React.FC<InfraEnvDetailsProps> = ({ name, namespace, ...rest }) => {
  const { downloadIsoDialog } = useModalDialogsContext();

  const menuActions = [addHostAction(downloadIsoDialog.open)];
  return (
    <>
      <DetailsPage
        {...rest}
        kind={InfraEnvKind}
        name={name}
        namespace={namespace}
        menuActions={menuActions}
        pages={[
          {
            href: '',
            nameKey: 'Details',
            // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
            // @ts-ignore
            component: InfraDetailsTab,
          },
          {
            href: 'hosts',
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
