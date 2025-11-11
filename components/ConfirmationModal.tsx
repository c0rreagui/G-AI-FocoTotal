import React, { useEffect, useRef } from 'react';
import { useModalFocus } from '../hooks/useModalFocus';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Excluir' }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const confirmButtonRef = useRef<HTMLButtonElement>(null); 
    
    useModalFocus(isOpen, modalRef, confirmButtonRef, onClose);
    
    if (!isOpen) return null;

    return (
        <div className="modal-overlay show" onMouseDown={onClose}>
            <div className="modal-content" onMouseDown={(e) => e.stopPropagation()} ref={modalRef}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar modal">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                     <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button type="button" className="btn btn-danger" onClick={onConfirm} ref={confirmButtonRef}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;