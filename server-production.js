const path = require("path");
require('dotenv').config({ path: '.env.production' });
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

// Configuración base path para subdirectorio
const BASE_PATH = '/ferrecotiza';

app.use(helmet());
app.use(cors());
app.use(express.json());

// Servir archivos estáticos con base path
app.use(BASE_PATH, express.static('public'));

// API Routes con base path
app.get(`${BASE_PATH}/api/test`, (req, res) => {
  res.json({
    message: "FerreCotiza API funcionando en producción",
    timestamp: new Date(),
    environment: process.env.NODE_ENV,
    baseUrl: process.env.BASE_URL
  });
});

try {
  app.use(`${BASE_PATH}/api/upload`, require("./routes/upload"));
  app.use(`${BASE_PATH}/api/quotes`, require("./routes/quotes"));
  app.use(`${BASE_PATH}/api/suppliers`, require("./routes/suppliers"));
  console.log("✅ Rutas de producción cargadas");
} catch (error) {
  console.log("❌ Error cargando rutas:", error.message);
}

// Rutas de páginas con base path
app.get(`${BASE_PATH}/`, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get(`${BASE_PATH}/suppliers`, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'suppliers.html'));
});

app.get(`${BASE_PATH}/suppliers-dashboard`, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'suppliers-dashboard.html'));
});

// Redirección de raíz a ferrecotiza
app.get('/', (req, res) => {
  res.redirect(`${BASE_PATH}/`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`🚀 FerreCotiza en producción: ${process.env.BASE_URL}`);
  console.log(`📡 Puerto interno: ${PORT}`);
});
