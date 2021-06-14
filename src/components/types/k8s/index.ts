export * from './infra-env';
export * from './cluster-deployment';
export * from './agent';
export * from './agent-cluster-install';

export type K8sPatch = {
  op: 'replace' | 'add';
  path: string;
  value: string;
}[];
