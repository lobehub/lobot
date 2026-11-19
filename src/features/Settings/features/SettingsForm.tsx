'use client';

import { Flexbox, Text } from '@lobehub/ui';
import { Surface } from '@lobehub/ui/dashboard';
import {
  Form,
  type FormFieldProps,
  type FormGroupItem,
  type FormProps,
  type FormValues,
} from '@lobehub/ui/form';
import { type CSSProperties, type ReactNode } from 'react';

const SURFACE_CARD_STYLE: CSSProperties = {
  background: 'color-mix(in srgb, var(--lobe-color-text) 8%, var(--lobe-color-bg-container))',
  minWidth: 0,
  overflow: 'visible',
  overflowX: 'visible',
  overflowY: 'visible',
};

const SURFACE_BODY_STYLE: CSSProperties = {
  minWidth: 0,
  paddingBlock: 8,
  paddingInline: 16,
};

interface SettingsSurfaceGroupProps {
  children: ReactNode;
  desc?: ReactNode;
  extra?: ReactNode;
  style?: CSSProperties;
  title?: ReactNode;
}

/**
 * A settings block in the Grok-style layout: an optional caption above a
 * Surface card that holds the fields.
 */
export const SettingsSurfaceGroup = ({
  children,
  desc,
  extra,
  style,
  title,
}: SettingsSurfaceGroupProps) => {
  const hasCaption = title != null && title !== false && title !== '';

  return (
    <Flexbox gap={6} style={style}>
      {(hasCaption || desc || extra) && (
        <Flexbox horizontal align={'center'} gap={8} style={{ paddingInline: 2 }}>
          <Flexbox flex={1} gap={2}>
            {hasCaption && (
              <Text fontSize={12} type={'secondary'} weight={500}>
                {title}
              </Text>
            )}
            {desc != null && desc !== false && (
              <Text fontSize={12} type={'secondary'}>
                {desc}
              </Text>
            )}
          </Flexbox>
          {extra}
        </Flexbox>
      )}
      <Surface padded={false} style={SURFACE_CARD_STYLE}>
        <div style={SURFACE_BODY_STYLE}>
          <Form.Group collapsible={false} variant={'borderless'}>
            {children}
          </Form.Group>
        </div>
      </Surface>
    </Flexbox>
  );
};

/**
 * Drop-in for `@lobehub/ui/form` `Form` when `itemsType="group"`: each group
 * becomes a Surface card with its title above the card.
 */
function SettingsForm<T extends FormValues>({
  children,
  gap = 20,
  itemMinWidth,
  items,
  itemsType,
  variant = 'borderless',
  ...rest
}: FormProps<T>) {
  const groups = itemsType === 'group' ? (items as FormGroupItem<T>[] | undefined) : undefined;
  // Popup columns are narrow; FORM_STYLE's 240px control min-width overflows
  // the card and gets clipped. Use a shrinkable min-width so sliders still have a track.
  const resolvedMinWidth =
    itemMinWidth === 'max(34%, 240px)' || itemMinWidth === undefined
      ? 'min(48%, 200px)'
      : itemMinWidth;

  if (groups?.length) {
    return (
      <Form gap={gap} itemMinWidth={resolvedMinWidth} variant={'borderless'} {...rest}>
        {groups.map((group, index) => (
          <SettingsSurfaceGroup
            desc={group.desc}
            extra={group.extra}
            key={group.key ?? index}
            title={group.title}
          >
            {Array.isArray(group.children)
              ? (group.children as FormFieldProps<T>[]).map((field, fieldIndex) =>
                  field.hidden ? null : (
                    <Form.Field key={String(field.name ?? fieldIndex)} {...field} />
                  ),
                )
              : group.children}
          </SettingsSurfaceGroup>
        ))}
        {children}
      </Form>
    );
  }

  return (
    <Form
      gap={gap}
      itemMinWidth={resolvedMinWidth}
      items={items}
      itemsType={itemsType}
      variant={variant}
      {...rest}
    >
      {children}
    </Form>
  );
}

export default SettingsForm;
