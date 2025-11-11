import { useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { Columns, ColumnId, Task, TaskFormData, SupabaseTask } from '../types';
import { buildInitialColumns } from '../constants';
import { supabase } from '../services/supabaseService';
import { fromSupabase, toSupabase } from '../utils/taskUtils';

// Utilidade de clonagem profunda mais segura e performática que JSON.parse(JSON.stringify())
const structuredClone = <T,>(obj: T): T => {
    // Fallback para navegadores antigos que não suportam `structuredClone`
    if (typeof window.structuredClone === 'function') {
        return window.structuredClone(obj);
    }
    return JSON.parse(JSON.stringify(obj));
};

export type SyncStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export const useDashboardData = (user: User | null, showToast: (message: string, type?: 'success' | 'error' | 'default') => void) => {
    const [columns, setColumns] = useState<Columns>(buildInitialColumns([]));
    const [loading, setLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');

    const fetchTasks = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;
            
            const fetchedTasks: Task[] = data.map(fromSupabase);
            
            setColumns(buildInitialColumns(fetchedTasks));
        } catch (error: any) {
            console.error("Erro ao buscar tarefas:", error);
            const errorMessage = error.message || 'Falha ao carregar tarefas. Verifique sua conexão.';
            showToast(`Erro ao buscar tarefas: ${errorMessage}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        if (!user) return;

        fetchTasks();

        const channel = supabase
            .channel('realtime-tasks')
            .on<SupabaseTask>(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newTask = fromSupabase(payload.new);
                        setColumns(prev => {
                            const newColumns = structuredClone(prev);
                            const targetColumn = newColumns[newTask.columnId];

                            // Previne duplicatas caso a mensagem de realtime chegue para uma ação já otimisticamente atualizada
                            if (targetColumn && !targetColumn.tasks.some(t => t.id === newTask.id)) {
                                targetColumn.tasks.push(newTask);
                                targetColumn.tasks.sort((a, b) => a.order - b.order);
                                return newColumns;
                            }
                            return prev;
                        });
                    }

                    if (payload.eventType === 'UPDATE') {
                        const updatedTask = fromSupabase(payload.new);
                        const oldColumnId = (payload.old as SupabaseTask).column_id as ColumnId;

                        setColumns(prev => {
                            const newColumns = structuredClone(prev);
                            const sourceColumn = newColumns[oldColumnId];
                            const targetColumn = newColumns[updatedTask.columnId];

                            // 1. Remove from a coluna de origem
                            if (sourceColumn) {
                                const taskIndex = sourceColumn.tasks.findIndex(t => t.id === updatedTask.id);
                                if (taskIndex > -1) {
                                    sourceColumn.tasks.splice(taskIndex, 1);
                                }
                            }
                            
                            // 2. Adiciona ou atualiza na coluna de destino
                            if (targetColumn) {
                                const taskIndexInTarget = targetColumn.tasks.findIndex(t => t.id === updatedTask.id);
                                if (taskIndexInTarget > -1) {
                                    // A tarefa já existe (caso de edição in-loco), então atualiza
                                    targetColumn.tasks[taskIndexInTarget] = updatedTask;
                                } else {
                                    // A tarefa não existe (caso de movimentação), então adiciona
                                    targetColumn.tasks.push(updatedTask);
                                }
                                // Garante a ordenação correta
                                targetColumn.tasks.sort((a, b) => a.order - b.order);
                            }

                            return newColumns;
                        });
                    }

                    if (payload.eventType === 'DELETE') {
                         const deletedTask = payload.old as SupabaseTask;
                         const deletedTaskId = deletedTask.id;
                         const columnId = deletedTask.column_id as ColumnId;

                         setColumns(prev => {
                             if (!prev[columnId]) return prev; // Se a coluna não existir, não faz nada
                            
                             const newColumns = structuredClone(prev);
                             newColumns[columnId].tasks = newColumns[columnId].tasks.filter(t => t.id !== deletedTaskId);
                             return newColumns;
                         });
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    setSyncStatus('connected');
                } else if (status === 'TIMED_OUT') {
                    setSyncStatus('reconnecting');
                    showToast('Conexão instável. Tentando reconectar...', 'default');
                } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                    setSyncStatus('disconnected');
                    showToast('Desconectado. As alterações não serão salvas.', 'error');
                     console.error('Realtime channel error:', err);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };

    }, [user, fetchTasks]);

    const moveTask = useCallback(async (taskId: string, sourceColumnId: ColumnId, targetColumnId: ColumnId, targetIndex: number) => {
        let taskToMove: Task | undefined;
        const originalColumns = structuredClone(columns);
        
        const newColumns = {...columns};
        const sourceTasks = [...newColumns[sourceColumnId].tasks];
        const taskIndex = sourceTasks.findIndex(t => t.id === taskId);
        if (taskIndex === -1) return;
        [taskToMove] = sourceTasks.splice(taskIndex, 1);
        newColumns[sourceColumnId] = { ...newColumns[sourceColumnId], tasks: sourceTasks };
        const targetTasks = (sourceColumnId === targetColumnId) ? sourceTasks : [...newColumns[targetColumnId].tasks];
        const updatedTask = { ...taskToMove!, columnId: targetColumnId };
        targetTasks.splice(targetIndex, 0, updatedTask);
        newColumns[targetColumnId] = { ...newColumns[targetColumnId], tasks: targetTasks };
        
        setColumns(newColumns); // Atualização otimista

        if (!taskToMove) return;

        const finalTargetTasks = newColumns[targetColumnId].tasks;
        const prevTask = finalTargetTasks[targetIndex - 1];
        const nextTask = finalTargetTasks[targetIndex + 1];
        const prevOrder = prevTask ? prevTask.order : 0;
        const nextOrder = nextTask ? nextTask.order : (prevOrder) + 2;
        const newOrder = (prevOrder + nextOrder) / 2;

        const { error } = await supabase
            .from('tasks')
            .update(toSupabase({ columnId: targetColumnId, order: newOrder }))
            .eq('id', taskId);

        if (error) {
            console.error("Erro ao mover tarefa:", error);
            showToast('Falha ao sincronizar. Você está offline?', 'error');
            setColumns(originalColumns); // Rollback
        } else {
             setColumns(prev => {
                const updated = { ...prev };
                const task = updated[targetColumnId].tasks.find(t => t.id === taskId);
                if (task) task.order = newOrder;
                return updated;
            });
        }
    }, [columns, showToast]);

    const addTask = useCallback(async (taskData: TaskFormData) => {
        if (!user) throw new Error("Usuário não autenticado.");
        
        const columnTasks = columns[taskData.columnId].tasks;
        const maxOrder = columnTasks.reduce((max, t) => Math.max(max, t.order), 0);
        
        const newTaskPayload = {
            ...toSupabase(taskData),
            user_id: user.id,
            order: maxOrder + 1,
        };

        const { data, error } = await supabase
            .from('tasks')
            .insert(newTaskPayload)
            .select()
            .single();

        if (error) throw error;
        
        // A atualização otimista local agora é feita pelo evento de realtime 'INSERT'
        // que é recebido pelo próprio cliente que fez a inserção.
    }, [user, columns]);

    const updateTask = useCallback(async (updatedTask: Task, oldColumnId: ColumnId) => {
        const originalColumns = structuredClone(columns);

        setColumns(prev => {
            const newColumns = { ...prev };
            
            if (oldColumnId !== updatedTask.columnId) {
                newColumns[oldColumnId].tasks = newColumns[oldColumnId].tasks.filter(t => t.id !== updatedTask.id);
                newColumns[updatedTask.columnId].tasks = [...newColumns[updatedTask.columnId].tasks, updatedTask]
                    .sort((a,b) => a.order - b.order);
            } else {
                const taskIndex = newColumns[oldColumnId].tasks.findIndex(t => t.id === updatedTask.id);
                if (taskIndex > -1) newColumns[oldColumnId].tasks[taskIndex] = updatedTask;
            }
            return newColumns;
        });

        const { error } = await supabase
            .from('tasks')
            .update(toSupabase(updatedTask))
            .eq('id', updatedTask.id);

        if (error) {
            console.error("Erro ao atualizar tarefa:", error);
            showToast('Falha ao atualizar. Você está offline?', 'error');
            setColumns(originalColumns);
        }
    }, [columns, showToast]);

    const deleteTask = useCallback(async (taskId: string, columnId: ColumnId) => {
        const originalColumns = structuredClone(columns);
        
        setColumns(prev => {
            const newColumns = { ...prev };
            newColumns[columnId].tasks = newColumns[columnId].tasks.filter(t => t.id !== taskId);
            return newColumns;
        });

        const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            showToast('Falha ao excluir. Você está offline?', 'error');
            setColumns(originalColumns);
            throw error;
        }
    }, [columns, showToast]);

    return { columns, loading, syncStatus, moveTask, addTask, updateTask, deleteTask };
};