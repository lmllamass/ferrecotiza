const path = require("path");
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.get("/api/test", (req, res) => {
  res.json({
    message: "FerreCotiza API funcionando!",
    timestamp: new Date()
  });
});

try {
  app.use("/api/quotes", require("./routes/quotes"));
  app.use("/api/upload", require("./routes/upload"));
  console.log("✅ Rutas cargadas correctamente");
} catch (error) {
  console.log("❌ Error cargando rutas:", error.message);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en puerto ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
});
