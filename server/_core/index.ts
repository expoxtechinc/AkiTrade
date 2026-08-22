import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import {
  getAkiTradeControlPlaneLandingPage,
  getAkiTradePrivacyPolicyPage,
  getAkiTradeTermsPage,
} from "./landing";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { mt5Bridge } from "../trading/mt5-bridge";
import { brokerAdapterRegistry } from "../trading/broker-contract";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export function createAkiTradeApp() {
  const app = express();

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/", (_req, res) => {
    res.status(200).type("html").send(getAkiTradeControlPlaneLandingPage());
  });

  app.get("/privacy", (_req, res) => {
    res.status(200).type("html").send(getAkiTradePrivacyPolicyPage());
  });

  app.get("/terms", (_req, res) => {
    res.status(200).type("html").send(getAkiTradeTermsPage());
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get("/api/status", async (_req, res) => {
    const mt5 = await mt5Bridge.getHealth();
    res.json({
      status: "healthy",
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      mt5: {
        ...mt5,
        lastHeartbeatAt: mt5.lastHeartbeatAt?.toISOString() ?? null,
      },
      adapters: Object.values(brokerAdapterRegistry).map((adapter) => ({
        provider: adapter.provider,
        connectionMode: adapter.connectionMode,
        demoCapable: adapter.capabilities.demo,
        liveDispatchEnabled: false,
      })),
    });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}

async function startServer() {
  const app = createAkiTradeApp();
  const server = createServer(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

if (process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}
