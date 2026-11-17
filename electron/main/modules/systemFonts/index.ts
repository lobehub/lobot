export interface DetailedSystemFont {
  familyName: string;
  monospace: boolean;
  name: string;
}

/** Every installed font face, read through `font-list` (system font tools per OS). */
export const listSystemFonts = async (): Promise<DetailedSystemFont[]> => {
  const { getFonts2 } = await import('font-list');
  return getFonts2();
};
