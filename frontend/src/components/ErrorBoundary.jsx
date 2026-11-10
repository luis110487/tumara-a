import { Component } from 'react';

// Evita la pantalla en blanco: si una pantalla falla al dibujarse, se muestra un aviso con salida.
export class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Error de la aplicación:', error, info?.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const button = { minHeight: 46, padding: '0 22px', border: 0, borderRadius: 12, background: '#ffa800', color: '#092653', font: 'inherit', fontWeight: 700, cursor: 'pointer' };
    return (
      <main role="alert" style={{ fontFamily: 'Arial, sans-serif', color: '#092653', maxWidth: 420, margin: '0 auto', padding: '72px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, margin: '0 0 12px' }}>Algo salió mal</h1>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: '#4d6585', margin: '0 0 28px' }}>Tuvimos un problema al mostrar esta pantalla. Tus datos están a salvo. Intenta recargar.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" style={button} onClick={() => window.location.reload()}>Recargar</button>
          <a href="/" style={{ ...button, display: 'inline-flex', alignItems: 'center', background: '#e8eef7', textDecoration: 'none' }}>Ir al inicio</a>
        </div>
      </main>
    );
  }
}
