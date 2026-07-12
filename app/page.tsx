import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: 24 }}>
      <h1 style={{ fontSize: 28 }}>📞 Receptionist Agent</h1>
      <p style={{ lineHeight: 1.6 }}>
        This deployment hosts the webhook backend for an AI voice receptionist
        (powered by Vapi) and an admin console for updating business data.
      </p>
      <ul style={{ lineHeight: 2 }}>
        <li>
          <Link href="/admin">Admin console</Link> — edit hours, fees, and
          availability (token required)
        </li>
        <li>
          <code>/api/vapi/webhook</code> — Vapi Server URL (set this on your
          phone number in the Vapi dashboard)
        </li>
      </ul>
    </main>
  );
}
