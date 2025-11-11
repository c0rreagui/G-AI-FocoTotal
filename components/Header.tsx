import React, { useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
// FIX: Updated SyncStatus import path and merged with existing types import.
import { Columns, Column, SyncStatus } from '../types';
import UserMenu from './UserMenu';
import Tooltip from './ui/Tooltip';
import SyncStatusIndicator from './SyncStatusIndicator';


interface HeaderProps {
    session: Session;
    columns: Columns;
    onLogoutRequest: () => void;
    syncStatus: SyncStatus;
    isDevUser: boolean;
    onDevToolsClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ session, columns, onLogoutRequest, syncStatus, isDevUser, onDevToolsClick }) => {
    
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

    return (
        <header className="app-header">
            <div className="logo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>
                </svg>
                FocoTotal
            </div>
            <div className="header-right">
                <SyncStatusIndicator status={syncStatus} />
                <Tooltip tip={`Complete mais ${xpForNextLevel - currentLevelXp} tarefa(s) para o próximo nível!`}>
                    <div className="xp-bar-container" >
                        <div className="xp-info">
                            <span>Nível {currentLevel}</span>
                            <span>{xpDisplay}</span>
                        </div>
                        <div
                            className="xp-bar-track"
                            role="progressbar"
                            aria-valuenow={currentLevelXp}
                            aria-valuemin={0}
                            aria-valuemax={xpForNextLevel}
                            aria-valuetext={`Nível ${currentLevel}, ${currentLevelXp} de ${xpForNextLevel} XP para o próximo nível`}
                        >
                            <div className="xp-bar" style={{ width: `${(currentLevelXp/xpForNextLevel) * 100}%` }}></div>
                        </div>
                    </div>
                </Tooltip>
                <Tooltip tip="Notificações (em breve)">
                    <button className="icon-btn" aria-label="Notificações" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                    </button>
                </Tooltip>
                {isDevUser && (
                     <Tooltip tip="Ferramentas de Desenvolvedor">
                        <button className="icon-btn" aria-label="Ferramentas de Desenvolvedor" onClick={onDevToolsClick}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0 1 12 0v3c0 3.3-2.7 6-6 6Z"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 9.3 3 11.1 3 13v1"/><path d="M20.97 9c.18.96.18 2.04 0 3"/><path d="M17.47 9c1.9 0.3 3.5 2.1 3.5 4v1"/></svg>
                        </button>
                    </Tooltip>
                )}
                <UserMenu session={session} onLogoutRequest={onLogoutRequest} />
            </div>
        </header>
    );
};

export default Header;