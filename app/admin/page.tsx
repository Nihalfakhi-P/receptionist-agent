"use client";

import { useEffect, useState } from "react";
import type { BusinessData, Resource } from "@/lib/business";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e2e5e9",
  borderRadius: 10,
  padding: 20,
  marginBottom: 20,
};
const label: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 4,
  color: "#444",
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #cfd4da",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<BusinessData | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem("admin_token");
    if (saved) setToken(saved);
  }, []);

  async function load() {
    setStatus("Loading…");
    const res = await fetch("/api/admin/business", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      setStatus(res.status === 401 ? "Wrong token." : `Error ${res.status}`);
      return;
    }
    localStorage.setItem("admin_token", token);
    setData(await res.json());
    setStatus("");
  }

  async function save() {
    if (!data) return;
    setStatus("Saving…");
    const res = await fetch("/api/admin/business", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const body = await res.json().catch(() => ({}));
    setStatus(
      res.ok
        ? "✅ Saved. The agent uses this data on the very next call."
        : `❌ ${body.error ?? `Error ${res.status}`}`
    );
  }

  function set<K extends keyof BusinessData>(key: K, value: BusinessData[K]) {
    setData((d) => (d ? { ...d, [key]: value } : d));
  }

  function setResource(i: number, patch: Partial<Resource>) {
    setData((d) => {
      if (!d) return d;
      const resources = d.resources.map((r, j) => (j === i ? { ...r, ...patch } : r));
      return { ...d, resources };
    });
  }

  if (!data) {
    return (
      <main style={{ maxWidth: 480, margin: "100px auto", padding: 24 }}>
        <div style={card}>
          <h2 style={{ marginTop: 0 }}>Admin console</h2>
          <label style={label}>Admin token</label>
          <input
            style={input}
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <button onClick={load} style={{ ...btn, marginTop: 12 }}>
            Unlock
          </button>
          <p style={{ color: "#a00", fontSize: 13 }}>{status}</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 24 }}>
      <h1 style={{ fontSize: 24 }}>{data.name} — Receptionist data</h1>
      <p style={{ color: "#666", marginTop: -8 }}>
        Everything here is read live by the phone agent. Save, and the next
        caller hears the updated information.
      </p>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Basics</h3>
        <Field l="Business name" v={data.name} on={(v) => set("name", v)} />
        <Field l="What is this business? (one line)" v={data.tagline} on={(v) => set("tagline", v)} />
        <Field l="Phone greeting (first thing callers hear)" v={data.greeting} on={(v) => set("greeting", v)} />
        <Field
          l="Human fallback phone (optional)"
          v={data.phoneHumanFallback ?? ""}
          on={(v) => set("phoneHumanFallback", v || undefined)}
        />
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Opening hours</h3>
        {Object.entries(data.hours).map(([day, h]) => (
          <div key={day} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
            <span style={{ width: 100, fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{day}</span>
            <input
              style={input}
              value={h}
              onChange={(e) => set("hours", { ...data.hours, [day]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Fees &amp; charges</h3>
        {Object.entries(data.fees).map(([item, price], i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
            <input
              style={{ ...input, flex: 2 }}
              value={item}
              onChange={(e) => {
                const entries = Object.entries(data.fees);
                entries[i] = [e.target.value, price];
                set("fees", Object.fromEntries(entries));
              }}
            />
            <input
              style={{ ...input, flex: 1 }}
              value={price}
              onChange={(e) => set("fees", { ...data.fees, [item]: e.target.value })}
            />
            <button
              style={btnGhost}
              onClick={() => {
                const { [item]: _, ...rest } = data.fees;
                set("fees", rest);
              }}
            >
              ✕
            </button>
          </div>
        ))}
        <button style={btnGhost} onClick={() => set("fees", { ...data.fees, "New item": "" })}>
          + Add fee
        </button>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Availability (live)</h3>
        <p style={{ fontSize: 13, color: "#666" }}>
          Update “available” whenever occupancy changes — the agent checks this
          number mid-call via a tool.
        </p>
        {data.resources.map((r, i) => (
          <div key={r.id} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
            <input style={{ ...input, flex: 2 }} value={r.label} onChange={(e) => setResource(i, { label: e.target.value })} />
            <label style={{ fontSize: 12 }}>avail</label>
            <input
              style={{ ...input, width: 70 }}
              type="number"
              value={r.available}
              onChange={(e) => setResource(i, { available: Number(e.target.value) })}
            />
            <label style={{ fontSize: 12 }}>of</label>
            <input
              style={{ ...input, width: 70 }}
              type="number"
              value={r.capacity}
              onChange={(e) => setResource(i, { capacity: Number(e.target.value) })}
            />
            <button style={btnGhost} onClick={() => set("resources", data.resources.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        ))}
        <button
          style={btnGhost}
          onClick={() =>
            set("resources", [
              ...data.resources,
              { id: `resource-${Date.now()}`, label: "New resource", capacity: 10, available: 10 },
            ])
          }
        >
          + Add resource
        </button>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>FAQs</h3>
        {data.faqs.map((f, i) => (
          <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px dashed #e2e5e9" }}>
            <Field l="Question" v={f.q} on={(v) => set("faqs", data.faqs.map((x, j) => (j === i ? { ...x, q: v } : x)))} />
            <Field l="Answer" v={f.a} on={(v) => set("faqs", data.faqs.map((x, j) => (j === i ? { ...x, a: v } : x)))} />
            <button style={btnGhost} onClick={() => set("faqs", data.faqs.filter((_, j) => j !== i))}>
              ✕ Remove
            </button>
          </div>
        ))}
        <button style={btnGhost} onClick={() => set("faqs", [...data.faqs, { q: "", a: "" }])}>
          + Add FAQ
        </button>
      </div>

      <div style={card}>
        <h3 style={{ marginTop: 0 }}>Announcements (one per line)</h3>
        <textarea
          style={{ ...input, minHeight: 80, fontFamily: "inherit" }}
          value={data.announcements.join("\n")}
          onChange={(e) => set("announcements", e.target.value.split("\n").filter(Boolean))}
          placeholder="e.g. The library is closed on August 15 for Independence Day."
        />
      </div>

      <div style={{ position: "sticky", bottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={save} style={btn}>
          Save changes
        </button>
        <span style={{ fontSize: 14 }}>{status}</span>
      </div>
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
const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#1a6ef5",
  border: "1px solid #cfd4da",
  borderRadius: 6,
  padding: "6px 12px",
  fontSize: 13,
  cursor: "pointer",
};

function Field({ l, v, on }: { l: string; v: string; on: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={label}>{l}</label>
      <input style={input} value={v} onChange={(e) => on(e.target.value)} />
    </div>
  );
}
