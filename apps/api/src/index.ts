import express from "express";
import cors from "cors";

const app = express();
const PORT = parseInt(process.env.PORT || "4000");

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "inspire-lab-api" });
});

app.listen(PORT, () => {
  console.log(`INSPIRE LAB API running on http://localhost:${PORT}`);
});
