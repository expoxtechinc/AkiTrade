import express from "express";

import { createAkiTradeApp } from "./server/_core/index";

/**
 * Vercel's Express runtime discovers this root entrypoint and invokes the
 * shared AkiTrade control-plane app for dashboard, legal, and API routes.
 */
const app: ReturnType<typeof express> = createAkiTradeApp();

export default app;
