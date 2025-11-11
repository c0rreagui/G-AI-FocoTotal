import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseService';
import { Task, Columns, ColumnId, TaskFormData, SupabaseTask } from '../types';
import { buildInitialColumns } from '../constants';
import { fromSupabase, toSupabase } from '../utils/taskUtils';
import { useToast } from '../contexts/ToastContext';

export type SyncStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

export const useDashboardData = (session: Session | null) => {
    const { showToast } = useToast();
    const [columns, setColumns] = useState<Columns>(buildInitialColumns([]));
    const [isLoading, setIsLoading] = useState(true);
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
    
    const isInitialFetchDone = useRef(false);
    const user = session?.user;

    const fetchTasks = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user.id);
            if (error) throw error;
            if (data) {
                const appTasks: Task[] = data.map(fromSupabase);
                setColumns(buildInitialColumns(appTasks));
            }
        } catch (error: any) {
            console.error('Erro ao buscar tarefas:', error);
            showToast('Falha ao carregar tarefas.', 'error');
            setSyncStatus('disconnected');
        } finally {
            setIsLoading(false);
            isInitialFetchDone.current = true;
        }
    }, [user, showToast]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);
    
    useEffect(() => {
        if (!user) return;

        setSyncStatus('connecting');

        const channel = supabase.channel('public:tasks')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, 
            (payload) => {
                console.log('Realtime event recebido:', payload);
                if (!isInitialFetchDone.current) return;

                // Para evitar race conditions, vamos refazer o fetch para garantir consistência total.
                // Uma implementação mais otimizada poderia aplicar o patch localmente.
                fetchTasks();

            })
            .subscribe((status, err) => {
                 if (status === 'SUBSCRIBED') {
                    setSyncStatus('connected');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setSyncStatus('reconnecting');
                    if (err) console.error("Realtime subscription error:", err);
                } else if (status === 'CLOSED') {
                    setSyncStatus('disconnected');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchTasks]);


    const addTask = async (taskData: TaskFormData) => {
        if (!user) return;
        try {
            const targetColumn = columns[taskData.columnId];
            const maxOrder = targetColumn.tasks.reduce((max, task) => Math.max(max, task.order), -1);
            
            const supabasePayload = toSupabase({ ...taskData, order: maxOrder + 1 });
            const { error } = await supabase.from('tasks').insert({ ...supabasePayload, user_id: user.id });

            if (error) throw error;
            
            showToast('Tarefa criada com sucesso!', 'success');
        } catch (error: any) {
            console.error('Erro ao adicionar tarefa:', error);
            showToast('Falha ao criar tarefa.', 'error');
        }
    };

    const updateTask = async (task: Partial<Task> & {id: string}) => {
        try {
            const supabasePayload = toSupabase(task);
            const { error } = await supabase.from('tasks').update(supabasePayload).eq('id', task.id);
            if (error) throw error;
            showToast('Tarefa atualizada!', 'success');
        } catch (error: any) {
            console.error('Erro ao atualizar tarefa:', error);
            showToast('Falha ao salvar alterações.', 'error');
            fetchTasks(); // Reverter
        }
    };
    
    const reorderTasksInColumn = useCallback(async (columnId: ColumnId, tasks: Task[]) => {
        if (!tasks) return;

        const updates = tasks.map((task, index) => ({
            id: task.id,
            order: index,
            column_id: columnId,
        }));
      
        if (updates.length === 0) return;

        try {
             const { error } = await supabase.from('tasks').upsert(updates);
             if (error) throw error;
        } catch (error) {
            console.error('Erro ao reordenar tarefas:', error);
            showToast('Falha ao reordenar tarefas.', 'error');
            fetchTasks(); // Reverter para o estado do servidor
        }
    }, [fetchTasks, showToast]);

    const moveTask = useCallback((taskId: string, sourceColumnId: ColumnId, targetColumnId: ColumnId, targetIndex: number) => {
        setColumns(prevColumns => {
            const newColumns = JSON.parse(JSON.stringify(prevColumns));
            const sourceColumn = newColumns[sourceColumnId];
            const targetColumn = newColumns[targetColumnId];

            const taskIndex = sourceColumn.tasks.findIndex((t: Task) => t.id === taskId);
            if (taskIndex === -1) return prevColumns;

            const [movedTask] = sourceColumn.tasks.splice(taskIndex, 1);
            movedTask.columnId = targetColumnId;
            targetColumn.tasks.splice(targetIndex, 0, movedTask);
            
            if (sourceColumnId === targetColumnId) {
                // Reordenando dentro da mesma coluna
                reorderTasksInColumn(targetColumnId, targetColumn.tasks);
            } else {
                // Movendo entre colunas, atualiza ambas
                reorderTasksInColumn(sourceColumnId, sourceColumn.tasks);
                reorderTasksInColumn(targetColumnId, targetColumn.tasks);
            }
           
            return newColumns;
        });
    }, [reorderTasksInColumn]);

    const deleteTask = async (task: Task) => {
        setDeletingTaskId(task.id);
        try {
            const { error } = await supabase.from('tasks').delete().eq('id', task.id);
            if (error) throw error;
            showToast('Tarefa excluída.', 'success');
        } catch (error: any) {
            console.error('Erro ao excluir tarefa:', error);
            showToast('Falha ao excluir tarefa.', 'error');
        } finally {
            setDeletingTaskId(null);
        }
    };

    return {
        columns,
        isLoading,
        deletingTaskId,
        syncStatus,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
    };
};