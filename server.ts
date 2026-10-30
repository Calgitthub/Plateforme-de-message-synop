import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

// Custom Error Class
class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

const prisma = new PrismaClient();

// Configure SQLite database performance and concurrency settings
async function configureDatabase() {
  try {
    await prisma.$executeRawUnsafe(`PRAGMA journal_mode=WAL;`);
    await prisma.$executeRawUnsafe(`PRAGMA synchronous=NORMAL;`);
    await prisma.$executeRawUnsafe(`PRAGMA busy_timeout=5000;`);
    console.log("Database WAL mode and busy timeout configured successfully.");
  } catch (error) {
    console.error("Failed to configure SQLite pragmas:", error);
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-synop-key";

async function startServer() {
  await configureDatabase();
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // --- API ROUTES ---

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) {
        console.error("JWT Verify Error:", err.message);
        return res.status(403).json({ success: false, message: "Forbidden: " + err.message });
      }
      req.user = user;
      next();
    });
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role?.toUpperCase() !== "ADMIN") {
      console.warn(`Access denied for user: ${req.user?.email || "Unknown"} (Role: ${req.user?.role || "None"})`);
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    next();
  };

  // Auth: Setup Check
  app.get("/api/auth/setup-status", async (req, res, next) => {
    try {
      const rootAdmin = await prisma.user.findFirst({
        where: { isRootAdmin: true }
      });
      res.json({ success: true, isSetup: !!rootAdmin });
    } catch (error) {
      console.error("Setup status error:", error);
      next(error);
    }
  });

  // Auth: Setup Root Admin
  app.post("/api/auth/setup-root-admin", async (req, res, next) => {
    const { email, password, securityQuestion, securityAnswer } = req.body;
    try {
      const existingRoot = await prisma.user.findFirst({ where: { isRootAdmin: true } });
      if (existingRoot) return res.status(400).json({ success: false, message: "Admin déjà configuré" });

      // Create Roles
      let adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
      if (!adminRole) {
        adminRole = await prisma.role.create({ data: { name: "ADMIN" } });
      }

      let memberRole = await prisma.role.findUnique({ where: { name: "MEMBER" } });
      if (!memberRole) {
        await prisma.role.create({ data: { name: "MEMBER" } });
      }

      // Create Default DMZ if not exists
      let defaultDmz = await prisma.dMZ.findFirst();
      if (!defaultDmz) {
        defaultDmz = await prisma.dMZ.create({ data: { name: "CENTRAL" } });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const user = await prisma.user.create({
        data: { 
          email, 
          password: hashedPassword, 
          securityQuestion, 
          securityAnswer, 
          isRootAdmin: true,
          roleId: adminRole.id,
          dmzId: defaultDmz.id
        },
      });

      res.json({ success: true, message: "Administrateur racine créé avec succès" });
    } catch (error) {
      next(error);
    }
  });

  // Auth: Password Recovery
  app.post("/api/auth/recovery-question", async (req, res, next) => {
    const { email } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.securityQuestion) {
        return res.status(404).json({ success: false, message: "Utilisateur non trouvé ou question non configurée" });
      }
      res.json({ success: true, question: user.securityQuestion });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/reset-password", async (req, res, next) => {
    const { email, answer, newPassword } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || user.securityAnswer !== answer) {
        return res.status(400).json({ success: false, message: "Réponse incorrecte" });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { password: bcrypt.hashSync(newPassword, 10) }
      });

      res.json({ success: true, message: "Mot de passe réinitialisé avec succès" });
    } catch (error) {
      next(error);
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res, next) => {
    const { email, password } = req.body;
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { role: true, dmz: true },
      });

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ success: false, message: "Identifiants invalides" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role.name.toUpperCase(), dmzId: user.dmzId },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        success: true,
        data: {
          token,
          user: { id: user.id, email: user.email, role: user.role.name, dmz: user.dmz.name },
        },
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users", authenticateToken, isAdmin, async (req, res, next) => {
    try {
      const users = await prisma.user.findMany({
        include: { role: true, dmz: true },
      });
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/users", authenticateToken, isAdmin, async (req, res, next) => {
    const { email, password, dmzId, roleId } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, dmzId, roleId },
      });
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/users/:id", authenticateToken, isAdmin, async (req, res, next) => {
    const { email, password, dmzId, roleId } = req.body;
    const id = parseInt(req.params.id);
    try {
      const userToUpdate = await prisma.user.findUnique({ where: { id } });
      if (!userToUpdate) throw new AppError("Utilisateur non trouvé", 404);

      const data: any = { 
        email, 
        dmzId: parseInt(dmzId), 
        roleId: parseInt(roleId) 
      };
      if (password) {
        data.password = bcrypt.hashSync(password, 10);
      }
      
      // Prevent removing root admin status via API
      if (userToUpdate.isRootAdmin) {
        data.isRootAdmin = true;
        const adminRole = await prisma.role.findUnique({ where: { name: "ADMIN" } });
        if (adminRole) data.roleId = adminRole.id;
      }

      const user = await prisma.user.update({
        where: { id },
        data,
      });
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", authenticateToken, isAdmin, async (req, res, next) => {
    const id = parseInt(req.params.id);
    try {
      const userToDelete = await prisma.user.findUnique({ where: { id } });
      if (userToDelete?.isRootAdmin) {
        throw new AppError("Impossible de supprimer l'administrateur racine", 403);
      }
      await prisma.user.delete({ where: { id } });
      res.json({ success: true, message: "Utilisateur supprimé" });
    } catch (error) {
      next(error);
    }
  });

  // DMZ Management
  app.get("/api/dmzs", authenticateToken, async (req, res, next) => {
    try {
      const dmzs = await prisma.dMZ.findMany();
      res.json({ success: true, data: dmzs });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/dmzs", authenticateToken, isAdmin, async (req, res, next) => {
    const { name } = req.body;
    if (!name || name.length < 2) {
      return next(new AppError("Nom de DMZ invalide", 400));
    }
    try {
      const dmz = await prisma.dMZ.create({ data: { name } });
      res.json({ success: true, data: dmz });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/dmzs/:id", authenticateToken, isAdmin, async (req, res, next) => {
    const { name } = req.body;
    const id = parseInt(req.params.id);
    if (!name || name.length < 2) {
      return next(new AppError("Nom de DMZ invalide", 400));
    }
    try {
      const dmz = await prisma.dMZ.update({
        where: { id },
        data: { name },
      });
      res.json({ success: true, data: dmz });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/dmzs/:id", authenticateToken, isAdmin, async (req, res, next) => {
    const id = parseInt(req.params.id);
    try {
      const dmz = await prisma.dMZ.findUnique({
        where: { id },
        include: { _count: { select: { users: true, saisies: true } } },
      });
      if (dmz && (dmz._count.users > 0 || dmz._count.saisies > 0)) {
        throw new AppError("Impossible de supprimer une station contenant des utilisateurs ou des données", 400);
      }
      await prisma.dMZ.delete({ where: { id } });
      res.json({ success: true, message: "Station supprimée" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/roles", authenticateToken, async (req, res, next) => {
    try {
      const roles = await prisma.role.findMany();
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  });

  // Saisies
  app.get("/api/saisies/me", authenticateToken, async (req, res, next) => {
    try {
      const saisies = await prisma.saisie.findMany({
        where: { userId: (req as any).user.id },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: saisies });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/saisies", authenticateToken, isAdmin, async (req, res, next) => {
    try {
      const { date, hour, dmzId, userId } = req.query;
      const where: any = {};
      
      if (dmzId && dmzId !== "") {
        const parsed = parseInt(dmzId as string);
        if (!isNaN(parsed)) where.dmzId = parsed;
      }
      if (userId && userId !== "") {
        const parsed = parseInt(userId as string);
        if (!isNaN(parsed)) where.userId = parsed;
      }
      
      if (date) {
        const start = new Date(date as string);
        const end = new Date(date as string);
        
        if (hour) {
          const h = parseInt(hour as string);
          start.setHours(h, 0, 0, 0);
          end.setHours(h + 1, 0, 0, 0);
        } else {
          end.setDate(end.getDate() + 1);
        }
        
        where.createdAt = { gte: start, lt: end };
      }

      const saisies = await prisma.saisie.findMany({
        where,
        include: { user: true, dmz: true },
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: saisies });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/saisies", authenticateToken, async (req, res, next) => {
    const { content } = req.body;
    try {
      if (!content || content.length < 3 || content.length > 2000) {
        throw new AppError("Contenu invalide (3-2000 chars)", 400);
      }

      const user = await prisma.user.findUnique({ where: { id: (req as any).user.id } });
      if (!user) throw new AppError("User not found", 404);

      const saisie = await prisma.saisie.create({
        data: {
          content,
          userId: user.id,
          dmzId: user.dmzId,
        },
      });
      res.json({ success: true, data: saisie });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/saisies/:id", authenticateToken, async (req, res, next) => {
    const { content } = req.body;
    const id = parseInt(req.params.id);
    try {
      const existingSaisie = await prisma.saisie.findUnique({ where: { id } });

      if (!existingSaisie) throw new AppError("Saisie non trouvée", 404);
      if (existingSaisie.userId !== (req as any).user.id && (req as any).user.role !== "ADMIN") {
        throw new AppError("Non autorisé", 403);
      }

      const oldContent = existingSaisie.content;
      const updatedSaisie = await prisma.saisie.update({
        where: { id },
        data: { content },
      });

      await prisma.saisieLog.create({
        data: {
          saisieId: id,
          userId: (req as any).user.id,
          oldContent,
          newContent: content,
        },
      });

      res.json({ success: true, data: updatedSaisie });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/saisies/:id", authenticateToken, isAdmin, async (req, res, next) => {
    const id = parseInt(req.params.id);
    try {
      // Delete logs first
      await prisma.saisieLog.deleteMany({ where: { saisieId: id } });
      await prisma.saisie.delete({ where: { id } });
      res.json({ success: true, message: "Saisie supprimée" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/logs/:saisieId", authenticateToken, isAdmin, async (req, res, next) => {
    try {
      const logs = await prisma.saisieLog.findMany({
        where: { saisieId: parseInt(req.params.saisieId) },
        include: { user: true },
        orderBy: { changedAt: "desc" },
      });
      res.json({ success: true, data: logs });
    } catch (error) {
      next(error);
    }
  });

  // Backup/Export Route
  app.get("/api/monitoring/late-stations", authenticateToken, async (req, res, next) => {
    try {
      const now = new Date();
      const currentMin = now.getMinutes();
      const dmzs = await prisma.dMZ.findMany();
      
      // Fetch transmissions from the last 12 hours
      const checkPeriodStart = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const recentSaisies = await prisma.saisie.findMany({
        where: {
          createdAt: { gte: checkPeriodStart }
        },
        select: {
          id: true,
          dmzId: true,
          createdAt: true
        }
      });

      const lateIssues = [];

      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const year = d.getFullYear();
        const month = d.getMonth();
        const dateVal = d.getDate();
        const hour = d.getHours();

        // If it is the current hour, and we are not past the first 15 minutes, do not flag yet
        if (i === 0 && currentMin < 15) {
          continue;
        }

        const slotStart = new Date(year, month, dateVal, hour, 0, 0, 0);
        const slotLimit = new Date(year, month, dateVal, hour, 15, 0, 0);

        for (const dmz of dmzs) {
          // Check if there's any transmission for this dmz created within [slotStart, slotLimit]
          const hasTransmission = recentSaisies.some(s => {
            if (s.dmzId !== dmz.id) return false;
            const sDate = new Date(s.createdAt);
            return sDate >= slotStart && sDate <= slotLimit;
          });

          if (!hasTransmission) {
            lateIssues.push({
              key: `${dmz.id}-${slotStart.getTime()}`,
              dmzId: dmz.id,
              dmzName: dmz.name,
              hour: `${hour}h`,
              date: slotStart.toLocaleDateString("fr-FR"),
              timestamp: slotStart.getTime(),
              message: `La station ${dmz.name} n'a pas transmis ses données SYNOP pour le créneau de ${hour}h00 (limite ${hour}h15).`
            });
          }
        }
      }

      res.json({ success: true, data: lateIssues });
    } catch (error) {
      next(error);
    }
  });

  // Backup/Export Route
  app.get("/api/backup/export", authenticateToken, isAdmin, async (req, res, next) => {
    try {
      const [users, dmzs, saisies] = await Promise.all([
        prisma.user.findMany({ include: { role: true, dmz: true } }),
        prisma.dMZ.findMany(),
        prisma.saisie.findMany({ include: { user: true, dmz: true } }),
      ]);
      
      const backupData = {
        exportedAt: new Date().toISOString(),
        users,
        dmzs,
        saisies
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=backup_synop_${new Date().getTime()}.json`);
      res.send(JSON.stringify(backupData, null, 2));
    } catch (error) {
      next(error);
    }
  });

  // --- VITE MIDDLEWARE ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("API Error:", {
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      path: req.path,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user ? { id: req.user.id, email: req.user.email } : "Anonymous"
    });

    let statusCode = err.statusCode || 500;
    let message = err.message || "Internal Server Error";

    // Handle Prisma Specific Errors
    if (err.name?.includes("PrismaClient")) {
      statusCode = 400; // Most Prisma errors are bad requests in this app context
      if (err.code === "P2002") {
        message = "Cette ressource existe déjà (conflit de contrainte unique).";
      } else if (err.code === "P2025") {
        statusCode = 404;
        message = "Ressource non trouvée.";
      } else if (err.message.includes("database disk image is malformed")) {
        statusCode = 500;
        message = "Erreur critique de la base de données. Veuillez contacter l'administrateur.";
      }
    }

    // Handle Zod Validation Errors
    if (err instanceof z.ZodError) {
      statusCode = 400;
      message = "Données invalides : " + err.issues.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
    }

    res.status(statusCode).json({ 
      success: false, 
      message,
      error: process.env.NODE_ENV === "development" ? {
        name: err.name,
        code: err.code,
        meta: err.meta,
        message: err.message
      } : undefined
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
