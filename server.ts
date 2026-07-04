import path from "path";
import express from "express";
import app from "./src/api-server";

const PORT = 3000;

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
