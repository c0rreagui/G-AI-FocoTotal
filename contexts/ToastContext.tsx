import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'default';

interface ToastAction {
    label: string;
    onClick: () => void;
}

interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
    action?: ToastAction;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const Toast: React.FC<{ toast: ToastMessage; onRemove: (id: number) => void }> = ({ toast, onRemove }) => {
    React.useEffect(() => {
        // Apenas toasts sem ações desaparecem sozinhos
        if (!toast.action) {
            const timer = setTimeout(() => {
                onRemove(toast.id);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [toast, onRemove]);

    const handleActionClick = () => {
        toast.action?.onClick();
        onRemove(toast.id);
    };

    const typeClass = {
        success: 'success',
        error: 'error',
        default: ''
    }[toast.type];

    return (
        <div 
            className={`toast show ${typeClass}`} 
            role="alert" 
            aria-live={toast.action ? "off" : "assertive"}
        >
            <div className="toast-content">{toast.message}</div>
            {toast.action && (
                <div className="toast-actions">
                    <button className="btn btn-secondary toast-action-btn" onClick={handleActionClick}>
                        {toast.action.label}
                    </button>
                    <button className="icon-btn" onClick={() => onRemove(toast.id)} aria-label="Fechar notificação">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
            )}
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: number) => void }> = ({ toasts, removeToast }) => {
    const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

    React.useEffect(() => {
        let node = document.getElementById('toast-container');
        if (!node) {
            node = document.createElement('div');
            node.id = 'toast-container';
            document.body.appendChild(node);
        }
        setPortalNode(node);
    }, []);

    if (!portalNode) return null;

    return createPortal(
        <>
            {toasts.map((toast) => (
                <Toast key={toast.id} toast={toast} onRemove={removeToast} />
            ))}
        </>,
        portalNode
    );
};


export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const removeToast = useCallback((id: number) => {
        setToasts(prevToasts => prevToasts.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'default', action?: ToastAction) => {
        const id = Date.now();
        const newToast: ToastMessage = { id, message, type, action };
        setToasts(prevToasts => [newToast, ...prevToasts]);
    }, []);
    
    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};