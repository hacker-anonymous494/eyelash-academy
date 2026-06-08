import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#fff6f9] p-4">
          <div className="max-w-md w-full rounded-3xl border border-pink-200 bg-white/90 p-8 shadow-2xl shadow-pink-200/30 text-center">
            <h1 className="text-2xl font-semibold text-[#8b1a36] mb-3">Something went wrong</h1>
            <p className="text-sm text-[#5a2030]">{this.state.error?.message}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
