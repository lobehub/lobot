import type { RootOptions } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';

type BrowserRouterFactory = typeof createBrowserRouter;

interface SPARuntimeInstrumentation {
  createBrowserRouter?: BrowserRouterFactory;
  rootOptions?: RootOptions;
}

const runtimeInstrumentation: SPARuntimeInstrumentation = {};

export const createSPABrowserRouter = (...args: Parameters<BrowserRouterFactory>) =>
  (runtimeInstrumentation.createBrowserRouter ?? createBrowserRouter)(...args);

export const createSPARoot = (container: Parameters<typeof createRoot>[0]) =>
  createRoot(container, runtimeInstrumentation.rootOptions);
