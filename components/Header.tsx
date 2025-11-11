import React, { useMemo } from 'react';
import { Session } from '@supabase/supabase-js';
import { Columns, Column } from '../types';
import UserMenu from './UserMenu';
import Tooltip from './ui/Tooltip';
import SyncStatusIndicator from './SyncStatusIndicator';
import { SyncStatus } from '../hooks/useDashboardData';


interface HeaderProps {
    session: Session;
    columns: Columns;
    onLogoutRequest: () => void;
    syncStatus: SyncStatus;
}

const Header: React.FC<HeaderProps> = ({ session, columns, onLogoutRequest, syncStatus }) => {
    
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
                <UserMenu session={session} onLogoutRequest={onLogoutRequest} />
            </div>
        </header>
    );
};

export default Header;
