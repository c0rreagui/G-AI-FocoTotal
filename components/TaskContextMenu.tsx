import React, { useRef, useEffect } from 'react';

interface TaskContextMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
}

const TaskContextMenu: React.FC<TaskContextMenuProps> = ({ isOpen, onClose, onEdit, onDelete, triggerRef }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
                triggerRef.current?.focus();
            }
            if (e.key === 'Tab' && menuRef.current) {
                const focusableElements = Array.from(
                    menuRef.current.querySelectorAll('button')
                ) as HTMLElement[];

                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) { // Shift + Tab
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);

    }, [isOpen, onClose, triggerRef]);
    
    useEffect(() => {
        if (isOpen) {
            // Focar o primeiro item quando o menu abrir
            (menuRef.current?.querySelector('button') as HTMLElement)?.focus();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="context-menu" ref={menuRef} role="menu" aria-orientation="vertical">
            <button className="context-menu-item" role="menuitem" onClick={onEdit}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                Editar
            </button>
            <button className="context-menu-item is-danger" role="menuitem" onClick={onDelete}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                Excluir
            </button>
        </div>
    );
};

export default TaskContextMenu;
