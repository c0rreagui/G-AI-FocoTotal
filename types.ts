// types.ts

export type Context = 'Trabalho' | 'Pessoal' | 'Faculdade' | 'Freela';
export type ColumnId = 'A Fazer' | 'Em Progresso' | 'Concluído';

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
// FIX: Added SyncStatus type to central types file.
export type SyncStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
