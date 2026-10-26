// [8] Error Boundary cho React: cô lập lỗi hiển thị ở từng thẻ/màn hình và cho phép xuất save cứu dữ liệu
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useUi } from '../context';

interface InnerProps {
  section?: string;
  children: ReactNode;
  titleText: string;
  descText: string;
  retryText: string;
  exportText: string;
  onExport?: () => void;
}

interface State {
  hasError: boolean;
  message: string;
}

class ErrorBoundaryInner extends Component<InnerProps, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[ErrorBoundary${this.props.section ? `:${this.props.section}` : ''}]`, error, info);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, message: '' });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <section className="card error-boundary-card" role="alert">
        <div className="card-head">
          <h3 className="down">{this.props.titleText}</h3>
          {this.props.section && <span className="muted small">{this.props.section}</span>}
        </div>
        <p className="muted small">{this.props.descText}</p>
        {this.state.message && <pre className="error-boundary-code">{this.state.message}</pre>}
        <div className="row">
          <button type="button" onClick={this.handleRetry}>
            {this.props.retryText}
          </button>
          {this.props.onExport && (
            <button type="button" onClick={this.props.onExport}>
              {this.props.exportText}
            </button>
          )}
        </div>
      </section>
    );
  }
}

export function ErrorBoundary({ section, children }: { section?: string; children: ReactNode }) {
  const { store, t } = useUi();
  const handleExport = () => {
    const json = store.exportSave();
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dong_doi_recovery_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <ErrorBoundaryInner
      section={section}
      titleText={t('error.ui_boundary_title')}
      descText={t('error.ui_boundary_desc')}
      retryText={t('error.ui_boundary_retry')}
      exportText={t('error.ui_boundary_export')}
      onExport={ handleExport }
    >
      {children}
    </ErrorBoundaryInner>
  );
}
