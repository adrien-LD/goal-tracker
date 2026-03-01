"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/components/i18n";

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!username || !password) {
      setError(t("errorRequired"));
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        if (response.status === 409) {
          setError(t("errorUserExists"));
        } else {
          setError(t("errorGeneric"));
        }
        return;
      }
      router.replace("/goals");
    } catch (err) {
      setError(t("errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{t("registerTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">{t("registerHint")}</p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-600">
          {t("labelUsername")}
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 w-full rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
            placeholder="user123"
          />
        </label>
        <label className="block text-sm font-medium text-slate-600">
          {t("labelPassword")}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-cloud px-4 py-2 text-ink outline-none focus:border-ink"
            placeholder="******"
          />
        </label>
        {error ? (
          <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        ) : null}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {loading ? "..." : t("buttonRegister")}
        </button>
      </form>
      <div className="text-sm text-slate-600">
        {t("navLogin")}?
        <Link className="ml-2 font-medium text-ink" href="/login">
          {t("buttonLogin")}
        </Link>
      </div>
    </div>
  );
}
