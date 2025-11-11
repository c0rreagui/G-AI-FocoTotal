import React, { forwardRef } from 'react';

interface FloatingActionButtonProps {
    onClick: () => void;
}

const FloatingActionButton = forwardRef<HTMLButtonElement, FloatingActionButtonProps>(({ onClick }, ref) => {
    return (
        <button className="fab" onClick={onClick} aria-label="Adicionar nova tarefa" ref={ref}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
        </button>
    );
});

FloatingActionButton.displayName = 'FloatingActionButton';

export default FloatingActionButton;