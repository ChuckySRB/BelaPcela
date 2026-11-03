import { Component, type ReactNode } from 'react';
import { BrandMark } from './BrandMark';

/** A render or lazy-module failure should leave a usable recovery screen. */
export class AppErrorBoundary extends Component<{ children: ReactNode; onReload?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="storage-loading"><BrandMark /><h1>БелаПчела</h1>
      <p role="alert">Приказ апликације није успео. Поново учитајте страницу да наставите. Несачуван унос може бити изгубљен.</p>
      <button className="button button--primary" onClick={() => this.props.onReload ? this.props.onReload() : window.location.reload()}>Поново учитај апликацију</button>
    </main>;
  }
}
