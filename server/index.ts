import "dotenv/config";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { pool } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS acotado a los endpoints públicos de membresía, consumidos desde la landing
// Next.js separada (membresia-next). El resto de la API sigue same-origin only.
app.use("/api/membresia", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.MEMBERSHIP_LANDING_ORIGIN ?? "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({ pool, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET ?? "proveedor-regional-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

registerRoutes(app);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status ?? 500;
  const message = err.message ?? "Error interno del servidor";
  res.status(status).json({ message });
});

const server = createServer(app);
const port = Number(process.env.PORT) || 5000;

async function start() {
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }
  server.listen(port, "0.0.0.0", () => {
    console.log(`Proveedor Regional escuchando en http://localhost:${port}`);
  });
}

start();
