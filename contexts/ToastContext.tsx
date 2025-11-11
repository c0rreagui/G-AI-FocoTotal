import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ToastType = 'success' | 'error' | 'default';

interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

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
                <div 
                    key={toast.id} 
                    className={`toast show ${toast.type === 'success' ? 'success' : ''}`} 
                    role="alert" 
                    aria-live="assertive"
                >
                    {toast.message}
                </div>
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

    const showToast = useCallback((message: string, type: ToastType = 'default') => {
        const id = Date.now();
        const newToast: ToastMessage = { id, message, type };
        setToasts(prevToasts => [...prevToasts, newToast]);

        setTimeout(() => {
            removeToast(id);
        }, 3000);
    }, [removeToast]);
    
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
