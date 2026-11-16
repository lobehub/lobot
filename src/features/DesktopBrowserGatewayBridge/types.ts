export const BrowserIdentifier = 'lobe-browser';

export interface BrowserNavigateArgs {
  url: string;
}

export interface BrowserClickArgs {
  ref?: string;
  x?: number;
  y?: number;
}

export interface BrowserFillArgs {
  ref: string;
  submit?: boolean;
  text: string;
}

export interface BrowserPressArgs {
  key: string;
}

export interface BrowserScrollArgs {
  dx?: number;
  dy: number;
}

export interface BrowserSetViewportArgs {
  height?: number;
  width?: number;
}
