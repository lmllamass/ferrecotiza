// package.json
{
  "name": "ferrecotiza-backend",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "knex migrate:latest",
    "seed": "knex seed:run"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "knex": "^2.5.1",
    "pg": "^8.11.3",
    "multer": "^1.4.5-lts.1",
    "xlsx": "^0.18.5",
    "openai": "^4.14.0",
    "nodemailer": "^6.9.7",
    "twilio": "^4.19.0",
    "uuid": "^9.0.1",
    "joi": "^17.11.0",
    "express-rate-limit": "^7.1.5",
    "socket.io": "^4.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}

// server.js - Servidor principal
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/ai', require('./routes/ai'));

// Socket.IO para notificaciones en tiempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  socket.on('join-quote-room', (quoteId) => {
    socket.join(`quote-${quoteId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

global.io = io;

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

// models/Quote.js - Modelo principal de cotizaciones
const db = require('../config/database');

class Quote {
  static async create(quoteData) {
    const [quote] = await db('quotes').insert({
      id: require('uuid').v4(),
      company_name: quoteData.company,
      contact_name: quoteData.contact,
      email: quoteData.email,
      phone: quoteData.phone,
      delivery_address: quoteData.location,
      status: 'pending',
      created_at: new Date()
    }).returning('*');
    
    return quote;
  }
  
  static async addProducts(quoteId, products) {
    const productItems = products.map(product => ({
      id: require('uuid').v4(),
      quote_id: quoteId,
      description: product.description,
      quantity: product.quantity,
      unit: product.unit,
      reference: product.reference,
      normalized_name: null // Se llenará con IA
    }));
    
    return await db('quote_products').insert(productItems).returning('*');
  }
  
  static async sendToSuppliers(quoteId, supplierIds) {
    const supplierQuotes = supplierIds.map(supplierId => ({
      id: require('uuid').v4(),
      quote_id: quoteId,
      supplier_id: supplierId,
      status: 'sent',
      sent_at: new Date(),
      response_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
    }));
    
    return await db('supplier_quotes').insert(supplierQuotes).returning('*');
  }
}

// services/AIDecisionService.js - Motor de decisiones con IA
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class AIDecisionService {
  static async normalizeProducts(products) {
    const prompt = `
    Normaliza los siguientes productos de ferretería a nombres estándar:
    ${JSON.stringify(products, null, 2)}
    
    Devuelve JSON con:
    - normalized_name: nombre estándar del producto
    - category: categoría (cemento, varilla, alambre, etc.)
    - standard_unit: unidad estándar
    - confidence: nivel de confianza 0-1
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
  
  static async optimizePurchaseDecision(quotes, priorities = {}) {
    const {
      priceWeight = 0.6,
      deliveryWeight = 0.3,
      reliabilityWeight = 0.1
    } = priorities;
    
    const prompt = `
    Analiza estas cotizaciones y optimiza la decisión de compra:
    ${JSON.stringify(quotes, null, 2)}
    
    Criterios de peso:
    - Precio: ${priceWeight}
    - Tiempo de entrega: ${deliveryWeight}  
    - Confiabilidad del proveedor: ${reliabilityWeight}
    
    Devuelve:
    1. recommended_orders: array de pedidos recomendados por proveedor
    2. total_savings: ahorro total vs comprar todo al proveedor más caro
    3. delivery_analysis: análisis de tiempos de entrega
    4. risk_assessment: evaluación de riesgos por dividir pedidos
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2
    });
    
    return JSON.parse(response.choices[0].message.content);
  }
  
  static async generateOptimalOrders(quoteResponses) {
    // Agrupa productos por mejor precio considerando plazos
    const analysis = await this.optimizePurchaseDecision(quoteResponses);
    
    const orders = [];
    
    for (const recommendation of analysis.recommended_orders) {
      const order = {
        supplier_id: recommendation.supplier_id,
        products: recommendation.products,
        total_amount: recommendation.total_amount,
        delivery_time: recommendation.delivery_time,
        priority_score: recommendation.priority_score,
        savings: recommendation.savings
      };
      
      orders.push(order);
    }
    
    return {
      orders,
      total_savings: analysis.total_savings,
      delivery_schedule: analysis.delivery_analysis,
      recommendations: analysis.risk_assessment
    };
  }
}

// routes/quotes.js - API endpoints para cotizaciones
const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const AIDecisionService = require('../services/AIDecisionService');
const NotificationService = require('../services/NotificationService');

// Crear nueva cotización
router.post('/', async (req, res) => {
  try {
    const { company, contact, email, phone, location, products, suppliers } = req.body;
    
    // 1. Crear cotización
    const quote = await Quote.create({ company, contact, email, phone, location });
    
    // 2. Normalizar productos con IA
    const normalizedProducts = await AIDecisionService.normalizeProducts(products);
    await Quote.addProducts(quote.id, normalizedProducts);
    
    // 3. Enviar a proveedores
    await Quote.sendToSuppliers(quote.id, suppliers);
    
    // 4. Notificar a proveedores
    await NotificationService.notifySuppliers(quote.id, suppliers);
    
    // 5. Notificar al cliente en tiempo real
    global.io.to(`quote-${quote.id}`).emit('quote-created', quote);
    
    res.json({ 
      success: true, 
      quote,
      message: 'Cotización enviada a proveedores'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recibir respuesta de proveedor
router.post('/:id/responses', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { supplier_id, products, delivery_time, total_amount } = req.body;
    
    // Guardar respuesta
    await db('supplier_quote_responses').insert({
      quote_id: quoteId,
      supplier_id,
      products: JSON.stringify(products),
      delivery_time,
      total_amount,
      received_at: new Date()
    });
    
    // Verificar si todas las respuestas han llegado
    const pendingResponses = await db('supplier_quotes')
      .where({ quote_id: quoteId, status: 'sent' })
      .whereNotExists(function() {
        this.select('*')
          .from('supplier_quote_responses')
          .whereRaw('supplier_quotes.supplier_id = supplier_quote_responses.supplier_id')
          .whereRaw('supplier_quotes.quote_id = supplier_quote_responses.quote_id');
      });
    
    // Si no hay respuestas pendientes, generar decisión con IA
    if (pendingResponses.length === 0) {
      const allResponses = await db('supplier_quote_responses')
        .where({ quote_id: quoteId });
        
      const optimalDecision = await AIDecisionService.generateOptimalOrders(allResponses);
      
      // Notificar al cliente
      global.io.to(`quote-${quoteId}`).emit('optimal-decision', optimalDecision);
    } else {
      // Notificar nueva respuesta
      global.io.to(`quote-${quoteId}`).emit('new-response', {
        supplier_id,
        total_amount,
        delivery_time
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// config/database.js - Configuración base de datos
const knex = require('knex');

const db = knex({
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'ferrecotiza',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'ferrecotiza'
  },
  pool: {
    min: 2,
    max: 10
  },
  migrations: {
    tableName: 'knex_migrations'
  }
});

module.exports = db;