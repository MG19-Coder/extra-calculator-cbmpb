import { LogIn, ShieldCheck } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { inputClass, primaryButton, secondaryButton } from "./ui";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured) return <>{children}</>;

  async function signIn(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError("E-mail ou senha inválidos.");
    setBusy(false);
  }

  if (session) {
    return (
      <>
        <div className="fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-soft ring-1 ring-slate-200">
          <ShieldCheck size={15} className="text-ocean" />
          <span>{session.user.email}</span>
          <button className="font-semibold text-ocean hover:underline" type="button" onClick={() => void supabase?.auth.signOut()}>Sair</button>
        </div>
        {children}
      </>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={signIn} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-cyan-50 p-3 text-ocean"><LogIn size={22} /></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-ocean">Acesso seguro</p><h1 className="text-xl font-bold text-ink">Controle de Extras BM</h1></div>
        </div>
        <div className="grid gap-4">
          <label className="grid gap-1 text-sm font-medium text-slate-700"><span>E-mail</span><input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label className="grid gap-1 text-sm font-medium text-slate-700"><span>Senha</span><input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button className={primaryButton} type="submit" disabled={busy}>{busy ? "Entrando..." : "Entrar"}</button>
          <button className={secondaryButton} type="button" onClick={() => void supabase?.auth.resetPasswordForEmail(email)} disabled={!email}>Esqueci minha senha</button>
        </div>
      </form>
    </main>
  );
}
