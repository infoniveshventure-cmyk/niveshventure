"use client";
import { createPortal } from "react-dom";
import { useState } from "react";
import toast from "react-hot-toast";

import PasswordInput from "@/components/ui/PasswordInput";

export default function CopyrightGate({
  overlayClassName = "fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm",
}: {
  overlayClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [id, setId] = useState("");
  const [pass, setPass] = useState("");
  const [live, setLive] = useState<boolean | null>(null);
  const [maintMsg, setMaintMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/system/secret-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, pass }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setAuthed(true);

      const statusRes = await fetch("/api/system/maintenance");
      const status = await statusRes.json();

      setLive(status.live);
      setMaintMsg(status.message || "");
    } catch (err: any) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(next: boolean) {
    let msg = maintMsg;
    if (!next) {
      const input = window.prompt("Enter Maintenance Message:", maintMsg || "System upgrade in progress. Please try again later.");
      if (input === null) return; // user cancelled
      msg = input;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/system/maintenance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ live: next, message: msg }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      setLive(data.live);
      setMaintMsg(data.message || "");

      toast.success(
        next
          ? "System is now LIVE"
          : "System switched OFF — login & registration blocked"
      );
    } catch (err: any) {
      toast.error(err.message || "Toggle failed");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setAuthed(false);
    setId("");
    setPass("");
    setMaintMsg("");
  }

  return (
    <>
      <span className="lg:hidden text-ink-muted">©</span>

      <button
        onClick={() => setOpen(true)}
        className="hidden lg:inline text-ink-muted hover:text-ink-muted/70 transition"
        aria-label="footer"
      >
        ©
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={close}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm"
            >
              <div className="glass-card neon-border w-full p-6">
                {!authed ? (
                  <form onSubmit={submitLogin} className="space-y-3">
                    <p className="text-center text-sm text-ink-muted mb-2">
                      Development mode — please ID or pass
                      <p> it's not your part please avoid it</p>
                    </p>

                    <input
                      className="input-field"
                      placeholder="ID"
                      value={id}
                      onChange={(e) => setId(e.target.value)}
                    />

                    <PasswordInput
                      placeholder="Password"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                    />

                    <div className="flex gap-2">
                      <button
                        disabled={busy}
                        className="btn-primary flex-1 text-sm"
                      >
                        {busy ? "..." : "Enter"}
                      </button>

                      <button
                        type="button"
                        onClick={close}
                        className="btn-ghost flex-1 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-sm text-ink-muted">System Status</p>

                    <p
                      className={`font-display text-lg font-bold ${live ? "text-neon-green" : "text-neon-magenta"
                        }`}
                    >
                      {live ? "LIVE" : "OFFLINE"}
                    </p>

                    <button
                      disabled={busy}
                      onClick={() => toggle(!live)}
                      className={`w-16 h-9 rounded-full mx-auto flex items-center px-1 transition ${live
                          ? "bg-neon-green/30 justify-end"
                          : "bg-white/10 justify-start"
                        }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-full block ${live ? "bg-neon-green" : "bg-ink-muted"
                          }`}
                      />
                    </button>

                    <p className="text-xs text-ink-muted">
                      Please don't use this section other wise take your own risk
                    </p>

                    <button
                      onClick={close}
                      className="btn-ghost w-full text-sm"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}