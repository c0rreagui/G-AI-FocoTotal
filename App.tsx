import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseService';
import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import { ToastProvider } from './contexts/ToastContext';
import Spinner from './components/ui/Spinner';

const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
            } catch (error) {
                console.error("Falha ao buscar sessão:", error);
            } finally {
                setLoading(false);
            }
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="loading-indicator">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <ToastProvider>
            {session ? <DashboardView session={session} /> : <LoginScreen />}
        </ToastProvider>
    );
};

export default App;