import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task } from '../types';

interface useTimelineDnDProps {
    onUpdateTask: (task: Partial<Task> & {id: string}) => Promise<void>;
}

export const useTimelineDnD = ({ onUpdateTask }: useTimelineDnDProps) => {
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const pointerDownTaskRef = useRef<{ task: Task, pointerId: number, element: HTMLElement, initialX: number, initialY: number } | null>(null);
    const ghostRef = useRef<HTMLDivElement | null>(null);
    const placeholderRef = useRef<HTMLDivElement | null>(null);

    const createGhostElement = (originalElement: HTMLElement) => {
        const rect = originalElement.getBoundingClientRect();
        const ghost = originalElement.cloneNode(true) as HTMLDivElement;
        ghost.style.position = 'fixed';
        ghost.style.top = `${rect.top}px`;
        ghost.style.left = `${rect.left}px`;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.8';
        ghost.style.zIndex = '1002';
        ghost.style.transform = 'rotate(3deg)';
        document.body.appendChild(ghost);
        ghostRef.current = ghost;
    };
    
    const createPlaceholder = (originalElement: HTMLElement) => {
        const placeholder = document.createElement('div');
        placeholder.className = 'timeline-drop-placeholder';
        const rect = originalElement.getBoundingClientRect();
        placeholder.style.position = 'fixed';
        placeholder.style.width = `${rect.width}px`;
        placeholder.style.height = `${rect.height}px`;
        placeholder.style.zIndex = '1001';
        document.body.appendChild(placeholder);
        placeholderRef.current = placeholder;
    }

    const cleanupDrag = useCallback(() => {
        setDraggingTaskId(null);
        pointerDownTaskRef.current = null;
        if (ghostRef.current) {
            document.body.removeChild(ghostRef.current);
            ghostRef.current = null;
        }
        if (placeholderRef.current) {
            document.body.removeChild(placeholderRef.current);
            placeholderRef.current = null;
        }
    }, []);

    const handleTaskPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, task: Task) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const element = e.currentTarget;
        element.setPointerCapture(e.pointerId);
        setDraggingTaskId(task.id);
        pointerDownTaskRef.current = { task, pointerId: e.pointerId, element, initialX: e.clientX, initialY: e.clientY };
        createGhostElement(element);
        createPlaceholder(element);
    }, []);

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!pointerDownTaskRef.current || e.pointerId !== pointerDownTaskRef.current.pointerId) return;

            if (ghostRef.current && placeholderRef.current) {
                 ghostRef.current.style.transform = `translate(${e.clientX - pointerDownTaskRef.current.initialX}px, ${e.clientY - pointerDownTaskRef.current.initialY}px) rotate(3deg)`;
                
                ghostRef.current.style.display = 'none';
                placeholderRef.current.style.display = 'none';
                const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
                ghostRef.current.style.display = '';
                placeholderRef.current.style.display = '';

                const dayGroup = elementBelow?.closest<HTMLDivElement>('.timeline-day-group');
                if (dayGroup) {
                    const rect = dayGroup.getBoundingClientRect();
                    placeholderRef.current.style.top = `${rect.top + 20}px`;
                    placeholderRef.current.style.left = `${rect.left + (rect.width / 2) - (placeholderRef.current.offsetWidth/2)}px`;
                }
            }
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (!pointerDownTaskRef.current || e.pointerId !== pointerDownTaskRef.current.pointerId) return;

            ghostRef.current?.style.display 'none';
            placeholderRef.current?.style.display 'none';
            const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
            
            const dayGroup = elementBelow?.closest<HTMLDivElement>('.timeline-day-group');
            const newDate = dayGroup?.dataset.dateKey;
            
            const task = pointerDownTaskRef.current.task;
            if (newDate && newDate !== task.dueDate) {
                onUpdateTask({ id: task.id, dueDate: newDate });
            }

            cleanupDrag();
        };

        if (draggingTaskId) {
            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
        }

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [draggingTaskId, cleanupDrag, onUpdateTask]);


    return { draggingTaskId, handleTaskPointerDown };
};