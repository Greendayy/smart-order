import { app } from "./app";
import { env } from "./env";

app.listen(env.port);

// eslint-disable-next-line no-console
console.log(`🦊 API listening on http://${app.server?.hostname}:${app.server?.port}`);
