import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportUnhandledError } from '../lib/errorReporter'

interface Props {
  children: ReactNode
  title: string
  retryLabel: string
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportUnhandledError(error, { componentStack: info.componentStack ?? undefined })
  }

  private handleRetry = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
        <div className="card max-w-lg w-full text-center space-y-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{this.props.title}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 break-words">{error.message}</p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
          >
            {this.props.retryLabel}
          </button>
        </div>
      </div>
    )
  }
}
