import "dotenv/config";
import "reflect-metadata";
import { createApp } from "./bootstrap.js";

const { app, env } = await createApp();
await app.listen(env.PORT);
