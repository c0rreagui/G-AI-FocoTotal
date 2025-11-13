
import { useState, useEffect, useCallback, useRef } from 'react';
// FIX: Use `import type` for Session type to avoid module resolution issues.
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseService';
import { Task, Columns, ColumnId, TaskFormData, Context, SyncStatus, SupabaseRealtimePayload } from '../types';
import { buildInitialColumns, KANBAN_COLUMNS } from '../constants';
import { fromSupabase, toSupabase } from '../utils/taskUtils';
import { useToast } from '../contexts/ToastContext';

export const useDashboardData = (session: Session | null) => {
    const { showToast } = useToast();
    const [columns, setColumns] = useState<Columns>(buildInitialColumns([]));
    const [isLoading, setIsLoading] = useState(true);
    const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('connecting');
    const [isStale, setIsStale] = useState(false);
    const [realtimeEvents, setRealtimeEvents] = useState<SupabaseRealtimePayload[]>([]);
    
    const isInitialFetchDone = useRef(false);
    const user = session?.user;

    const forceSync = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const tasksResponse = await supabase.from('tasks').select('*').eq('user_id', user.id);
            
            if (tasksResponse.error) throw tasksResponse.error;

            const appTasks: Task[] = (tasksResponse.data || []).map(fromSupabase);

            setColumns(buildInitialColumns(appTasks));
            setIsStale(false);

        } catch (error: any)
        {
            console.error('Erro ao buscar dados:', error);
            showToast('Falha ao carregar dados.', 'error');
            setSyncStatus('disconnected');
        } finally {
            setIsLoading(false);
            isInitialFetchDone.current = true;
        }
    }, [user, showToast]);

    useEffect(() => {
        forceSync();
    }, [forceSync]);
    
    useEffect(() => {
        if (!user) return;

        setSyncStatus('connecting');

        const channel = supabase.channel('public:focototal_db_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, 
            (payload) => {
                console.log('Realtime event (tasks) recebido:', payload);
                setRealtimeEvents(prev => [{...payload, receivedAt: new Date().toISOString()} as SupabaseRealtimePayload, ...prev].slice(0, 10));

                if (!isInitialFetchDone.current) return;
                setIsStale(true);
            })
            .subscribe((status, err) => {
                 if (status === 'SUBSCRIBED') {
                    setSyncStatus('connected');
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setSyncStatus('reconnecting');
                    if (err) console.error("Realtime subscription error:", err);
                    showToast('Conexão instável, tentando reconectar...', 'error');
                } else if (status === 'CLOSED') {
                    setSyncStatus('disconnected');
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, showToast]);


    const addTask = async (taskData: TaskFormData) => {
        if (!user) return;
        try {
            const targetColumn = columns[taskData.columnId];
            const maxOrder = targetColumn.tasks.reduce((max, task) => Math.max(max, task.order), -1);
            
            const supabasePayload = toSupabase({ ...taskData, order: maxOrder + 1 });
            const { error } = await supabase.from('tasks').insert({ ...supabasePayload, user_id: user.id });

            if (error) throw error;
            
            showToast('Tarefa criada com sucesso!', 'success');
            await forceSync(); // Sincroniza para obter o estado mais recente
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
            await forceSync(); // Sincroniza para obter o estado mais recente
        } catch (error: any) {
            console.error('Erro ao atualizar tarefa:', error);
            showToast('Falha ao salvar alterações.', 'error');
            await forceSync(); // Reverter
        }
    };
    
    const reorderTasksInColumn = useCallback(async (columnId: ColumnId, tasks: Task[]) => {
        if (!user || !tasks) return;
        const updates = tasks.map((task, index) => {
            const updatedTaskData = {
                ...task,
                order: index,
                columnId,
            };
            const supabasePayload = toSupabase(updatedTaskData);
            return {
                ...supabasePayload,
                id: task.id,
                user_id: user.id,
            };
        });
      
        if (updates.length === 0) return;

        try {
             const { error } = await supabase.from('tasks').upsert(updates);
             if (error) throw error;
        } catch (error) {
            console.error('Erro ao reordenar tarefas:', error);
            showToast('Falha ao reordenar tarefas.', 'error');
            await forceSync();
        }
    }, [user, forceSync, showToast]);

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
                reorderTasksInColumn(targetColumnId, targetColumn.tasks);
            } else {
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
            await forceSync();
        } catch (error: any) {
            console.error('Erro ao excluir tarefa:', error);
            showToast('Falha ao excluir tarefa.', 'error');
        } finally {
            setDeletingTaskId(null);
        }
    };
    
    // --- Dev Tools Functions ---
    const addTestTasks = async () => {
        if (!user) return;
        try {
            const contexts: Context[] = ['Trabalho', 'Pessoal', 'Faculdade', 'Freela'];
            const testTasks = Array.from({ length: 8 }, (_, i) => {
                const context = contexts[i % contexts.length];
                const columnId = KANBAN_COLUMNS[i % KANBAN_COLUMNS.length];
                return {
                    title: `Tarefa de teste ${i + 1} (${context})`,
                    description: 'Esta é uma descrição gerada automaticamente para a tarefa de teste.',
                    context: context,
                    column_id: columnId,
                    order: i,
                    user_id: user.id
                };
            });
            const { error } = await supabase.from('tasks').insert(testTasks);
            if (error) throw error;
            showToast(`${testTasks.length} tarefas de teste adicionadas!`, 'success');
            await forceSync();
        } catch (error: any) {
             console.error('Erro ao adicionar tarefas de teste:', error);
            showToast('Falha ao criar tarefas de teste.', 'error');
        }
    };
    
    const deleteAllTasks = async () => {
         if (!user) return;
         try {
            const { error } = await supabase.from('tasks').delete().eq('user_id', user.id);
            if (error) throw error;
            showToast('Todas as tarefas foram excluídas.', 'success');
            await forceSync();
         } catch(error: any) {
            console.error('Erro ao excluir todas as tarefas:', error);
            showToast('Falha ao limpar o quadro.', 'error');
         }
    };

    return {
        columns,
        isLoading,
        deletingTaskId,
        syncStatus,
        isStale,
        realtimeEvents,
        addTask,
        updateTask,
        deleteTask,
        moveTask,
        addTestTasks,
        deleteAllTasks,
        forceSync
    };
};
