import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { initRedis, closeRedis, isRedisConnected } from "./lib/redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Инициализация Redis
  console.log("[Server] Initializing Redis...");
  const redisConnected = await initRedis();
  if (redisConnected) {
    console.log("[Server] Redis connected successfully");
  } else {
    console.warn("[Server] Redis not available, using in-memory cache fallback");
  }

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      redis: isRedisConnected() ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log("[Server] Shutting down...");
    await closeRedis();
    server.close(() => {
      console.log("[Server] Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

startServer().catch(console.error);
