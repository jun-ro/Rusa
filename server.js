import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./src/routes/auth";

const app = express();
const PORT = Bun.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
