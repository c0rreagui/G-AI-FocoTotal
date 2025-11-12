import React, { useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { Columns, Column, SyncStatus, DashboardViewMode } from '../types';
import UserMenu from './UserMenu';
import Tooltip from './ui/Tooltip';
import SyncStatusIndicator from './SyncStatusIndicator';
import Spinner from './ui/Spinner';

interface HeaderProps {
    session: Session;
    columns: Columns;
    onLogoutRequest: () => void;
    syncStatus: SyncStatus;
    isDevUser: boolean;
    onDevToolsClick: () => void;
    isSyncing: boolean;
    onRefreshRequest: () => void;
    isStale: boolean;
    viewMode: DashboardViewMode;
    onViewChange: (mode: DashboardViewMode) => void;
}

const Header: React.FC<HeaderProps> = (props) => {
    const { 
        session, columns, onLogoutRequest, syncStatus, isDevUser, 
        onDevToolsClick, isSyncing, onRefreshRequest, isStale,
        viewMode, onViewChange
    } = props;
    
    const { totalTasks, completedTasks } = useMemo(() => {
        const allTasks = Object.values(columns).flatMap((col: Column) => col.tasks);
        return {
            totalTasks: allTasks.length,
            completedTasks: columns['Concluído']?.tasks.length ?? 0
        };
    }, [columns]);

    const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const currentLevel = Math.floor(completedTasks / 10) + 1;
    const xpForNextLevel = 10;
    const currentLevelXp = completedTasks % xpForNextLevel;
    const xpDisplay = `${currentLevelXp * 50}/${xpForNextLevel * 50} XP`;
    
    const nextView: { mode: DashboardViewMode; tip: string; icon: React.ReactNode } = useMemo(() => {
        if (viewMode === 'contexto') {
            return {
                mode: 'timeline',
                tip: 'Ver Linha do Tempo',
                icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 12 7-9 8 6-5 9-7-3z"></path></svg>
            };
        }
        if (viewMode === 'timeline') {
            return {
                mode: 'kanban',
                tip: 'Ver Quadro Kanban',
                icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            };
        }
        // viewMode is 'kanban'
        return {
            mode: 'contexto',
            tip: 'Ver Lista por Contexto',
            icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
        };
    }, [viewMode]);

    return (
        <header className="app-header">
            <a href="/" className="logo" aria-label="FocoTotal, ir para o início">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>
                </svg>
                FocoTotal
            </a>
            <div className="header-right">
                <SyncStatusIndicator status={syncStatus} />
                 <Tooltip tip={isStale ? "Novas atualizações disponíveis!" : "Sincronizar dados"}>
                    <button
                        className={`icon-btn ${isStale ? 'has-indicator' : ''}`}
                        aria-label="Sincronizar dados"
                        onClick={onRefreshRequest}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <Spinner size="sm" />
                        ) : (
                            // FIX: Corrected malformed viewBox attribute in SVG.
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true"><title>Sincronizar</title><path d="M21 12a9 9 0 1 1-6.219-8.56"/><path d="M21 2v4h-4"/></svg>
                        )}
                    </button>
                </Tooltip>
                 <Tooltip tip={nextView.tip}>
                    <button
                        className="icon-btn"
                        aria-label={`Mudar para ${nextView.tip}`}
                        onClick={() => onViewChange(nextView.mode)}
                    >
                        {nextView.icon}
                    </button>
                </Tooltip>
                <Tooltip tip={`Complete mais ${xpForNextLevel - currentLevelXp} tarefa(s) para o próximo nível!`}>
                    <div className="xp-bar-container" >
                        <div className="xp-info">
                            <span>Nível {currentLevel}</span>
                            <span>{xpDisplay}</span>
                        </div>
                        <div
                            className="xp-bar-track"
                            role="progressbar"
                            aria-label="Barra de progresso de nível"
                            aria-valuenow={currentLevelXp}
                            aria-valuemin={0}
                            aria-valuemax={xpForNextLevel}
                            aria-valuetext={`Progresso para o próximo nível: ${currentLevelXp} de ${xpForNextLevel} tarefas concluídas.`}
                        >
                            <div className="xp-bar" style={{ width: `${(currentLevelXp/xpForNextLevel) * 100}%` }}></div>
                        </div>
                    </div>
                </Tooltip>
                <Tooltip tip="Notificações (em breve)">
                    <button className="icon-btn" aria-label="Notificações" disabled aria-disabled="true">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true"><title>Notificações</title><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                    </button>
                </Tooltip>
                {isDevUser && (
                     <Tooltip tip="Ferramentas de Desenvolvedor">
                        <button className="icon-btn" aria-label="Ferramentas de Desenvolvedor" onClick={onDevToolsClick}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" focusable="false" aria-hidden="true"><title>Ferramentas de Desenvolvedor</title><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0 1 12 0v3c0 3.3-2.7 6-6 6Z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 9.3 3 11.1 3 13v1"/><path d="M20.97 9c.18.96.18 2.04 0 3"/><path d="M17.47 9c1.9 0.3 3.5 2.1 3.5 4v1"/></svg>
                        </button>
                    </Tooltip>
                )}
                <UserMenu session={session} onLogoutRequest={onLogoutRequest} />
            </div>
        </header>
    );
};

export default React.memo(Header);