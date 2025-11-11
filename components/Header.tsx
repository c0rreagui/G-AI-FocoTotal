import React from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseService';

interface HeaderProps {
    session: Session;
}

const Header: React.FC<HeaderProps> = ({ session }) => {

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const userInitial = session.user?.email?.[0].toUpperCase() ?? '?';

    return (
        <header className="app-header">
            <div className="logo">FocoTotal</div>
            <div className="header-right">
                <div className="xp-bar-container">
                    <div className="xp-info">
                        <span>Nível 1</span>
                        <span>150/500 XP</span>
                    </div>
                    <div className="xp-bar-track">
                        <div className="xp-bar" style={{ width: '30%' }}></div>
                    </div>
                </div>
                <button className="icon-btn" aria-label="Notificações">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
                    <div className="unread-badge"></div>
                </button>
                <div className="user-avatar">{userInitial}</div>
                 <button onClick={handleLogout} className="btn btn-secondary">Sair</button>
            </div>
        </header>
    );
};

export default Header;