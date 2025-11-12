import React, { ReactNode } from 'react';

interface TooltipProps {
    children: ReactNode;
    tip: ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ children, tip, position = 'bottom' }) => {
    return (
        <div className="tooltip-container">
            {children}
            <div className={`tooltip-content tooltip-${position}`} role="tooltip">
                {tip}
            </div>
        </div>
    );
};

export default Tooltip;