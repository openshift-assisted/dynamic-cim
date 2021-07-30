import _ from 'lodash';
import { K8sPatch } from 'openshift-assisted-ui-lib/dist/src/cim';

export const appendPatch = (
  patches: K8sPatch,
  path: string,
  newVal: object | string | undefined,
  existingVal?: object | string,
) => {
  if (!_.isEqual(newVal, existingVal)) {
    patches.push({
      op: existingVal ? 'replace' : 'add',
      path,
      value: newVal || '',
    });
  }
};
