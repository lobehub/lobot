'use client';

import { Icon, Text } from '@lobehub/ui';
import { Form } from '@lobehub/ui/form';
import { cssVar } from '@lobehub/ui/stylex/cssVar.stylex';
import { ChevronRightIcon } from 'lucide-react';
import { type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router';

import { openSettingsFromUrl } from '@/features/NavRail/settingsPopupStore';
import { SettingsSearchAnchor } from '@/features/SettingsSearch/anchor';
import { useWorkspaceAwareNavigate } from '@/features/Workspace/useWorkspaceAwareNavigate';
import { isModifierClick } from '@/utils/navigation';

const rowStyle: CSSProperties = {
  color: 'inherit',
  cursor: 'pointer',
  display: 'block',
  textDecoration: 'none',
};

interface FormNavFieldProps {
  anchor?: string;
  children?: ReactNode;
  desc?: ReactNode;
  divider?: boolean;
  label: string;
  to: string;
}

/**
 * A settings row that opens a sub page: official Form.Field layout, with the
 * trailing chevron and navigation behavior of the previous inset rows.
 * The whole row (including the space between label and chevron) is a single
 * link — no nested links or buttons.
 */
const FormNavField = ({ anchor, children, desc, divider, label, to }: FormNavFieldProps) => {
  const navigate = useWorkspaceAwareNavigate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifierClick(event)) return;
    event.preventDefault();
    if (openSettingsFromUrl(to)) return;
    navigate(to, { escape: true });
  };

  const labelNode = (
    <Text>{anchor ? <SettingsSearchAnchor id={anchor}>{label}</SettingsSearchAnchor> : label}</Text>
  );

  return (
    <Link style={rowStyle} to={to} onClick={handleClick}>
      <Form.Field desc={desc} divider={divider} label={labelNode} minWidth={undefined}>
        {children}
        <Icon color={cssVar.colorTextQuaternary} icon={ChevronRightIcon} size={16} />
      </Form.Field>
    </Link>
  );
};

export default FormNavField;
