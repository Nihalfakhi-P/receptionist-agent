"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Browser test call — talk to the receptionist with your mic and speakers.
 * No phone number, no call charges; ideal for testing from India before
 * telephony is wired up. Uses the exact same assistant config as inbound
 * phone calls (fetched from /api/test/assistant).
 *
 * Needs: your Vapi PUBLIC key (Dashboard -> Settings -> API Keys) and the
 * ADMIN_TOKEN. Both are remembered in this browser.
 */

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e5e9",
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cfd4da",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
  marginBottom: 10,
};

type Line = { role: string; text: string };

export default function TestPage() {
  const [publicKey, setPublicKey] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [status, setStatus] = useState<"idle" | "connecting" | "live">("idle");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [transcript, setTranscript] = useState<Line[]>([]);
  const vapiRef = useRef<any>(null);

  useEffect(() => {
    setPublicKey(localStorage.getItem("vapi_public_key") ?? "");
    setAdminToken(localStorage.getItem("admin_token") ?? "");
  }, []);

  async function start() {
    setError("");
    setTranscript([]);
    setStatus("connecting");
    localStorage.setItem("vapi_public_key", publicKey);
    localStorage.setItem("admin_token", adminToken);

    try {
      const res = await fetch("/api/test/assistant", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      if (!res.ok) {
        throw new Error(
          res.status === 401 ? "Wrong admin token." : `Config fetch failed (${res.status}).`
        );
      }
      const { assistant, toolsReachable } = await res.json();
      setWarning(
        toolsReachable
          ? ""
          : "Running on localhost: the check_availability tool will fail (Vapi's cloud can't reach your machine). Everything else works."
      );

      const { default: Vapi } = await import("@vapi-ai/web");
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => setStatus("live"));
      vapi.on("call-end", () => setStatus("idle"));
      vapi.on("error", (e: any) => {
        setError(typeof e === "string" ? e : e?.error?.message ?? e?.errorMsg ?? "Call error — check your public key and Vapi credits.");
        setStatus("idle");
      });
      vapi.on("message", (m: any) => {
        if (m.type === "transcript" && m.transcriptType === "final") {
          setTranscript((t) => [...t, { role: m.role, text: m.transcript }]);
        }
      });

      await vapi.start(assistant);
    } catch (e: any) {
      setError(e.message ?? String(e));
      setStatus("idle");
    }
  }

  function stop() {
    vapiRef.current?.stop();
    setStatus("idle");
  }

  return (
    <main style={{ maxWidth: 640, margin: "48px auto", padding: 24 }}>
      <h1 style={{ fontSize: 24 }}>🎙️ Test call (browser)</h1>
      <p style={{ color: "#666" }}>
        Talks to the receptionist using your microphone — the same agent,
        prompt, and live data that phone callers get. Free; no phone needed.
      </p>

      <div style={card}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>Vapi public key</label>
        <input
          style={input}
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="from dashboard.vapi.ai → Settings → API Keys (the PUBLIC one)"
        />
        <label style={{ fontSize: 13, fontWeight: 600 }}>Admin token</label>
        <input
          style={input}
          type="password"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
        />
        {status === "live" ? (
          <button onClick={stop} style={{ ...btn, background: "#c62828" }}>
            ⏹ End call
          </button>
        ) : (
          <button
            onClick={start}
            disabled={!publicKey || !adminToken || status === "connecting"}
            style={btn}
          >
            {status === "connecting" ? "Connecting…" : "📞 Start test call"}
          </button>
        )}
        {error && <p style={{ color: "#a00", fontSize: 13 }}>{error}</p>}
        {warning && <p style={{ color: "#b26a00", fontSize: 13 }}>{warning}</p>}
      </div>

      {transcript.length > 0 && (
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>Transcript</h3>
          {transcript.map((l, i) => (
            <p key={i} style={{ margin: "6px 0", fontSize: 14 }}>
              <strong>{l.role === "assistant" ? "Asha" : "You"}:</strong> {l.text}
            </p>
          ))}
        </div>
      )}
    </main>
  );
}

const btn: React.CSSProperties = {
  background: "#1a6ef5",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "10px 22px",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
};
