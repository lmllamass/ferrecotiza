// setup.js - Script para configuración inicial
require('dotenv').config();
const db = require('./config/database');

async function setupDatabase() {
  try {
    console.log('🗄️  Creando esquema de base de datos...');
    
    // Ejecutar migración
    await db.migrate.latest();
    console.log('✅ Migraciones ejecutadas correctamente');
    
    // Insertar datos de prueba
    console.log('📝 Insertando datos de prueba...');
    
    // Proveedores de prueba
    const suppliers = await db('suppliers').insert([
      {
        name: 'Ferretería El Constructor',
        contact_name: 'Carlos Hernández',
        email: 'ventas@elconstructor.com',
        phone: '(1) 234-5678',
        address: 'Calle 45 #23-67, Bogotá',
        latitude: 4.7110,
        longitude: -74.0721,
        delivery_radius_km: 30,
        rating: 4.5,
        response_time_avg: 45,
        reliability_score: 4.2
      },
      {
        name: 'Distribuidora Mega',
        contact_name: 'Ana López',
        email: 'cotizaciones@megadist.com',
        phone: '(1) 345-6789',
        address: 'Av. 30 #15-23, Bogotá',
        latitude: 4.6851,
        longitude: -74.0442,
        delivery_radius_km: 50,
        rating: 4.2,
        response_time_avg: 30,
        reliability_score: 4.0
      },
      {
        name: 'Ferretería Industrial Pro',
        contact_name: 'Miguel Torres',
        email: 'ventas@industrialpro.com',
        phone: '(1) 456-7890',
        address: 'Carrera 50 #28-45, Bogotá',
        latitude: 4.6682,
        longitude: -74.0816,
        delivery_radius_km: 40,
        rating: 4.8,
        response_time_avg: 20,
        reliability_score: 4.7
      }
    ]).returning('*');
    
    console.log(`✅ ${suppliers.length} proveedores insertados`);
    
    // Empresa de prueba
    const companies = await db('companies').insert([
      {
        name: 'Constructora ABC S.A.S',
        contact_name: 'Juan Pérez',
        email: 'compras@constructoraabc.com',
        phone: '+57 300 123 4567',
        address: 'Calle 100 #15-20, Bogotá',
        tax_id: '900123456-1'
      }
    ]).returning('*');
    
    console.log(`✅ ${companies.length} empresa de prueba insertada`);
    
    console.log('🎉 Base de datos configurada correctamente!');
    console.log('\n🚀 Para iniciar el servidor:');
    console.log('   npm run dev');
    
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error);
  } finally {
    await db.destroy();
  }
}

// package.json scripts que necesitas agregar
const packageScripts = {
  "dev": "nodemon server.js",
  "start": "node server.js",
  "setup": "node setup.js",
  "migrate": "knex migrate:latest",
  "rollback": "knex migrate:rollback"
};

console.log('\n📦 Agrega estos scripts a tu package.json:');
console.log(JSON.stringify(packageScripts, null, 2));

if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;

// knexfile.js - Configuración de Knex
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './ferrecotiza.db'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './migrations'
    }
  },
  
  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './migrations'
    }
  }
};

// routes/quotes.js - API endpoints principales
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Crear nueva cotización
router.post('/', async (req, res) => {
  try {
    const { company, contact, email, phone, location, products } = req.body;
    
    console.log('📝 Nueva cotización recibida:', { company, contact, products: products?.length });
    
    // 1. Crear cotización
    const [quote] = await db('quotes').insert({
      company_name: company,
      contact_name: contact,
      email,
      phone,
      delivery_address: location,
      status: 'draft',
      total_estimated_value: 0
    }).returning('*');
    
    console.log('✅ Cotización creada:', quote.id);
    
    // 2. Agregar productos
    if (products && products.length > 0) {
      const productInserts = products.map(product => ({
        quote_id: quote.id,
        description: product.description,
        quantity: parseInt(product.quantity),
        unit: product.unit,
        reference: product.reference
      }));
      
      await db('quote_products').insert(productInserts);
      console.log(`✅ ${products.length} productos agregados`);
    }
    
    // 3. Simular envío a proveedores (por ahora)
    const suppliers = await db('suppliers').where('active', true).limit(3);
    
    const supplierQuoteInserts = suppliers.map(supplier => ({
      quote_id: quote.id,
      supplier_id: supplier.id,
      status: 'sent',
      response_deadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }));
    
    await db('supplier_quotes').insert(supplierQuoteInserts);
    console.log(`✅ Cotización enviada a ${suppliers.length} proveedores`);
    
    // 4. Notificar en tiempo real
    if (global.io) {
      global.io.emit('new-quote', {
        quoteId: quote.id,
        company: quote.company_name,
        products: products?.length || 0
      });
    }
    
    res.json({
      success: true,
      quote: {
        id: quote.id,
        company: quote.company_name,
        status: quote.status,
        products: products?.length || 0,
        suppliers: suppliers.length
      },
      message: `Cotización enviada a ${suppliers.length} ferreterías`
    });
    
  } catch (error) {
    console.error('❌ Error creando cotización:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error.message 
    });
  }
});

// Obtener cotización por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const quote = await db('quotes').where('id', id).first();
    if (!quote) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }
    
    const products = await db('quote_products').where('quote_id', id);
    const supplierQuotes = await db('supplier_quotes')
      .join('suppliers', 'supplier_quotes.supplier_id', 'suppliers.id')
      .where('supplier_quotes.quote_id', id)
      .select('suppliers.name', 'supplier_quotes.*');
    
    res.json({
      quote,
      products,
      suppliers: supplierQuotes
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo cotización:', error);
    res.status(500).json({ error: error.message });
  }
});

// Listar todas las cotizaciones
router.get('/', async (req, res) => {
  try {
    const quotes = await db('quotes')
      .orderBy('created_at', 'desc')
      .limit(50);
      
    res.json({ quotes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;