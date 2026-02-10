import * as React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import * as authService from "@/services/api/authService";
import logoImage from "@/assets/barbearia-logo.png";

type Step = "phone" | "name";

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Digite um número de celular válido");

const nameSchema = z
  .string()
  .trim()
  .min(3, "Digite seu nome completo")
  .max(100, "Digite seu nome completo")
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Digite seu nome completo");

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const ddd = digits.slice(0, 2);
  const part1 = digits.slice(2, 7);
  const part2 = digits.slice(7, 11);
  if (!ddd) return "";
  if (digits.length <= 2) return `(${ddd}`;
  if (digits.length <= 7) return `(${ddd}) ${part1}`;
  return `(${ddd}) ${part1}-${part2}`;
}

function isPhoneValid(phone: string) {
  return phoneSchema.safeParse(phone).success;
}

export default function Login() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation() as any;
  const { login, loginWithPhone, loginAdmin } = useAuth();

  const from = React.useMemo(() => location?.state?.from ?? "/dashboard", [location]);
  const isAdminTarget = React.useMemo(() => String(from).startsWith("/admin"), [from]);
  const forwardedState = React.useMemo(() => {
    const s = location?.state;
    if (!s) return undefined;
    if (s.service) return { service: s.service };
    return undefined;
  }, [location]);

  const [step, setStep] = React.useState<Step>("phone");
  const [mode, setMode] = React.useState<"client" | "admin">("client");
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [name, setName] = React.useState("");
  const [adminPhone, setAdminPhone] = React.useState("");
  const [adminPassword, setAdminPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const nameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    // Se o usuário foi redirecionado por tentar entrar no /admin, já inicia em modo admin.
    if (isAdminTarget) setMode("admin");
    if (step === "name") {
      requestAnimationFrame(() => nameInputRef.current?.focus());
    }
  }, [isAdminTarget, step]);

  const phoneValid = isPhoneValid(phoneNumber);

  const onContinue = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    const phoneParsed = phoneSchema.safeParse(phoneNumber);
    if (!phoneParsed.success) {
      setError("Digite um número de celular válido");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.checkPhone(phoneNumber);
      if (res.exists) {
        // salva conforme solicitado
        localStorage.setItem("userId", res.userId);
        localStorage.setItem("userName", res.name);
        localStorage.setItem("userPhone", phoneNumber);

        await loginWithPhone({ userId: res.userId, name: res.name, phoneNumber });
        toast({ title: `Bem-vindo de volta, ${res.name}!`, description: "👋" });
        navigate(from, { replace: true, state: forwardedState });
        return;
      }

      setStep("name");
    } catch {
      setError("Erro ao conectar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const onRegister = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    const phoneParsed = phoneSchema.safeParse(phoneNumber);
    if (!phoneParsed.success) {
      setStep("phone");
      setError("Digite um número de celular válido");
      return;
    }
    const nameParsed = nameSchema.safeParse(name);
    if (!nameParsed.success) {
      setError("Digite seu nome completo");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.register(phoneNumber, name);

      localStorage.setItem("userId", res.userId);
      localStorage.setItem("userName", res.name);
      localStorage.setItem("userPhone", res.phoneNumber);

      await loginWithPhone({ userId: res.userId, name: res.name, phoneNumber: res.phoneNumber });
      toast({ title: `Cadastro realizado! Bem-vindo, ${res.name}!`, description: "🎉" });
      navigate(from, { replace: true, state: forwardedState });
    } catch {
      setError("Erro ao cadastrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const onBack = () => {
    setError("");
    setLoading(false);
    if (step === "name") {
      setStep("phone");
      setName("");
      return;
    }
    navigate(-1);
  };

  const onAdminLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    const phoneParsed = phoneSchema.safeParse(adminPhone);
    if (!phoneParsed.success) {
      setError("Digite um número de celular válido");
      return;
    }
    if (!adminPassword.trim()) {
      setError("Senha é obrigatória");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.loginAdmin(adminPhone, adminPassword);
      if (!res.success || !res.admin) {
        setError(res.error ?? "Erro ao fazer login");
        return;
      }
      await loginAdmin({ id: res.admin.id, name: res.admin.name, phoneNumber: res.admin.phoneNumber });
      toast({ title: "Acesso admin liberado", description: "✅" });
      navigate(from, { replace: true, state: forwardedState });
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-[480px] rounded-lg border border-border bg-card p-10 shadow-card md:p-[60px]"
      >
        <div className="text-center">
          <div className="mx-auto flex h-28 w-28 items-center justify-center">
            <img
              src={logoImage}
              alt="Barbearia Freestyle"
              className="h-full w-full object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-primary md:text-3xl">BARBEARIA FREESTYLE</h1>

          <div className="mx-auto mt-6 h-px w-2/3 bg-border" />
        </div>

        <AnimatePresence mode="wait">
          {mode === "admin" ? (
            <motion.form
              key="mode-admin"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="mt-8"
              onSubmit={onAdminLogin}
            >
              <h2 className="text-center text-base font-extrabold tracking-tight text-foreground">ACESSO ADMIN</h2>
              <p className="mt-3 text-center text-sm text-muted-foreground">Entre com celular e senha para acessar o painel.</p>

              <div className="mt-6 flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-tight border border-primary bg-primary px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-primary-foreground transition-colors"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMode("client");
                    setStep("phone");
                  }}
                  className="rounded-tight border border-border bg-background px-4 py-2 text-xs font-extrabold uppercase tracking-wide text-foreground transition-colors hover:border-primary"
                >
                  Cliente
                </button>
              </div>

              <div className="mx-auto mt-6 h-px w-2/3 bg-border" />

              <div className="mt-8 grid gap-2">
                <Label htmlFor="admin-phone" className="text-foreground">
                  📱 CELULAR
                </Label>
                <Input
                  id="admin-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={adminPhone}
                  onChange={(e) => {
                    setError("");
                    setAdminPhone(formatPhone(e.target.value));
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  className={
                    "h-12 rounded-lg bg-background text-base text-foreground md:text-lg " +
                    (error ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary")
                  }
                />
              </div>

              <div className="mt-6 grid gap-2">
                <Label htmlFor="admin-pass" className="text-foreground">
                  🔒 SENHA
                </Label>
                <Input
                  id="admin-pass"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={adminPassword}
                  onChange={(e) => {
                    setError("");
                    setAdminPassword(e.target.value);
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  className={
                    "h-12 rounded-lg bg-background text-base text-foreground md:text-lg " +
                    (error ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary")
                  }
                />
                {error && <p className="mt-2 text-sm text-destructive">⚠️ {error}</p>}
              </div>

              <div className="mt-8">
                <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
                  {loading ? "ENTRANDO..." : "ENTRAR NO ADMIN"}
                </Button>
              </div>

              <div className="mx-auto mt-6 h-px w-2/3 bg-border" />

              <button
                type="button"
                onClick={onBack}
                className="mt-6 w-full text-center text-sm text-foreground transition-colors hover:text-primary"
              >
                ← VOLTAR
              </button>
            </motion.form>
          ) : step === "phone" ? (
            <motion.form
              key="step-phone"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="mt-8"
              onSubmit={onContinue}
            >
              <h2 className="text-center text-base font-extrabold tracking-tight text-foreground">ACESSE SUA CONTA</h2>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Para continuar com o agendamento, digite seu número de celular
              </p>

              <div className="mx-auto mt-6 h-px w-2/3 bg-border" />

              <div className="mt-8 grid gap-2">
                <Label htmlFor="phone" className="text-foreground">
                  📱 NÚMERO DE CELULAR
                </Label>
                <Input
                  id="phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  value={phoneNumber}
                  onChange={(e) => {
                    setError("");
                    setPhoneNumber(formatPhone(e.target.value));
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "phone-error" : undefined}
                  className={
                    "h-12 rounded-lg bg-background text-base text-foreground md:text-lg " +
                    (error ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary")
                  }
                />

                {error ? (
                  <p id="phone-error" className="mt-2 text-sm text-destructive">
                    ⚠️ {error}
                  </p>
                ) : null}
              </div>

              <div className="mt-8">
                <Button
                  type="submit"
                  variant="hero"
                  size="xl"
                  className="w-full"
                  disabled={!phoneValid || loading}
                >
                  {loading ? "VERIFICANDO..." : "CONTINUAR"}
                </Button>
              </div>

              {isAdminTarget ? (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setMode("admin");
                    }}
                    className="text-sm font-extrabold text-primary hover:underline"
                  >
                    Sou admin
                  </button>
                </div>
              ) : null}

              <div className="mx-auto mt-6 h-px w-2/3 bg-border" />

              <button
                type="button"
                onClick={onBack}
                className="mt-6 w-full text-center text-sm text-foreground transition-colors hover:text-primary"
              >
                ← VOLTAR PARA HOME
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="step-name"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={reduce ? undefined : { opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="mt-8"
              onSubmit={onRegister}
            >
              <h2 className="text-center text-2xl font-extrabold tracking-tight text-primary">BEM-VINDO! 🎉</h2>
              <p className="mt-3 text-center text-base font-semibold text-foreground">Primeira vez por aqui?</p>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Para finalizar, precisamos do seu nome completo
              </p>

              <div className="mx-auto mt-6 h-px w-2/3 bg-border" />

              <div className="mt-8 grid gap-2">
                <Label className="text-foreground">📱 CELULAR</Label>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-3">
                  <span className="text-muted-foreground" aria-hidden>
                    🔒
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">{phoneNumber}</span>
                </div>
              </div>

              <div className="mt-6 grid gap-2">
                <Label htmlFor="name" className="text-foreground">
                  👤 NOME COMPLETO
                </Label>
                <Input
                  id="name"
                  ref={nameInputRef}
                  placeholder="Digite seu nome"
                  value={name}
                  onChange={(e) => {
                    setError("");
                    setName(e.target.value);
                  }}
                  disabled={loading}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "name-error" : undefined}
                  className={
                    "h-12 rounded-lg bg-background text-base text-foreground md:text-lg " +
                    (error ? "border-destructive focus-visible:ring-destructive" : "focus-visible:ring-primary")
                  }
                />
                {error ? (
                  <p id="name-error" className="mt-2 text-sm text-destructive">
                    ⚠️ {error}
                  </p>
                ) : null}
              </div>

              <div className="mt-8">
                <Button
                  type="submit"
                  variant="success"
                  size="xl"
                  className="w-full"
                  disabled={!nameSchema.safeParse(name).success || loading}
                >
                  {loading ? "CADASTRANDO..." : "CADASTRAR"}
                </Button>
              </div>

              <div className="mx-auto mt-6 h-px w-2/3 bg-border" />

              <button
                type="button"
                onClick={onBack}
                className="mt-6 w-full text-center text-sm text-foreground transition-colors hover:text-primary"
              >
                ← VOLTAR
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
