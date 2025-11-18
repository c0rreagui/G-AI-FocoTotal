import React, { useState, useEffect } from 'react';
// FIX: Use `import type` for Session type to avoid module resolution issues.
import type { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabaseService';
import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import { ToastProvider } from './contexts/ToastContext';
import Spinner from './components/ui/Spinner';
import { extend } from '@react-three/fiber';
// FIX: Switched to direct imports from 'three' as the namespace import `* as THREE`
// was causing type resolution failures. This ensures the classes are correctly found.
import { 
    AmbientLight, 
    PointLight, 
    Group, 
    MeshPhysicalMaterial, 
    MeshBasicMaterial, 
    ShaderMaterial,
    InstancedMesh,
    DodecahedronGeometry
} from 'three';

// Centraliza a extensão de primitivos do R3F no ponto de entrada da aplicação
// para garantir que seja executado uma única vez e antes de qualquer renderização 3D,
// mitigando o problema de "múltiplas instâncias do three.js".
extend({
    AmbientLight,
    PointLight,
    Group,
    MeshPhysicalMaterial,
    MeshBasicMaterial,
    ShaderMaterial,
    InstancedMesh,
    DodecahedronGeometry,
});


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

                // FIX: The `getSession` method is part of the v2 API. The error indicates it's not being found.
                // The correct way to get the session in the current API is from the returned data object.
                const { data } = await supabase.auth.getSession();
                setSession(data.session);
            } catch (error) {
                console.error("Falha na inicialização ou aquecimento do schema:", error);
                // Mesmo se o aquecimento falhar (ex: usuário deslogado), tentamos obter a sessão.
                // FIX: Also apply the correct v2 API call here.
                const { data } = await supabase.auth.getSession();
                setSession(data.session);
            } finally {
                setLoading(false);
            }
        };
        initializeApp();

        // FIX: The `onAuthStateChange` method is part of the v2 API and should work.
        // The error was likely a cascade from other incorrect API calls. This syntax is correct.
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
            <div className="stars-bg"></div>
            {session ? <DashboardView session={session} /> : <LoginScreen />}
        </ToastProvider>
    );
};

export default App;