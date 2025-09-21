const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/api/test", (req, res) => {
  res.json({
    message: "FerreCotiza API funcionando",
    timestamp: new Date(),
    features: ["Cotizaciones", "Upload Excel", "IA Decision"]
  });
});

// Cargar rutas
try {
  app.use("/api/upload", require("./routes/upload"));
  console.log("✅ Rutas de upload cargadas");
} catch (error) {
  console.log("❌ Error cargando rutas upload:", error.message);
}

try {
  app.use("/api/quotes", require("./routes/quotes"));
  console.log("✅ Rutas de cotizaciones cargadas");
} catch (error) {
  console.log("❌ Error cargando rutas quotes:", error.message);
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 FerreCotiza corriendo en http://localhost:${PORT}`);
  console.log(`📊 Rutas disponibles:`);
  console.log(`   GET  /api/test`);
  console.log(`   POST /api/upload/excel`);
  console.log(`   POST /api/quotes`);
});

// Agregar ruta de proveedores
try {
  app.use("/api/suppliers", require("./routes/suppliers"));
  console.log("✅ Rutas de proveedores cargadas");
} catch (error) {
  console.log("❌ Error cargando rutas suppliers:", error.message);
}

// Ruta para portal de proveedores
app.get('/suppliers', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'suppliers.html'));
});
