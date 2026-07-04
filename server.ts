import express from "express";
import path from "path";

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Google Apps Script Deploy ID (Web App URL id)
const DEPLOY_ID = process.env.GOOGLE_APPS_SCRIPT_DEPLOY_ID || "AKfycbxBtoDOgKJYlO2IMV928Q0nhxVzzYN1eqvHKcfxP-4f3QyqwhaVWgTQy_ZkrclPalT50g";
const GAS_URL = `https://script.google.com/macros/s/${DEPLOY_ID}/exec`;

// API Endpoint to get Dashboard
app.get("/api/dashboard", async (req, res) => {
  try {
    const response = await fetch(`${GAS_URL}?action=getDashboard`);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// API Endpoint to get Rincian (Sheet details)
app.get("/api/rincian", async (req, res) => {
  const { sheet } = req.query;
  if (!sheet) {
    return res.status(400).json({ status: "error", message: "Parameter 'sheet' diperlukan" });
  }
  try {
    const response = await fetch(`${GAS_URL}?action=getRincian&sheet=${encodeURIComponent(String(sheet))}`);
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// API Endpoint for Post operations (login, editData, deleteData)
app.post("/api/action", async (req, res) => {
  const { action, payload } = req.body;
  if (!action) {
    return res.status(400).json({ status: "error", message: "Action required" });
  }

  try {
    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, payload })
    });
    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// API Endpoint to generate a new share token
app.post("/api/share/generate", async (req, res) => {
  try {
    // 1. Fetch current tokens from ShareTokens sheet
    const listRes = await fetch(`${GAS_URL}?action=getRincian&sheet=ShareTokens`);
    const listData = await listRes.json();
    
    if (listData.status === "success" && Array.isArray(listData.data)) {
      // Find all tokens that are currently active and deactivate them
      const activeTokens = listData.data.filter((row: any) => row.expires_at === "Aktif");
      for (const tokenRow of activeTokens) {
        await fetch(GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "editData",
            payload: {
              username: "admin",
              password: "123",
              sheetName: "ShareTokens",
              id: tokenRow.id,
              data: {
                id: tokenRow.id,
                token: tokenRow.token,
                expires_at: "Nonaktif",
                created_at: tokenRow.created_at
              }
            }
          })
        });
      }
    }

    // 2. Create new active token
    const newTokenString = Math.random().toString(36).substring(2, 10);
    const newTokenId = `TOKEN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    const saveRes = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "editData",
        payload: {
          username: "admin",
          password: "123",
          sheetName: "ShareTokens",
          id: newTokenId,
          data: {
            id: newTokenId,
            token: newTokenString,
            expires_at: "Aktif",
            created_at: new Date().toISOString()
          }
        }
      })
    });
    
    const saveResult = await saveRes.json();
    if (saveResult.status === "success") {
      res.json({ status: "success", token: newTokenString });
    } else {
      res.status(500).json({ status: "error", message: saveResult.message || "Gagal menyimpan token baru" });
    }
  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// API Endpoint to verify a token and return dashboard and transaction data
app.get("/api/share/verify", async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ status: "error", message: "Token diperlukan" });
  }

  try {
    // 1. Fetch tokens to verify
    const listRes = await fetch(`${GAS_URL}?action=getRincian&sheet=ShareTokens`);
    const listData = await listRes.json();

    if (listData.status !== "success" || !Array.isArray(listData.data)) {
      return res.status(500).json({ status: "error", message: "Gagal memverifikasi token dari database" });
    }

    // Check if there is an active token matching
    const matchingToken = listData.data.find(
      (row: any) => row.token === String(token) && row.expires_at === "Aktif"
    );

    if (!matchingToken) {
      return res.status(403).json({
        status: "error",
        valid: false,
        message: "Link tidak valid atau telah kedaluwarsa."
      });
    }

    // 2. Fetch all transaction sheets in parallel for the investor view
    const [pemasukanRes, pengeluaranRes, mutasiRes] = await Promise.all([
      fetch(`${GAS_URL}?action=getRincian&sheet=Pemasukan`),
      fetch(`${GAS_URL}?action=getRincian&sheet=Pengeluaran`),
      fetch(`${GAS_URL}?action=getRincian&sheet=MutasiKas`),
    ]);

    const [pemasukanData, pengeluaranData, mutasiData] = await Promise.all([
      pemasukanRes.json(),
      pengeluaranRes.json(),
      mutasiRes.json(),
    ]);

    res.json({
      status: "success",
      valid: true,
      data: {
        pemasukan: pemasukanData.status === "success" ? pemasukanData.data : [],
        pengeluaran: pengeluaranData.status === "success" ? pengeluaranData.data : [],
        mutasi: mutasiData.status === "success" ? mutasiData.data : []
      }
    });

  } catch (error: any) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Setup Vite middleware or static serving
async function setupVite() {
  if (process.env.VERCEL) {
    // Vercel serverless functions handle the API routes, while static files are served by the CDN.
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

setupVite();

export default app;
