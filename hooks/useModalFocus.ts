import { useEffect, RefObject } from 'react';

export const useModalFocus = (
    isOpen: boolean,
    modalRef: RefObject<HTMLElement>,
    initialFocusRef: RefObject<HTMLElement>,
    onClose: () => void,
    triggerElement?: HTMLElement | null
) => {
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => initialFocusRef.current?.focus(), 100);

            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }

                if (e.key === 'Tab' && modalRef.current) {
                    const focusableElements = Array.from(
                        modalRef.current.querySelectorAll(
                            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                        )
                    ) as HTMLElement[];
                    
                    if(focusableElements.length === 0) return;

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
        } else if (triggerElement && document.body.contains(triggerElement)) {
            // Robustness: Only focus if the element is still in the DOM
            triggerElement.focus();
        }
    }, [isOpen, modalRef, initialFocusRef, onClose, triggerElement]);
};
