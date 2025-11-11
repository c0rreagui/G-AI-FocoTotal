import { useState, useCallback } from 'react';
import { Columns, ColumnId, Task, TaskFormData } from '../types';
import { INITIAL_TASKS, buildInitialColumns } from '../constants';

export const useDashboardData = () => {
    const [columns, setColumns] = useState<Columns>(buildInitialColumns(INITIAL_TASKS));
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    const moveTask = useCallback((taskId: string, targetColumnId: ColumnId, targetIndex: number) => {
        if (!draggedTask || draggedTask.id !== taskId) return;

        const sourceColumnId = draggedTask.columnId;

        setColumns(prev => {
            const newColumns = { ...prev };
            
            // Remover da coluna de origem
            const sourceTasks = [...newColumns[sourceColumnId].tasks];
            const taskIndex = sourceTasks.findIndex(t => t.id === taskId);
            if (taskIndex > -1) {
                sourceTasks.splice(taskIndex, 1);
            }
            newColumns[sourceColumnId] = { ...newColumns[sourceColumnId], tasks: sourceTasks };

            // Adicionar na coluna de destino
            const targetTasks = [...newColumns[targetColumnId].tasks];
            const updatedTask = { ...draggedTask, columnId: targetColumnId };
            targetTasks.splice(targetIndex, 0, updatedTask);
            newColumns[targetColumnId] = { ...newColumns[targetColumnId], tasks: targetTasks };

            return newColumns;
        });
    }, [draggedTask]);

    const addTask = useCallback((taskData: TaskFormData) => {
        const newTask: Task = {
            ...taskData,
            id: `task-${crypto.randomUUID()}`,
            owner: 'dev', // Placeholder
        };
        setColumns(prev => ({
            ...prev,
            [newTask.columnId]: {
                ...prev[newTask.columnId],
                tasks: [newTask, ...prev[newTask.columnId].tasks],
            },
        }));
    }, []);

    const updateTask = useCallback((updatedTask: Task) => {
        setColumns(prev => {
            const newColumns = { ...prev };
            let oldColumnId: ColumnId | undefined;

            // Encontra a coluna antiga
            for (const key in newColumns) {
                const colId = key as ColumnId;
                if(newColumns[colId].tasks.some(t => t.id === updatedTask.id)) {
                    oldColumnId = colId;
                    break;
                }
            }

            // Se a coluna não mudou
            if (oldColumnId === updatedTask.columnId) {
                const newTasks = newColumns[oldColumnId].tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
                newColumns[oldColumnId] = { ...newColumns[oldColumnId], tasks: newTasks };
            } else if(oldColumnId) {
                // Remover da coluna antiga
                const oldTasks = newColumns[oldColumnId].tasks.filter(t => t.id !== updatedTask.id);
                newColumns[oldColumnId] = { ...newColumns[oldColumnId], tasks: oldTasks };
                // Adicionar na nova coluna
                const newTasks = [updatedTask, ...newColumns[updatedTask.columnId].tasks];
                newColumns[updatedTask.columnId] = { ...newColumns[updatedTask.columnId], tasks: newTasks };
            }
            
            return newColumns;
        });
    }, []);

    const deleteTask = useCallback((taskId: string) => {
        setColumns(prev => {
            const newColumns = { ...prev };
            for (const key in newColumns) {
                const colId = key as ColumnId;
                const originalLength = newColumns[colId].tasks.length;
                const newTasks = newColumns[colId].tasks.filter(t => t.id !== taskId);
                if (newTasks.length < originalLength) {
                    newColumns[colId] = { ...newColumns[colId], tasks: newTasks };
                    break; 
                }
            }
            return newColumns;
        });
    }, []);

    return { columns, setColumns, draggedTask, setDraggedTask, moveTask, addTask, updateTask, deleteTask };
};