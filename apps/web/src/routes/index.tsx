import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";

type Health = {
  ok: boolean;
  time: string | Date;
};

export const Route = createFileRoute("/")({
  component: Home,
  loader: async (): Promise<Health> => {
    const res = await api.health.get();
    if (res.error) throw res.error;
    const data = res.data as Health;

    return {
      ...data,
      time: data.time instanceof Date ? data.time.toISOString() : String(data.time)
    };
  }
});

function Home() {
  const health = Route.useLoaderData();

  return (
    <main style={{ fontFamily: "ui-sans-serif, system-ui", padding: 24 }}>
      <h1>Smart Order</h1>
      <p>
        API health: <b>{health.ok ? "OK" : "NOT OK"}</b>
      </p>
      <p>Time: {health.time}</p>
    </main>
  );
}
