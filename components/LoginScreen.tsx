import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';
import { useToast } from '../contexts/ToastContext';
import Spinner from './ui/Spinner';

const DEV_EMAIL = process.env.DEV_EMAIL || 'dev@focototal.com';
const DEV_PASSWORD = process.env.DEV_PASSWORD || 'password';

const LoginScreen = () => {
    const [loading, setLoading] = useState(false);
    const [devLoginLoading, setDevLoginLoading] = useState(false);
    const [email, setEmail] = useState('');
    const { showToast } = useToast();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Por favor, insira um endereço de e-mail válido.', 'error');
            return;
        }
        
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;
            showToast('Link mágico enviado! Verifique seu email.', 'success');
        } catch (error: any) {
            console.error("Erro no login OTP:", error);
            showToast(`Erro: ${error.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDevLogin = async () => {
        setDevLoginLoading(true);
        try {
            // Tenta logar primeiro
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: DEV_EMAIL,
                password: DEV_PASSWORD,
            });

            // Se as credenciais forem inválidas, pode ser a primeira vez, então tenta cadastrar
            if (signInError && signInError.message.includes('Invalid login credentials')) {
                 const { error: signUpError } = await supabase.auth.signUp({
                    email: DEV_EMAIL,
                    password: DEV_PASSWORD,
                });
                // Se o erro não for "usuário já existe", lança o erro
                if (signUpError && !signUpError.message.includes('User already registered')) {
                     throw signUpError;
                }
                // Tenta logar novamente após o possível cadastro
                const { error: finalSignInError } = await supabase.auth.signInWithPassword({
                    email: DEV_EMAIL,
                    password: DEV_PASSWORD,
                });
                if (finalSignInError) throw finalSignInError;

            } else if (signInError) {
                throw signInError;
            }
        } catch (error: any) {
            console.error("Erro no login de dev:", error);
            const userFriendlyMessage = "Não foi possível fazer o login de dev. Verifique o console.";
            showToast(userFriendlyMessage, 'error');
        } finally {
            setDevLoginLoading(false);
        }
    };

    return (
        <main className="login-container">
            <div className="login-card">
                <h1>
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>
                    </svg>
                    FocoTotal
                </h1>
                <p>Seu sistema para uma vida focada.</p>
                <form className="login-form" onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email-input">Endereço de e-mail</label>
                        <input 
                            type="email" 
                            id="email-input" 
                            name="email" 
                            placeholder="seu@email.com" 
                            required 
                            disabled={loading}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} 
                        />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <Spinner size="sm" /> : 'Enviar link mágico'}
                    </button>
                </form>
                 <button onClick={handleDevLogin} className="btn btn-dev" disabled={devLoginLoading}>
                    {devLoginLoading ? <Spinner size="sm" /> : 'Entrar como Desenvolvedor'}
                </button>
            </div>
            {/* FIX: Incremented version number */}
            <span className="app-version">v1.11.1</span>
        </main>
    );
};

export default LoginScreen;