import { SupabaseTask, Task, TaskFormData, SupabaseSubtask, Subtask } from '../types';

/**
 * Converte um objeto de tarefa do formato do Supabase (snake_case) para o formato da aplicação (camelCase).
 * @param task - O objeto de tarefa do Supabase.
 * @returns O objeto de tarefa no formato da aplicação.
 */
export const fromSupabase = (task: SupabaseTask): Task => ({
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    startDate: task.start_date ?? undefined,
    dueDate: task.due_date ?? undefined,
    context: task.context ?? undefined,
    columnId: task.column_id,
    order: task.order,
    owner: task.user_id,
    subtasks: [], // Inicializa como array vazio; será preenchido depois
});

/**
 * Converte um objeto de tarefa do formato da aplicação (camelCase) para o formato do Supabase (snake_case).
 * @param taskData - Os dados da tarefa no formato da aplicação.
 * @returns Um objeto pronto para ser enviado para o Supabase.
 */
export const toSupabase = (taskData: Partial<TaskFormData> | Partial<Task>) => {
    const payload: { [key: string]: any } = {};
    if (taskData.title !== undefined) payload.title = taskData.title;
    if (taskData.description !== undefined) payload.description = taskData.description || null;
    if ('startDate' in taskData && taskData.startDate !== undefined) payload.start_date = taskData.startDate || null;
    if (taskData.dueDate !== undefined) payload.due_date = taskData.dueDate || null;
    if (taskData.context !== undefined) payload.context = taskData.context || null;
    if ('columnId' in taskData && taskData.columnId !== undefined) payload.column_id = taskData.columnId;
    if ('order' in taskData && taskData.order !== undefined) payload.order = taskData.order;
    return payload;
};

/**
 * Converte um objeto de sub-tarefa do formato do Supabase para o da aplicação.
 */
export const fromSupabaseSubtask = (subtask: SupabaseSubtask): Subtask => ({
    id: subtask.id,
    taskId: subtask.task_id,
    title: subtask.title,
    isCompleted: subtask.is_completed,
    order: subtask.order,
});

/**
 * Converte um objeto de sub-tarefa do formato da aplicação para o do Supabase.
 */
export const toSupabaseSubtask = (subtaskData: Partial<Subtask>) => {
    const payload: { [key: string]: any } = {};
    if (subtaskData.taskId !== undefined) payload.task_id = subtaskData.taskId;
    if (subtaskData.title !== undefined) payload.title = subtaskData.title;
    if (subtaskData.isCompleted !== undefined) payload.is_completed = subtaskData.isCompleted;
    if (subtaskData.order !== undefined) payload.order = subtaskData.order;
    return payload;
};