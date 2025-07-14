import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import context providers
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; // Added for SCADA theme support

// Optional: Add error boundary for better error handling
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('🚨 Application Error:', error);
        console.error('🚨 Error Info:', errorInfo);
        this.setState({
            error: error,
            errorInfo: errorInfo
        });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '2rem',
                    textAlign: 'center',
                    fontFamily: 'Arial, sans-serif',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    margin: '2rem',
                    color: '#dc2626'
                }}>
                    <h2>🚨 SCADA Application Error</h2>
                    <p>Something went wrong with the SCADA interface.</p>
                    <details style={{ marginTop: '1rem', textAlign: 'left' }}>
                        <summary>Error Details</summary>
                        <pre style={{
                            background: '#f3f4f6',
                            padding: '1rem',
                            borderRadius: '4px',
                            overflow: 'auto',
                            fontSize: '0.875rem'
                        }}>
                            {this.state.error && this.state.error.toString()}
                            <br />
                            {this.state.errorInfo.componentStack}
                        </pre>
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

// Create root element
const root = ReactDOM.createRoot(document.getElementById('root'));

// Enhanced render with proper context providers and error handling
root.render(
    <React.StrictMode>
        <ErrorBoundary>
            <AuthProvider>
                <ThemeProvider>
                    <App />
                </ThemeProvider>
            </AuthProvider>
        </ErrorBoundary>
    </React.StrictMode>
);

// Enhanced web vitals reporting for SCADA performance monitoring
reportWebVitals((metric) => {
    // Log performance metrics for SCADA system monitoring
    console.log('📊 SCADA Performance Metric:', {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        timestamp: new Date().toISOString()
    });

    // Optional: Send to analytics or monitoring service
    if (process.env.NODE_ENV === 'production') {
        // You can send metrics to your monitoring service here
        // Example: analytics.track('performance', metric);
    }
});