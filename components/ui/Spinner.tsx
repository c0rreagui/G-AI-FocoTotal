import React from 'react';

interface SpinnerProps {
    label?: string;
    size?: 'sm' | 'md' | 'lg';
}

const Spinner: React.FC<SpinnerProps> = ({ label = 'Carregando', size = 'md' }) => {
    const sizeClasses = {
        sm: 'spinner-sm',
        md: 'spinner-md',
        lg: 'spinner-lg'
    };
    return (
        <div className={`spinner-container ${sizeClasses[size]}`} role="status">
            <div className="spinner-path"></div>
            <span className="sr-only">{label}</span>
        </div>
    );
};

export default Spinner;