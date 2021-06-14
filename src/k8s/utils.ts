import { K8sPatch } from '../components/types';

// strValues: array of 'key=value' items
export const parseStringLabels = (strValues) => {
  const labels = strValues.reduce((acc, curr) => {
    const label = curr.split('=');
    acc[label[0]] = label[1];
    return acc;
  }, {});
  return labels;
};

export const appendPatch = (
  patches: K8sPatch,
  path: string,
  newVal: string,
  existingVal?: string,
) => {
  if (newVal !== existingVal) {
    patches.push({
      op: existingVal ? 'replace' : 'add',
      path,
      value: newVal,
    });
  }
};
