import express from "express";

import { createAkiTradeApp } from "./server/_core/index";

/**
 * Vercel's Express runtime discovers this root entrypoint and invokes the
 * shared AkiTrade control-plane app for dashboard, legal, and API routes.
 */
const app: ReturnType<typeof express> = createAkiTradeApp();

// Vercel captures this Node server and routes production requests to Express.
app.listen(Number(process.env.PORT ?? 3000));

export default app;
