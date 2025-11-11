import React, { useState, useEffect, useRef } from 'react';
import { DEV_PIN } from '../constants';

interface PinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PinModal: React.FC<PinModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [pin, setPin] = useState('');
    const [isError, setIsError] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            setPin('');
            setIsError(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (pin.length === 4) {
            if (pin === DEV_PIN) {
                onSuccess();
            } else {
                setIsError(true);
                setTimeout(() => {
                    setIsError(false);
                    setPin('');
                }, 500);
            }
        }
    }, [pin, onSuccess]);

    const handleKeyClick = (key: string) => {
        if (pin.length < 4) {
            setPin(p => p + key);
        }
    };

    const handleDelete = () => {
        setPin(p => p.slice(0, -1));
    };

    const keypadLayout = [
        '1', '2', '3',
        '4', '5', '6',
        '7', '8', '9',
        '', '0', '⌫'
    ];

    if (!isOpen) return null;

    return (
        <div className="modal-overlay show" onMouseDown={onClose}>
            <div className="modal-content pin-modal-content" onMouseDown={(e) => e.stopPropagation()} ref={modalRef}>
                <h3>Acesso Restrito</h3>
                <p>Digite o PIN de desenvolvedor.</p>
                <div className={`pin-dots-container ${isError ? 'shake' : ''}`}>
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className={`pin-dot ${pin.length > i ? 'filled' : ''}`}></div>
                    ))}
                </div>
                <div className="pin-keypad">
                    {keypadLayout.map((key, index) => {
                        if (key === '') {
                            return <div key={index}></div>;
                        }
                        return (
                            <button
                                key={index}
                                className={`pin-key ${key === '⌫' ? 'utility' : ''}`}
                                onClick={() => key === '⌫' ? handleDelete() : handleKeyClick(key)}
                            >
                                {key}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PinModal;