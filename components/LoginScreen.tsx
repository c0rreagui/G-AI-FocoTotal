
import React, { useState, FormEvent } from 'react';
import { supabase } from '../services/supabaseService';
import { DEV_EMAIL, DEV_PASSWORD, GUEST_EMAIL, GUEST_PASSWORD, APP_VERSION } from '../constants';
import Spinner from './ui/Spinner';
import PinModal from './PinModal';

const LoginScreen = () => {
    // FIX: Corrected syntax error by removing extra '='.
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const errorId = 'login-error-message';

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        if (isSignUp) {
            // FIX: The `signUp` method is correct for v1/v2 API. The error was likely a cascade.
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
                setError(error.message);
            } else {
                setMessage('Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.');
                setIsSignUp(false); // Volta para a tela de login
            }
        } else {
            // FIX: The Supabase JS v2 library uses `signInWithPassword`. The previous `signIn` was incorrect.
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setError('Credenciais inválidas. Verifique seu e-mail e senha.');
            }
        }
        setLoading(false);
    };

    const handleGuestLogin = async () => {
        setLoading(true);
        setError(null);
        setMessage(null);
        // FIX: The Supabase JS v2 library uses `signInWithPassword`.
        const { error } = await supabase.auth.signInWithPassword({
            email: GUEST_EMAIL,
            password: GUEST_PASSWORD,
        });
        if (error) {
            // Se o usuário convidado não existir, cria ele.
            if (error.message.includes('Invalid login credentials')) {
                 // FIX: The `signUp` method is correct for v1/v2 API. The error was likely a cascade.
                 const { error: signUpError } = await supabase.auth.signUp({
                    email: GUEST_EMAIL,
                    password: GUEST_PASSWORD,
                });
                if(signUpError) {
                    setError('Não foi possível criar a conta de convidado: ' + signUpError.message);
                }
            } else {
                setError(error.message);
            }
        }
        setLoading(false);
    };

     const handleDevLogin = async () => {
        setIsPinModalOpen(false);
        setLoading(true);
        setError(null);
        setMessage(null);
        // FIX: The Supabase JS v2 library uses `signInWithPassword`.
        const { error } = await supabase.auth.signInWithPassword({
            email: DEV_EMAIL,
            password: DEV_PASSWORD,
        });
         if (error) {
            // Se a conta de dev não existir, cria ela e faz o login.
            if (error.message.includes('Invalid login credentials')) {
                // FIX: The `signUp` method is correct for v1/v2 API. The error was likely a cascade.
                const { error: signUpError } = await supabase.auth.signUp({
                    email: DEV_EMAIL,
                    password: DEV_PASSWORD,
                });
                if (signUpError) {
                    setError('Não foi possível criar a conta de dev: ' + signUpError.message);
                }
            } else {
                setError(error.message);
            }
        }
        setLoading(false);
    };

    const toggleAuthMode = () => {
        setIsSignUp(!isSignUp);
        setError(null);
        setMessage(null);
        setEmail('');
        setPassword('');
    }

    return (
        <>
            <div className="login-container">
                <div className="login-card">
                    <div className="logo">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line>
                        </svg>
                        <h1>{isSignUp ? 'Criar Nova Conta' : 'FocoTotal'}</h1>
                    </div>
                    <p className="subtitle">Organize suas tarefas, maximize sua produtividade.</p>

                    {error && <p className="error-message" id={errorId} role="alert">{error}</p>}
                    {message && <p className="success-message">{message}</p>}
                    
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="seu@email.com"
                                autoComplete="email"
                                aria-describedby={error ? errorId : undefined}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="password">Senha</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                autoComplete={isSignUp ? "new-password" : "current-password"}
                                aria-describedby={error ? errorId : undefined}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Spinner size="sm" /> : (isSignUp ? 'Cadastrar' : 'Entrar')}
                        </button>
                    </form>
                    <button onClick={toggleAuthMode} className="btn-link">
                        {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem uma conta? Cadastre-se'}
                    </button>
                    <div className="guest-login">
                        <p>ou</p>
                        <button onClick={handleGuestLogin} className="btn btn-secondary" disabled={loading}>
                        Entrar como Convidado
                        </button>
                        <button onClick={() => setIsPinModalOpen(true)} className="btn btn-secondary-outline" disabled={loading}>
                            Desenvolvedor
                        </button>
                    </div>
                    <div className="app-version">{APP_VERSION}</div>
                </div>
                <footer className="login-footer">
                    <p>&copy; {new Date().getFullYear()} FocoTotal. Todos os direitos reservados.</p>
                </footer>
            </div>
            <PinModal
                isOpen={isPinModalOpen}
                onClose={() => setIsPinModalOpen(false)}
                onSuccess={handleDevLogin}
            />
        </>
    );
};

export default LoginScreen;