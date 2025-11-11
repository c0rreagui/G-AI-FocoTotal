import React from 'react';

interface FloatingActionButtonProps {
    onClick: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => {
    return (
        <button className="fab" onClick={onClick} aria-label="Adicionar nova tarefa">
            +
        </button>
    );
};

export default FloatingActionButton;