import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const REPORTS_FILE = path.join(DATA_DIR, "reports.json");
const QUALITY_REPORTS_FILE = path.join(DATA_DIR, "quality_reports.json");
const PENDING_ITEMS_FILE = path.join(DATA_DIR, "pending_items.json");
const OPERATIONAL_EVENTS_FILE = path.join(DATA_DIR, "operational_events.json");

// Ensure data directory and files exist (Synchronous check at startup is fine)
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);
if (!existsSync(REPORTS_FILE)) writeFileSync(REPORTS_FILE, JSON.stringify([]));
if (!existsSync(QUALITY_REPORTS_FILE)) writeFileSync(QUALITY_REPORTS_FILE, JSON.stringify([]));
if (!existsSync(PENDING_ITEMS_FILE)) writeFileSync(PENDING_ITEMS_FILE, JSON.stringify([]));
if (!existsSync(OPERATIONAL_EVENTS_FILE)) writeFileSync(OPERATIONAL_EVENTS_FILE, JSON.stringify([]));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Helper to read/write JSON files asynchronously
  const readJSON = async (file: string) => {
    try {
      const data = await fs.readFile(file, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading ${file}:`, error);
      return [];
    }
  };

  const writeJSON = async (file: string, data: any) => {
    try {
      await fs.writeFile(file, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`Error writing ${file}:`, error);
      throw error;
    }
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      version: "3.1",
      timestamp: new Date().toISOString()
    });
  });

  // Reports Endpoints
  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await readJSON(REPORTS_FILE);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to read reports" });
    }
  });

  app.post("/api/reports", async (req, res) => {
    try {
      const reports = await readJSON(REPORTS_FILE);
      const newReport = req.body;
      reports.push(newReport);
      await writeJSON(REPORTS_FILE, reports);
      res.status(201).json(newReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to save report" });
    }
  });

  // Quality Reports Endpoints
  app.get("/api/quality-reports", async (req, res) => {
    try {
      const reports = await readJSON(QUALITY_REPORTS_FILE);
      res.json(reports);
    } catch (error) {
      res.status(500).json({ error: "Failed to read quality reports" });
    }
  });

  app.post("/api/quality-reports", async (req, res) => {
    try {
      const reports = await readJSON(QUALITY_REPORTS_FILE);
      const newReport = req.body;
      reports.push(newReport);
      await writeJSON(QUALITY_REPORTS_FILE, reports);
      res.status(201).json(newReport);
    } catch (error) {
      res.status(500).json({ error: "Failed to save quality report" });
    }
  });

  // Pending Items Endpoints
  app.get("/api/pending-items", async (req, res) => {
    try {
      const items = await readJSON(PENDING_ITEMS_FILE);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to read pending items" });
    }
  });

  app.post("/api/pending-items", async (req, res) => {
    try {
      const items = await readJSON(PENDING_ITEMS_FILE);
      const newItem = req.body;
      items.push(newItem);
      await writeJSON(PENDING_ITEMS_FILE, items);
      res.status(201).json(newItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to save pending item" });
    }
  });

  app.put("/api/pending-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const items = await readJSON(PENDING_ITEMS_FILE);
      const index = items.findIndex((i: any) => i.id === id);
      
      if (index === -1) {
        return res.status(404).json({ error: "Pending item not found" });
      }
      
      items[index] = { ...items[index], ...updates };
      await writeJSON(PENDING_ITEMS_FILE, items);
      res.json(items[index]);
    } catch (error) {
      res.status(500).json({ error: "Failed to update pending item" });
    }
  });

  // Operational Events Endpoints
  app.get("/api/operational-events", async (req, res) => {
    try {
      const events = await readJSON(OPERATIONAL_EVENTS_FILE);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to read operational events" });
    }
  });

  app.post("/api/operational-events", async (req, res) => {
    try {
      const events = await readJSON(OPERATIONAL_EVENTS_FILE);
      const newEvent = req.body;
      events.push(newEvent);
      await writeJSON(OPERATIONAL_EVENTS_FILE, events);
      res.status(201).json(newEvent);
    } catch (error) {
      res.status(500).json({ error: "Failed to save operational event" });
    }
  });

  // Stats Endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const [reports, pending, quality, events] = await Promise.all([
        readJSON(REPORTS_FILE),
        readJSON(PENDING_ITEMS_FILE),
        readJSON(QUALITY_REPORTS_FILE),
        readJSON(OPERATIONAL_EVENTS_FILE)
      ]);

      res.json({
        totalReports: reports.length,
        totalPending: pending.length,
        openPending: pending.filter((p: any) => p.status === 'aberto').length,
        totalQualityReports: quality.length,
        totalOperationalEvents: events.length,
        lastUpdate: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Sync Endpoint (v3.2)
  app.post("/api/sync", async (req, res) => {
    try {
      const { reports: incomingReports, pending: incomingPending, qualityReports: incomingQuality, operationalEvents: incomingOperational } = req.body;
      
      // 1. Sync Reports
      if (incomingReports && Array.isArray(incomingReports)) {
        const reports = await readJSON(REPORTS_FILE);
        incomingReports.forEach((r: any) => {
          const index = reports.findIndex((existing: any) => existing.id === r.id);
          if (index === -1) reports.push(r);
          else reports[index] = { ...reports[index], ...r };
        });
        await writeJSON(REPORTS_FILE, reports);
      }

      // 2. Sync Pending Items
      if (incomingPending && Array.isArray(incomingPending)) {
        const pending = await readJSON(PENDING_ITEMS_FILE);
        incomingPending.forEach((p: any) => {
          const index = pending.findIndex((existing: any) => existing.id === p.id);
          if (index === -1) pending.push(p);
          else pending[index] = { ...pending[index], ...p };
        });
        await writeJSON(PENDING_ITEMS_FILE, pending);
      }

      // 3. Sync Quality Reports
      if (incomingQuality && Array.isArray(incomingQuality)) {
        const quality = await readJSON(QUALITY_REPORTS_FILE);
        incomingQuality.forEach((qr: any) => {
          const index = quality.findIndex((existing: any) => existing.id === qr.id);
          if (index === -1) quality.push(qr);
          else quality[index] = { ...quality[index], ...qr };
        });
        await writeJSON(QUALITY_REPORTS_FILE, quality);
      }

      // 4. Sync Operational Events
      if (incomingOperational && Array.isArray(incomingOperational)) {
        const events = await readJSON(OPERATIONAL_EVENTS_FILE);
        incomingOperational.forEach((oe: any) => {
          const index = events.findIndex((existing: any) => existing.id === oe.id);
          if (index === -1) events.push(oe);
          else events[index] = { ...events[index], ...oe };
        });
        await writeJSON(OPERATIONAL_EVENTS_FILE, events);
      }

      res.json({ success: true, message: "Sincronismo v3.2 Concluído no Backend." });
    } catch (error) {
      console.error("Sync Error:", error);
      res.status(500).json({ success: false, message: "Erro no sincronismo v3.2." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
