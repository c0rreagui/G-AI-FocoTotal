import React, { useState, useRef, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { APP_VERSION } from '../constants';

interface UserMenuProps {
    session: Session;
    onLogoutRequest: () => void;
}

const UserMenu: React.FC<UserMenuProps> = ({ session, onLogoutRequest }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const userInitial = session.user?.email?.[0].toUpperCase() || '?';
    
    const handleLogoutClick = () => {
        setIsOpen(false);
        onLogoutRequest();
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="user-menu-container" ref={menuRef}>
            <button 
                className={`user-avatar ${isOpen ? 'is-open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="true"
                aria-expanded={isOpen}
                aria-label="Menu do usuário"
            >
                {userInitial}
            </button>

            {isOpen && (
                <div className="user-menu-dropdown" role="menu">
                    <div className="user-menu-info">
                        <div className="user-menu-info-email">{session.user?.email}</div>
                        <div className="user-menu-info-sub">Plano FocoTotal</div>
                    </div>
                    <button onClick={handleLogoutClick} className="is-danger" role="menuitem">
                        Sair
                    </button>
                    <div className="user-menu-footer">
                        {APP_VERSION}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserMenu;