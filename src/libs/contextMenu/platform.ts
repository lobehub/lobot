type LobeEnv = NonNullable<Window['lobeEnv']>;

const getLobeEnv = (): LobeEnv | undefined => window.lobeEnv;

export const isDarwinDesktop = (): boolean => getLobeEnv()?.platform === 'darwin';
