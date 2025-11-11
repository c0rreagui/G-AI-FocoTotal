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
        // Corrigindo o erro "Could not find the 'column_id' column...":
        // Este erro é causado por um cache de schema obsoleto no servidor do Supabase.
        // Para mitigar isso, realizamos uma "chamada de aquecimento" (priming call)
        // na tabela 'tasks' assim que o aplicativo carrega. Isso força o Supabase
        // a carregar o schema mais recente no cache antes que qualquer operação de escrita
        // (inserir, atualizar) seja feita pelo usuário, prevenindo a ocorrência do erro.
        const initializeApp = async () => {
            try {
                // Chamada de aquecimento: faz uma consulta leve para garantir que o cache de schema está atualizado.
                // A RLS garantirá que esta chamada só retorne dados se o usuário estiver logado,
                // mas a chamada em si é suficiente para validar o schema.
                await supabase.from('tasks').select('id').limit(1);

                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
            } catch (error) {
                console.error("Falha na inicialização ou aquecimento do schema:", error);
                // Mesmo se o aquecimento falhar (ex: usuário deslogado), tentamos obter a sessão.
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
            } finally {
                setLoading(false);
            }
        };
        initializeApp();

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
