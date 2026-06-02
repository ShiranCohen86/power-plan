import { Component } from 'react';
import { logError } from '../../api/logger.js';

export default class FeatureErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logError('FeatureErrorBoundary', 'caught', { error, info });
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
