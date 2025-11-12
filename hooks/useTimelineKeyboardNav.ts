import React, { useState, useCallback, RefObject } from 'react';
import { Task } from '../types';

interface LiftedTaskInfo {
    task: Task;
    originalDueDate: string;
}

interface useTimelineKeyboardNavProps {
    containerRef: RefObject<HTMLElement>;
    dateArray: Date[];
    onUpdateTask: (task: Partial<Task> & { id: string }) => Promise<void>;
}

export const useTimelineKeyboardNav = ({ containerRef, dateArray, onUpdateTask }: useTimelineKeyboardNavProps) => {
    const [liftedTask, setLiftedTask] = useState<LiftedTaskInfo | null>(null);
    const [announcement, setAnnouncement] = useState('');

    const findTaskElement = (taskId: string) => containerRef.current?.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement | null;

    const containerKeyDownHandler = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
        const activeElement = document.activeElement as HTMLElement;
        if (!activeElement || !containerRef.current?.contains(activeElement)) return;

        const isDayGroup = activeElement.matches('[data-date-key]');
        const isTaskCard = activeElement.closest('[data-task-id]') !== null;
        
        // --- Navigation ---
        if (!liftedTask) {
            if (isDayGroup) {
                const currentDateKey = activeElement.dataset.dateKey;
                const currentIndex = dateArray.findIndex(d => d.toISOString().split('T')[0] === currentDateKey);

                if (e.key === 'ArrowRight' && currentIndex < dateArray.length - 1) {
                    e.preventDefault();
                    const nextDateKey = dateArray[currentIndex + 1].toISOString().split('T')[0];
                    (containerRef.current?.querySelector(`[data-date-key="${nextDateKey}"]`) as HTMLElement)?.focus();
                } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
                    e.preventDefault();
                    const prevDateKey = dateArray[currentIndex - 1].toISOString().split('T')[0];
                    (containerRef.current?.querySelector(`[data-date-key="${prevDateKey}"]`) as HTMLElement)?.focus();
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const firstTask = activeElement.querySelector('[data-task-id]') as HTMLElement;
                    firstTask?.focus();
                }
            } else if (isTaskCard) {
                const taskCard = activeElement.closest('[data-task-id]') as HTMLElement;
                const dayGroup = taskCard.closest('[data-date-key]') as HTMLElement;
                const tasksInDay = Array.from(dayGroup.querySelectorAll('[data-task-id]')) as HTMLElement[];
                const currentTaskIndex = tasksInDay.findIndex(t => t === taskCard);

                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (currentTaskIndex > 0) {
                        tasksInDay[currentTaskIndex - 1].focus();
                    } else {
                        dayGroup.focus();
                    }
                } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (currentTaskIndex < tasksInDay.length - 1) {
                        tasksInDay[currentTaskIndex + 1].focus();
                    }
                }
            }
        }
        
        // --- Drag & Drop ---
        if (isTaskCard && (e.key === ' ' || e.key === 'Enter')) {
            e.preventDefault();
            const taskCard = activeElement.closest('[data-task-id]') as HTMLElement;
            const taskId = taskCard.dataset.taskId;
            
            if (liftedTask) { // Drop task
                const { task } = liftedTask;
                const targetDay = activeElement.closest('[data-date-key]') as HTMLElement;
                const newDueDate = targetDay.dataset.dateKey;
                
                if (newDueDate && newDueDate !== task.dueDate) {
                    onUpdateTask({ id: task.id, dueDate: newDueDate }).finally(() => {
                        // Focus might need a small delay for DOM to update
                        setTimeout(() => findTaskElement(task.id)?.focus(), 100);
                    });
                     setAnnouncement(`Tarefa ${task.title} movida para ${newDueDate}.`);
                } else {
                    setAnnouncement(`Tarefa ${task.title} solta.`);
                }
                setLiftedTask(null);

            } else { // Lift task
                const dayGroup = taskCard.closest('[data-date-key]') as HTMLElement;
                const taskDueDate = dayGroup.dataset.dateKey;
                const allTasks = Array.from(containerRef.current.querySelectorAll('[data-task-id]')) as HTMLElement[];
                const taskData = allTasks.find(t => t.dataset.taskId === taskId);

                if (taskDueDate && taskData) {
                    const task: Task = {
                        id: taskId!,
                        title: taskData.querySelector('h4')?.textContent || '',
                        dueDate: taskDueDate,
                        columnId: 'A Fazer', order: 0, owner: ''
                    };
                    setLiftedTask({ task, originalDueDate: taskDueDate });
                    setAnnouncement(`Tarefa ${task.title} levantada. Use as setas para mover, Espaço para soltar.`);
                }
            }
        }
        
        if (liftedTask) {
            if (e.key === 'Escape') {
                e.preventDefault();
                setAnnouncement(`Movimentação da tarefa ${liftedTask.task.title} cancelada.`);
                const originalTaskEl = findTaskElement(liftedTask.task.id);
                originalTaskEl?.focus();
                setLiftedTask(null);
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                 e.preventDefault();
                 const { task } = liftedTask;
                 const currentDayEl = activeElement.closest('[data-date-key]') as HTMLElement;
                 const currentDateKey = currentDayEl.dataset.dateKey;
                 const currentIndex = dateArray.findIndex(d => d.toISOString().split('T')[0] === currentDateKey);
                 
                 const nextIndex = e.key === 'ArrowRight' ? currentIndex + 1 : currentIndex - 1;

                 if (nextIndex >= 0 && nextIndex < dateArray.length) {
                     const nextDateKey = dateArray[nextIndex].toISOString().split('T')[0];
                     const nextDayEl = containerRef.current?.querySelector(`[data-date-key="${nextDateKey}"]`) as HTMLElement;
                     const firstTaskInNextDay = nextDayEl?.querySelector('[data-task-id]') as HTMLElement;
                     
                     (firstTaskInNextDay || nextDayEl).focus();
                     setAnnouncement(`Mover para ${nextDateKey}.`);
                 }
            }
        }
    }, [liftedTask, dateArray, onUpdateTask, containerRef]);


    return {
        liftedTaskId: liftedTask?.task.id ?? null,
        announcement,
        containerKeyDownHandler,
    };
};
