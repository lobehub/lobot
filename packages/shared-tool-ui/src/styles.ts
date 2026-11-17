import { createStaticStyles, cx, textStyles } from '@lobehub/ui';

/**
 * Shiny loading text animation, toned down to the secondary text color so a
 * shimmering label sits at the same visual weight as the static text next to it.
 */
const shinyToneStyles = createStaticStyles(({ css, cssVar }) => ({
  secondary: css`
    /* The upstream rest color is a 28% mix of --shiny-color, which reads far
     * weaker than the static labels next to it. Pin the rest color to the
     * neighbouring text color and let the sweep peak at full colorText. */
    &&& {
      --shiny-color: ${cssVar.colorText};

      color: ${cssVar.colorTextSecondary};
    }
  `,
}));

export const shinyTextStyles = {
  shinyText: cx(textStyles.shiny, shinyToneStyles.secondary),
};
