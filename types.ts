// types.ts

export type Context = 'Trabalho' | 'Pessoal' | 'Faculdade' | 'Freela';
export type ColumnId = 'A Fazer' | 'Em Progresso' | 'Concluído';

// --- Visualização do Dashboard ---
export type DashboardViewMode = 'kanban' | 'timeline';

// --- Sub-tarefas ---
export interface Subtask {
    id: string;
    taskId: string;
    title: string;
    isCompleted: boolean;
    order: number;
}

export interface SupabaseSubtask {
    id: string;
    task_id: string;
    title: string;
    is_completed: boolean;
    order: number;
    user_id: string;
    created_at: string;
}

// Formato da tarefa na aplicação (camelCase)
export interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: string; // YYYY-MM-DD
    context?: Context;
    columnId: ColumnId;
    order: number;
    owner: string;
    subtasks?: Subtask[];
}

// Formato da tarefa vindo do Supabase (snake_case)
export interface SupabaseTask {
    id: string;
    title: string;
    description?: string | null;
    due_date?: string | null;
    context?: Context | null;
    column_id: ColumnId;
    order: number;
    user_id: string;
    created_at: string;
}

// Formato dos dados do formulário para criar/editar uma tarefa
export interface TaskFormData {
    title: string;
    description: string;
    dueDate: string;
    context: Context;
    columnId: ColumnId;
}

// Estrutura de uma coluna do Kanban
export interface Column {
    id: ColumnId;
    title: string;
    tasks: Task[];
}

// Estrutura de todas as colunas
export type Columns = {
    [key in ColumnId]: Column;
};

// --- Dev Tools Types ---
export type Theme = 'theme-indigo' | 'theme-sunset' | 'theme-forest' | 'theme-matrix';
export type Scheme = 'scheme-dark' | 'scheme-light';
export type Density = 'ui-density-default' | 'ui-density-compact';
export type SyncStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

// --- Supabase Types ---
export interface SupabaseRealtimePayload {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    schema: string;
    table: string;
    commit_timestamp: string;
    new: SupabaseTask | SupabaseSubtask | {};
    old: SupabaseTask | SupabaseSubtask | {};
    errors: any;
    receivedAt: string;
}