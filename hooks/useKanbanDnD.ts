// FIX: Imported React to make its namespace available for type annotations.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ColumnId, Task, Columns } from '../types';
import { KANBAN_COLUMNS } from '../constants';

const DRAG_THRESHOLD = 10; // pixels
const SCROLL_ZONE_SIZE = 60; // pixels from top/bottom to trigger scroll
const SCROLL_SPEED = 10; // pixels per frame

interface UseKanbanDnDProps {
    columns: Columns;
    moveTask: (taskId: string, sourceColumnId: ColumnId, targetColumnId: ColumnId, targetIndex: number) => void;
    onEditTask: (task: Task, triggerElement: HTMLElement) => void;
}

export const useKanbanDnD = ({ columns, moveTask, onEditTask }: UseKanbanDnDProps) => {
    const pointerDownTaskRef = useRef<{ task: Task, initialX: number, initialY: number, pointerId: number, element: HTMLElement } | null>(null);
    const draggingTaskRef = useRef<Task | null>(null);
    const ghostRef = useRef<HTMLDivElement | null>(null);
    const dropPlaceholderRef = useRef<HTMLDivElement | null>(null);
    const scrollIntervalRef = useRef<number | null>(null);
    const currentDropTargetColumnId = useRef<string | null>(null);
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [keyboardDraggingTaskId, setKeyboardDraggingTaskId] = useState<string | null>(null);
    const originalTaskPosition = useRef<{ task: Task, columnId: ColumnId, index: number } | null>(null);
    const [announcement, setAnnouncement] = useState('');

    const createGhostElement = (task: Task, originalElement: HTMLElement) => {
        const rect = originalElement.getBoundingClientRect();
        const ghost = document.createElement('div');
        ghost.className = 'task-card-ghost';
        ghost.innerHTML = originalElement.innerHTML;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
        document.body.appendChild(ghost);
        ghostRef.current = ghost;
    };

    const createDropPlaceholder = (originalElement: HTMLElement) => {
        if (!dropPlaceholderRef.current) {
            const placeholder = document.createElement('div');
            placeholder.className = 'drop-placeholder';
            dropPlaceholderRef.current = placeholder;
        }
        dropPlaceholderRef.current.style.height = `${originalElement.offsetHeight}px`;
    };
    
    const stopScrolling = () => {
        if (scrollIntervalRef.current) {
            cancelAnimationFrame(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
        }
    };
    
    const updateDropTargetHighlight = (newTargetColumnId: string | null) => {
        if (currentDropTargetColumnId.current !== newTargetColumnId) {
            if (currentDropTargetColumnId.current) {
                document.querySelector(`[data-column-id="${currentDropTargetColumnId.current}"]`)?.classList.remove('is-drop-target');
            }
            if (newTargetColumnId) {
                 document.querySelector(`[data-column-id="${newTargetColumnId}"]`)?.classList.add('is-drop-target');
            }
            currentDropTargetColumnId.current = newTargetColumnId;
        }
    }


    const cleanupDragState = useCallback(() => {
        if (pointerDownTaskRef.current) {
             (pointerDownTaskRef.current.element as HTMLElement).releasePointerCapture(pointerDownTaskRef.current.pointerId);
        }
        document.body.classList.remove('is-dragging');
        setDraggingTaskId(null);
        if (ghostRef.current) {
            document.body.removeChild(ghostRef.current);
            ghostRef.current = null;
        }
        if (dropPlaceholderRef.current && dropPlaceholderRef.current.parentElement) {
            dropPlaceholderRef.current.parentElement.removeChild(dropPlaceholderRef.current);
        }
        updateDropTargetHighlight(null);
        pointerDownTaskRef.current = null;
        draggingTaskRef.current = null;
        stopScrolling();
    }, []);

    const handleTaskPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, task: Task) => {
        if (keyboardDraggingTaskId || e.button !== 0) return; // Only main button
        const target = e.currentTarget as HTMLElement;
        target.setPointerCapture(e.pointerId);
        pointerDownTaskRef.current = { task, initialX: e.clientX, initialY: e.clientY, pointerId: e.pointerId, element: target };
    }, [keyboardDraggingTaskId]);

    useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if (!pointerDownTaskRef.current || e.pointerId !== pointerDownTaskRef.current.pointerId) return;
            const { task, initialX, initialY, element } = pointerDownTaskRef.current;
            
            if (!draggingTaskRef.current) {
                const dx = Math.abs(e.clientX - initialX);
                const dy = Math.abs(e.clientY - initialY);
                if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                    draggingTaskRef.current = task;
                    setDraggingTaskId(task.id);
                    document.body.classList.add('is-dragging');
                    setAnnouncement(`Tarefa '${task.title}' selecionada. Arraste para mover.`);
                    createGhostElement(task, element);
                    createDropPlaceholder(element);
                }
            }
            
            if (draggingTaskRef.current && ghostRef.current && dropPlaceholderRef.current) {
                ghostRef.current.style.transform = `translate(${e.clientX - ghostRef.current.offsetWidth / 2}px, ${e.clientY - ghostRef.current.offsetHeight / 2}px) rotate(3deg)`;
                
                ghostRef.current.style.display = 'none';
                const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
                ghostRef.current.style.display = '';

                const columnEl = elementBelow?.closest<HTMLDivElement>('.kanban-column');
                const container = elementBelow?.closest<HTMLDivElement>('.task-cards-container');

                updateDropTargetHighlight(columnEl?.dataset.columnId ?? null);

                stopScrolling();

                if (container) {
                    const containerRect = container.getBoundingClientRect();

                    if (e.clientY < containerRect.top + SCROLL_ZONE_SIZE) {
                        scrollIntervalRef.current = requestAnimationFrame(() => scrollContainer(container, -SCROLL_SPEED));
                    } else if (e.clientY > containerRect.bottom - SCROLL_ZONE_SIZE) {
                        scrollIntervalRef.current = requestAnimationFrame(() => scrollContainer(container, SCROLL_SPEED));
                    }

                    const cards = Array.from(container.querySelectorAll('.task-card:not(.task-card--dragging)'));
                    let nextElement: Element | null = null;
                    for (const card of cards) {
                        const rect = card.getBoundingClientRect();
                        if (e.clientY < rect.top + rect.height / 2) {
                            nextElement = card;
                            break;
                        }
                    }
                    container.insertBefore(dropPlaceholderRef.current, nextElement);
                }
            }
        };

        const scrollContainer = (container: HTMLElement, amount: number) => {
            container.scrollTop += amount;
            if(scrollIntervalRef.current) scrollIntervalRef.current = requestAnimationFrame(() => scrollContainer(container, amount));
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (!pointerDownTaskRef.current || e.pointerId !== pointerDownTaskRef.current.pointerId) return;
            
            if (draggingTaskRef.current && dropPlaceholderRef.current?.parentElement) {
                const container = dropPlaceholderRef.current.parentElement;
                const columnId = container.closest<HTMLElement>('.kanban-column')?.dataset.columnId as ColumnId;
                if (columnId) {
                    const cards = Array.from(container.children);
                    const newIndex = cards.indexOf(dropPlaceholderRef.current);
                    moveTask(draggingTaskRef.current.id, draggingTaskRef.current.columnId, columnId, newIndex);
                    setAnnouncement(`Tarefa movida para '${columnId}' na posição ${newIndex + 1}.`);
                }
            } else if (pointerDownTaskRef.current && !draggingTaskRef.current) {
                const target = e.target as HTMLElement;
                const taskCardElement = target.closest<HTMLDivElement>('.task-card');
                if (taskCardElement && !target.closest('a, button')) {
                    onEditTask(pointerDownTaskRef.current.task, taskCardElement);
                }
            }
            cleanupDragState();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
            cleanupDragState();
        };
    }, [cleanupDragState, moveTask, onEditTask]);

    const handleTaskKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, task: Task) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            if (keyboardDraggingTaskId === task.id) { // Drop
                setKeyboardDraggingTaskId(null);
                setAnnouncement(`Tarefa '${task.title}' solta em '${task.columnId}'.`);
                originalTaskPosition.current = null;
            } else if (!keyboardDraggingTaskId) { // Lift
                setKeyboardDraggingTaskId(task.id);
                const currentColumn = columns[task.columnId];
                const currentIndex = currentColumn.tasks.findIndex(t => t.id === task.id);
                originalTaskPosition.current = { task, columnId: task.columnId, index: currentIndex };
                setAnnouncement(`Tarefa '${task.title}' selecionada. Use as setas para mover, espaço para soltar ou Esc para cancelar.`);
            }
        }

        if (e.key === 'Escape') {
            if (keyboardDraggingTaskId && originalTaskPosition.current) {
                const { task, columnId, index } = originalTaskPosition.current;
                moveTask(task.id, task.columnId, columnId, index);
                setKeyboardDraggingTaskId(null);
                setAnnouncement(`Movimentação da tarefa '${task.title}' cancelada.`);
                originalTaskPosition.current = null;
            }
        }

        if (keyboardDraggingTaskId && keyboardDraggingTaskId === task.id) {
            const currentColumnIndex = KANBAN_COLUMNS.indexOf(task.columnId);
            const currentTaskIndex = columns[task.columnId].tasks.findIndex(t => t.id === task.id);

            let newColumnId = task.columnId;
            let newIndex = currentTaskIndex;

            switch (e.key) {
                case 'ArrowRight':
                    if (currentColumnIndex < KANBAN_COLUMNS.length - 1) {
                        newColumnId = KANBAN_COLUMNS[currentColumnIndex + 1];
                        newIndex = columns[newColumnId].tasks.length;
                    }
                    break;
                case 'ArrowLeft':
                    if (currentColumnIndex > 0) {
                        newColumnId = KANBAN_COLUMNS[currentColumnIndex - 1];
                        newIndex = columns[newColumnId].tasks.length;
                    }
                    break;
                case 'ArrowDown':
                    if (currentTaskIndex < columns[task.columnId].tasks.length - 1) {
                        newIndex = currentTaskIndex + 1;
                    }
                    break;
                case 'ArrowUp':
                    if (currentTaskIndex > 0) {
                        newIndex = currentTaskIndex - 1;
                    }
                    break;
                default:
                    return;
            }
            
            if(newColumnId !== task.columnId || newIndex !== currentTaskIndex) {
                e.preventDefault();
                moveTask(task.id, task.columnId, newColumnId, newIndex);

                setTimeout(() => {
                    const newCard = document.querySelector(`[data-task-id="${task.id}"]`) as HTMLDivElement;
                    newCard?.focus();
                }, 100);

                setAnnouncement(`Tarefa movida para '${newColumnId}', posição ${newIndex + 1}.`);
            }
        } else if (e.key === 'Enter' && !keyboardDraggingTaskId) {
             onEditTask(task, e.currentTarget);
        }
    }, [columns, moveTask, keyboardDraggingTaskId, onEditTask]);

    return {
        draggingTaskId,
        keyboardDraggingTaskId,
        announcement,
        handleTaskPointerDown,
        handleTaskKeyDown,
    };
};
