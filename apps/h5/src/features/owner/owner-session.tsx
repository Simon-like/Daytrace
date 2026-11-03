"use client";

import { useEffect, useState } from "react";

export function OwnerSessionControls() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const refresh = (event: PageTransitionEvent) => { if (event.persisted) window.location.reload(); };
    window.addEventListener("pageshow", refresh);
    return () => window.removeEventListener("pageshow", refresh);
  }, []);
  async function logout() {
    setBusy(true);
    setError(false);
    try {
      const csrf = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
      if (!csrf.ok) throw new Error("csrf");
      const { csrfToken } = await csrf.json();
      const response = await fetch("/api/v1/auth/logout", { method: "POST", headers: { "x-csrf-token": csrfToken }, cache: "no-store" });
      if (response.status !== 204) throw new Error("logout");
      window.location.replace("/h5/owner");
    } catch {
      setError(true);
      setBusy(false);
    }
  }
  return <div className="h5-owner-session"><button type="button" disabled={busy} onClick={logout}>{busy ? "正在退出…" : "退出主人空间"}</button>{error ? <p role="alert">退出未完成，请重试。</p> : null}</div>;
}
