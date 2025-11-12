import React, { useEffect, useRef } from 'react';
import { useModalFocus } from '../hooks/useModalFocus';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    confirmClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText = 'Excluir',
    confirmClass = 'btn-danger'
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null); 
    
    useModalFocus(isOpen, modalRef, confirmButtonRef, onClose);
    
    const handleConfirm = () => {
        onConfirm();
        onClose();
    }
    
    if (!isOpen) return null;

    return (
        <div className="modal-overlay show" onMouseDown={onClose}>
            <div 
                className="modal-content" 
                onMouseDown={(e) => e.stopPropagation()} 
                ref={modalRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                aria-describedby="confirm-message"
            >
                <div className="modal-header">
                    <h2 id="confirm-title">{title}</h2>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar modal">
                         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div className="modal-body">
                    <p id="confirm-message">{message}</p>
                </div>
                <div className="modal-footer">
                     <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button type="button" className={`btn ${confirmClass}`} onClick={handleConfirm} ref={confirmButtonRef}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
