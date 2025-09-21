# Instalar SQLite (más simple para empezar)
npm install sqlite3

# Crear la estructura de archivos
mkdir -p config models routes services migrations
touch server.js
touch config/database.js
touch .env

# Crear archivo de configuración de base de datos
cat > config/database.js << 'EOF'
const knex = require('knex');
const path = require('path');

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, '../ferrecotiza.db')
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, '../migrations')
  }
});

module.exports = db;
EOF

# Crear archivo .env
cat > .env << 'EOF'
NODE_ENV=development
PORT=3001
OPENAI_API_KEY=tu_api_key_aqui
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu_email@gmail.com
EMAIL_PASS=tu_password_app
TWILIO_SID=tu_twilio_sid
TWILIO_TOKEN=tu_twilio_token
EOF

# Crear el servidor básico
cat > server.js << 'EOF'
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ 
    message: '🚀 FerreCotiza API funcionando!',
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// Socket.IO para notificaciones en tiempo real
io.on('connection', (socket) => {
  console.log('✅ Cliente conectado:', socket.id);
  
  socket.on('join-quote-room', (quoteId) => {
    socket.join(`quote-${quoteId}`);
    console.log(`📝 Cliente se unió a cotización: ${quoteId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

global.io = io;

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 FerreCotiza API corriendo en puerto ${PORT}`);
  console.log(`📊 Panel: http://localhost:${PORT}/api/test`);
});
EOF

echo "✅ Configuración inicial completa!"
echo "🚀 Para iniciar el servidor:"
echo "   npm run dev"
EOF