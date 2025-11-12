import React, { useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { Columns, SyncStatus, Theme, Scheme, Density, SupabaseRealtimePayload } from '../types';
import { useModalFocus } from '../hooks/useModalFocus';
import { useToast } from '../contexts/ToastContext';
import SyncStatusIndicator from './SyncStatusIndicator';
import Spinner from './ui/Spinner';

type Tab = 'geral' | 'estado' | 'aparencia' | 'supabase' | 'perigo';

interface DevToolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    session: Session;
    columns: Columns;
    syncStatus: SyncStatus;
    realtimeEvents: SupabaseRealtimePayload[];
    onForceSync: () => Promise<void>;
    onAddTestTasks: () => Promise<void>;
    onDeleteAllTasks: () => void;
}

const THEMES: { id: Theme, name: string }[] = [
    { id: 'theme-indigo', name: 'Indigo' },
    { id: 'theme-sunset', name: 'Sunset' },
    { id: 'theme-forest', name: 'Forest' },
    { id: 'theme-matrix', name: 'Matrix' },
];
const SCHEMES: { id: Scheme, name: string }[] = [
    { id: 'scheme-dark', name: 'Escuro' },
    { id: 'scheme-light', name: 'Claro' },
];
const DENSITIES: { id: Density, name: string }[] = [
    { id: 'ui-density-default', name: 'Padrão' },
    { id: 'ui-density-compact', name: 'Compacta' },
];

const DevToolsModal: React.FC<DevToolsModalProps> = (props) => {
    const { isOpen, onClose, session, columns, syncStatus, realtimeEvents, onForceSync, onAddTestTasks, onDeleteAllTasks } = props;
    
    const [activeTab, setActiveTab] = useState<Tab>('geral');
    const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
    const { showToast } = useToast();
    
    const modalRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    useModalFocus(isOpen, modalRef, closeButtonRef, onClose);
    
    const handleAction = async (actionName: string, actionFn: () => Promise<void>) => {
        setIsActionLoading(actionName);
        try {
            await actionFn();
        } catch (e) {
            console.error(`DevTools action '${actionName}' failed`, e);
            showToast(`Ação '${actionName}' falhou.`, 'error');
        } finally {
            setIsActionLoading(null);
        }
    };

    const handleCopyState = () => {
        navigator.clipboard.writeText(JSON.stringify({ columns, session, syncStatus }, null, 2))
            .then(() => showToast('Estado copiado para a área de transferência!', 'success'))
            .catch(() => showToast('Falha ao copiar estado.', 'error'));
    };
    
    // Theme controls
    const changeTheme = (theme: Theme) => document.body.className = document.body.className.replace(/theme-\w+/g, theme);
    const changeScheme = (scheme: Scheme) => document.body.className = document.body.className.replace(/scheme-\w+/g, scheme);
    const changeDensity = (density: Density) => document.body.className = document.body.className.replace(/ui-density-\w+/g, density);
    
    // Toast tester
    const [toastMessage, setToastMessage] = useState('Esta é uma mensagem de teste!');

    if (!isOpen) return null;

    return (
        <div className="modal-overlay show" onMouseDown={onClose}>
            <div className="modal-content dev-tools-modal-content" onMouseDown={(e) => e.stopPropagation()} ref={modalRef}>
                <header className="dev-tools-header">
                     <h2>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0 1 12 0v3c0 3.3-2.7 6-6 6Z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 9.3 3 11.1 3 13v1"/><path d="M20.97 9c.18.96.18 2.04 0 3"/><path d="M17.47 9c1.9 0.3 3.5 2.1 3.5 4v1"/></svg>
                        Ferramentas de Desenvolvedor
                    </h2>
                    <button ref={closeButtonRef} type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <div className="dev-tools-body">
                    <aside className="dev-tools-tabs">
                        <button className="dev-tools-tab" data-active={activeTab === 'geral'} onClick={() => setActiveTab('geral')}>Geral</button>
                        <button className="dev-tools-tab" data-active={activeTab === 'estado'} onClick={() => setActiveTab('estado')}>Estado</button>
                        <button className="dev-tools-tab" data-active={activeTab === 'aparencia'} onClick={() => setActiveTab('aparencia')}>Aparência</button>
                        <button className="dev-tools-tab" data-active={activeTab === 'supabase'} onClick={() => setActiveTab('supabase')}>Supabase</button>
                        <button className="dev-tools-tab is-danger" data-active={activeTab === 'perigo'} onClick={() => setActiveTab('perigo')}>Ações Perigosas</button>
                    </aside>
                    <main className="dev-tools-tab-panel">
                        {activeTab === 'geral' && (
                            <div>
                                <section className="dev-tools-section">
                                    <h3>Informações da Sessão</h3>
                                    <dl className="info-grid">
                                        <dt>Email</dt><dd>{session.user.email}</dd>
                                        <dt>User ID</dt><dd>{session.user.id}</dd>
                                        <dt>Sincronização</dt><dd><SyncStatusIndicator status={syncStatus} /></dd>
                                    </dl>
                                </section>
                                <section className="dev-tools-section">
                                    <h3>Ações Rápidas</h3>
                                    <div className="dev-tools-actions">
                                        <button className="btn btn-secondary" onClick={() => handleAction('sync', onForceSync)} disabled={!!isActionLoading}>
                                            {isActionLoading === 'sync' ? <Spinner size="sm" /> : 'Forçar Sincronização'}
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => handleAction('addTasks', onAddTestTasks)} disabled={!!isActionLoading}>
                                            {isActionLoading === 'addTasks' ? <Spinner size="sm" /> : 'Gerar Tarefas de Teste'}
                                        </button>
                                    </div>
                                </section>
                            </div>
                        )}
                         {activeTab === 'estado' && (
                             <section className="dev-tools-section">
                                <h3>Estado do Cliente (JSON)</h3>
                                <div className="state-inspector">
                                    <button className="icon-btn copy-btn" onClick={handleCopyState} aria-label="Copiar estado">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    </button>
                                    <pre><code>{JSON.stringify({ columns, session: { user: { id: session.user.id, email: session.user.email }}, syncStatus }, null, 2)}</code></pre>
                                </div>
                            </section>
                        )}
                        {activeTab === 'aparencia' && (
                             <div>
                                <section className="dev-tools-section">
                                    <h3>Tema</h3>
                                    <div className="control-group">
                                        {THEMES.map(theme => <button key={theme.id} className="btn btn-secondary" onClick={() => changeTheme(theme.id)}>{theme.name}</button>)}
                                    </div>
                                </section>
                                <section className="dev-tools-section">
                                    <h3>Esquema de Cores</h3>
                                     <div className="control-group">
                                        {SCHEMES.map(scheme => <button key={scheme.id} className="btn btn-secondary" onClick={() => changeScheme(scheme.id)}>{scheme.name}</button>)}
                                    </div>
                                </section>
                                <section className="dev-tools-section">
                                    <h3>Densidade da UI</h3>
                                     <div className="control-group">
                                        {DENSITIES.map(density => <button key={density.id} className="btn btn-secondary" onClick={() => changeDensity(density.id)}>{density.name}</button>)}
                                    </div>
                                </section>
                                 <section className="dev-tools-section">
                                    <h3>Testador de Toasts</h3>
                                    <div className="form-group">
                                        <input type="text" value={toastMessage} onChange={(e) => setToastMessage(e.target.value)} />
                                    </div>
                                     <div className="control-group">
                                        <button className="btn btn-secondary" onClick={() => showToast(toastMessage)}>Padrão</button>
                                        <button className="btn btn-secondary" onClick={() => showToast(toastMessage, 'success')}>Sucesso</button>
                                        <button className="btn btn-secondary" onClick={() => showToast(toastMessage, 'error')}>Erro</button>
                                    </div>
                                </section>
                            </div>
                        )}
                        {activeTab === 'supabase' && (
                             <section className="dev-tools-section">
                                <h3>Log de Eventos Realtime (últimos 10)</h3>
                                <div className="realtime-log">
                                    {realtimeEvents.length === 0 && <p>Nenhum evento recebido ainda...</p>}
                                    {realtimeEvents.map(event => (
                                        <div key={event.commit_timestamp} className="realtime-log-entry">
                                            <div><span className={`log-event-type log-event-type-${event.eventType}`}>{event.eventType}</span> em {new Date(event.receivedAt).toLocaleTimeString()}</div>
                                            <div>Tabela: {event.table} | Schema: {event.schema}</div>
                                            {event.eventType === 'UPDATE' && <div>ID: {(event.new as any)?.id}</div>}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        {activeTab === 'perigo' && (
                            <section className="dev-tools-section">
                                <h3>Ações Destrutivas</h3>
                                <p>Use com cuidado. Estas ações são irreversíveis.</p>
                                <div className="dev-tools-actions">
                                    <button className="btn btn-danger-outline" onClick={onDeleteAllTasks} disabled={!!isActionLoading}>
                                        Limpar Todas as Tarefas
                                    </button>
                                </div>
                            </section>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default DevToolsModal;
