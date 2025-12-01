import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, sqlite } from "../db/index";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const router = express.Router();
const JWT_SECRET = Bun.env.JWT_SECRET;

router.post("/register", async (req, res) => {
  const { username, password } = req.body;

  console.log("DEBUG - Username:", username, "Password:", password);

  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }

  try {
    // Check existing with Drizzle
    const existing = await db.select().from(users).where(eq(users.username, username)).get();
    if (existing) {
      return res.status(409).json({ error: "Username exists" });
    }

    // Hash password
    const hashedPw = await bcrypt.hash(password, 12);
    console.log("DEBUG - Hashed:", hashedPw);

    // ⭐ RAW SQLITE INSERT (bypass Drizzle bug)
    const stmt = sqlite.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    const result = stmt.run(username, hashedPw);

    // Fetch inserted user
    const newUser = await db.select().from(users).where(eq(users.id, result.lastInsertRowid)).get();
    console.log("DEBUG - Inserted user:", newUser);

    if (!newUser) {
      return res.status(500).json({ error: "Insert failed" });
    }

    const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      user: { id: newUser.id, username: newUser.username },
      token
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    const user = await db.select().from(users).where(eq(users.username, username)).get();

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { password: _, ...safeUser } = user;
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "7d" });

    res.json({ user: safeUser, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
