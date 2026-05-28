import { Component } from 'react';

export default class FeatureErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('FeatureErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="feature-error">
          <span>⚠️</span>
          <span>{this.props.fallback || 'תכונה זו אינה זמינה כרגע'}</span>
        </div>
      );
    }
    return this.props.children;
  }
}
