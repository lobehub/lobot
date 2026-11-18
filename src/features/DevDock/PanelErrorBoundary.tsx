import { Component, type PropsWithChildren } from 'react';

interface PanelErrorBoundaryState {
  error?: Error;
}

class PanelErrorBoundary extends Component<PropsWithChildren, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = {};
}

export default PanelErrorBoundary;
