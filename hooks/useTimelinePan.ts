// FIX: Added the default 'React' import to make the React namespace available for type annotations.
import React, { useState, useRef, RefObject } from 'react';

export const useTimelinePan = (containerRef: RefObject<HTMLDivElement>) => {
    const [isPanned, setIsPanned] = useState(false);
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const onMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!containerRef.current) return;
        // Don't pan if clicking on an interactive element inside
        const target = e.target as HTMLElement;
        if(target.closest('.timeline-event-card, button, input')) return;

        isDown.current = true;
        containerRef.current.classList.add('is-panning');
        startX.current = e.pageX - containerRef.current.offsetLeft;
        scrollLeft.current = containerRef.current.scrollLeft;
        setIsPanned(false);
    };

    const onMouseLeave = () => {
        isDown.current = false;
        containerRef.current?.classList.remove('is-panning');
    };

    const onMouseUp = () => {
        isDown.current = false;
        containerRef.current?.classList.remove('is-panning');
    };

    const onMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (!isDown.current || !containerRef.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const walk = (x - startX.current) * 2; // pan faster
        containerRef.current.scrollLeft = scrollLeft.current - walk;
        
        if (Math.abs(walk) > 10) { // threshold to detect a pan vs a click
            setIsPanned(true);
        }
    };
    
    // Wrapper for onClick to prevent firing on pan
    const onClickCapture = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (isPanned) {
            e.stopPropagation();
        }
    };

    return {
        containerProps: {
            onMouseDown,
            onMouseLeave,
            onMouseUp,
            onMouseMove,
            onClickCapture
        }
    };
};