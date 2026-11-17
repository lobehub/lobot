import chroma from 'chroma-js';

/** Returns true only for parseable colors whose alpha channel is fully transparent. */
export const isFullyTransparentColor = (color: string): boolean =>
  chroma.valid(color) && chroma(color).alpha() === 0;
