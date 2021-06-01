// strValues: array of 'key=value' items
export const parseStringLabels = (strValues) => {
  const labels = strValues.reduce((acc, curr) => {
    const label = curr.split('=');
    acc[label[0]] = label[1];
    return acc;
  }, {});
  return labels;
};
