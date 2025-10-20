// proxy.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());

// ✅ tu API key real
const API_KEY = "58f0776f1548532eca";

app.get("/teams", async (req, res) => {
  try {
    const resp = await fetch("https://v3.football.api-sports.io/teams?league=239&season=2025", {
      headers: { "x-apisports-key": API_KEY }
    });
    const data = await resp.json();

    if (!data.response || data.response.length === 0) {
      console.log("⚠️ No se encontraron equipos");
      return res.status(404).json({ error: "Sin datos", details: data });
    }

    const teams = data.response.map(t => ({
      id: t.team.id,
      name: t.team.name,
      crest: t.team.logo
    }));

    res.json(teams);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Error al obtener datos", details: err });
  }
});

app.listen(4000, () => console.log("✅ Proxy corriendo en http://localhost:4000"));
