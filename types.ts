import { User } from '@supabase/supabase-js';
import { CONTEXTS } from './constants';

export type ColumnId = 'A Fazer' | 'Em Progresso' | 'Concluído';

export interface Task {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    context?: keyof typeof CONTEXTS;
    columnId: ColumnId;
    order: number;
    owner: string;
}

// Interface para dados brutos do Supabase, com snake_case
export interface SupabaseTask {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    context?: keyof typeof CONTEXTS;
    column_id: ColumnId;
    order: number;
    user_id: string;
    created_at: string;
}


export interface Column {
    id: ColumnId;
    title: string;
    tasks: Task[];
}

export type Columns = Record<ColumnId, Column>;

export type TaskFormData = Omit<Task, 'id' | 'owner' | 'order'>;


export interface UserPreferences {
    theme: string;
    scheme: string;
    uiDensity: string;
}

export interface Goal {
    id: string;
    title: string;
    description: string;
    targetDate: string;
    completed: boolean;
}

export interface AppContextType {
    user: User | null;
    preferences: UserPreferences;
    tasks: Task[];
    columns: Columns;
    setPreferences: (prefs: Partial<UserPreferences>) => void;
    addTask: (task: Omit<Task, 'id' | 'owner' | 'order'>) => void;
    updateTask: (task: Task) => void;
    deleteTask: (taskId: string) => void;
    moveTask: (taskId: string, newColumnId: ColumnId, newIndex: number) => void;
}