import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  name: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * One failing pass should not take the record down with it.
 *
 * Canvas work touches a lot of browser surface area — device pixel ratios,
 * pointer capture, offscreen contexts — so each pass is wrapped and a failure
 * is contained to that pass, with a route back to the rest of the site.
 */
export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`Pass "${this.props.name}" failed`, error, info.componentStack);
  }

  override componentDidUpdate(prev: Props): void {
    if (prev.name !== this.props.name && this.state.error) this.setState({ error: null });
  }

  override render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="act act--pad" role="alert">
        <h2 className="h-act">
          <span className="h-act__n">!!</span> {this.props.name} could not be drawn
        </h2>
        <p className="h-act__sub">
          Something in this pass hit an error your browser would not recover from. The other
          six are unaffected — use the index to carry on.
        </p>
        <p className="fine">{this.state.error.message}</p>
      </div>
    );
  }
}
