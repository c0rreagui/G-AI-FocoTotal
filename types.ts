// types.ts
// FIX: Switched to a direct, type-only import for Vector3 to resolve namespace errors.
// The `* as THREE` import was failing to expose the necessary types.
import type { Vector3 as ThreeVector3 } from 'three';

export type Context = 'Trabalho' | 'Pessoal' | 'Faculdade' | 'Freela' | 'Marco';
export type ColumnId = 'A Fazer' | 'Em Progresso' | 'Concluído';

// --- Visualizações ---
export type AppView = 'tarefas' | 'financeiro';
export type DashboardViewMode = 'kanban' | 'timeline' | 'contexto';
// NOVO: Adicionado para a Timeline 3D
export type TimelineZoomLevel = 'month' | 'week' | 'day' | 'hour';


// Formato da tarefa na aplicação (camelCase)
export interface Task {
    id: string;
    title: string;
    description?: string;
    startDate?: string; // YYYY-MM-DD
    dueDate?: string; // YYYY-MM-DD ou YYYY-MM-DD HH:MM
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
    start_date?: string | null;
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


// --- FINANCE HUB ---

export interface Meta {
    id: string;
    nome: string;
    valorAlvo: number;
    valorAtual: number;
    dataAlvo?: string; // YYYY-MM-DD
}

export interface Divida {
    id: string;
    nome: string;
    valorTotal: number;
    valorPago: number;
    juros?: number; // Percentual
    dataVencimento?: string; // YYYY-MM-DD
}


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
    new: SupabaseTask | {};
    old: SupabaseTask | {};
    errors: any;
    receivedAt: string;
}

// --- WebGL / Three.js Types ---
export type Vector3 = ThreeVector3 | [number, number, number];