import React, { useState } from 'react';
import { supabase } from '../services/supabaseService';
import { showToast } from '../App';

const DEV_EMAIL = process.env.DEV_EMAIL || 'dev@focototal.com';
const DEV_PASSWORD = process.env.DEV_PASSWORD || 'password';

const LoginScreen = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showToast('Por favor, insira um endereço de e-mail válido.');
            return;
        }
        
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;
            showToast('Link mágico enviado! Verifique seu email.', 'success');
        } catch (error: any) {
            console.error("Erro no login OTP:", error);
            showToast(`Erro: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDevLogin = async () => {
        setLoading(true);
        try {
            // Tenta logar primeiro, que é a operação mais comum
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: DEV_EMAIL,
                password: DEV_PASSWORD,
            });

            // Se o login falhar por senha inválida, pode ser que o usuário não exista
            if (signInError && signInError.message.includes('Invalid login credentials')) {
                 const { error: signUpError } = await supabase.auth.signUp({
                    email: DEV_EMAIL,
                    password: DEV_PASSWORD,
                });
                // Se o erro for de usuário já registrado, ignora e tenta logar de novo
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

            showToast('Login de dev realizado com sucesso!', 'success');
        } catch (error: any) {
            console.error("Erro no login de dev:", error);
            const userFriendlyMessage = error.message.includes("rate limit")
                ? "Muitas tentativas. Tente novamente mais tarde."
                : "Não foi possível fazer o login de dev.";
            showToast(userFriendlyMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="login-container">
            <div className="login-card">
                <h1>FocoTotal</h1>
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
                        {loading ? <span className="spinner"></span> : 'Entrar / Cadastrar'}
                    </button>
                    <button type="button" onClick={handleDevLogin} className="btn btn-secondary" disabled={loading}>
                        {loading ? <span className="spinner"></span> : 'Entrar como Dev'}
                    </button>
                </form>
                {/* FIX: Incremented application version. */}
                <span className="app-version">v1.1.1</span>
            </div>
        </main>
    );
};

export default LoginScreen;
