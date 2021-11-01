import { Label, LabelGroup } from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
} from '@patternfly/react-icons';
import * as React from 'react';

type InlineStatusGroupProps = {
  healthy?: number;
  danger?: number;
  warning?: number;
};

const InlineStatusGroup: React.FC<InlineStatusGroupProps> = ({ healthy, danger, warning }) => (
  <LabelGroup defaultIsOpen isClosable={false} numLabels={10}>
    {healthy !== undefined && (
      <Label color="green" icon={<CheckCircleIcon />}>
        {healthy}
      </Label>
    )}
    {warning !== undefined && (
      <Label color="orange" icon={<ExclamationTriangleIcon />}>
        {warning}
      </Label>
    )}
    {danger !== undefined && (
      <Label color="red" icon={<ExclamationCircleIcon />}>
        {danger}
      </Label>
    )}
  </LabelGroup>
);

export default InlineStatusGroup;
