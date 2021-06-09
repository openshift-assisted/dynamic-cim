import { Button, Grid, GridItem, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { k8sPatch, useK8sModel, useK8sWatchResource} from '@openshift-console/dynamic-plugin-sdk/api';
import { AgentClusterInstallKind } from '../../kind';
import { InfraEnv, AgentClusterInstallK8sResource } from '../types';

type InfraPatchTabProps = {
  obj: InfraEnv;
}

// temporary, to be removed
const InfraPatchTab: React.FC<InfraPatchTabProps> = ({ obj }) => {
  const [agentClusterInstallModel] = useK8sModel(AgentClusterInstallKind);

  const [aci] = useK8sWatchResource<AgentClusterInstallK8sResource>({
    kind: AgentClusterInstallKind,
    name: obj.metadata.name,
    namespace: obj.metadata.namespace,
    namespaced: true,
  });

  const [api, setAPI] = React.useState<string>();
  const [ingress, setIngress] = React.useState<string>();
  const [done, setDone] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  return (
    <>
      <div>Connectivity: {aci?.status?.connectivityMajorityGroups || 'none'}</div>
      <Grid hasGutter>
        <GridItem span={8}>
          API VIP
          <TextInput value={api} type="text" onChange={setAPI} />
        </GridItem>
        <GridItem span={8}>
          ingress VIP
          <TextInput value={ingress} type="text" onChange={setIngress} />
        </GridItem>
        <GridItem span={8}>
          {done && 'Done!'} 
          <Button isDisabled={loading || done} onClick={async () => {
            setLoading(true);
            try{
              await k8sPatch(agentClusterInstallModel, aci, [
                {
                  op: 'add',
                  path: `/spec/apiVIP`,
                  value: api,
                },
                {
                  op: 'add',
                  path: `/spec/ingressVIP`,
                  value: ingress,
                },
              ]);
              setDone(true);
            } catch(e) {
              console.log(e);
            } finally {
              setLoading(false);
            }
          }}>Patch</Button>
        </GridItem>
      </Grid>
    </>
  )
};

export default InfraPatchTab;