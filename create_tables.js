const db = require('./config/database');
const { v4: uuidv4 } = require('uuid');

async function createTables() {
  try {
    console.log('🗄️ Creando tablas...');
    
    // Crear tabla suppliers
    await db.schema.dropTableIfExists('supplier_quote_responses');
    await db.schema.dropTableIfExists('supplier_quotes');
    await db.schema.dropTableIfExists('quote_products');
    await db.schema.dropTableIfExists('quotes');
    await db.schema.dropTableIfExists('suppliers');
    await db.schema.dropTableIfExists('companies');
    
    await db.schema.createTable('suppliers', function(table) {
      table.string('id').primary();
      table.string('name', 255).notNullable();
      table.string('contact_name', 255);
      table.string('email', 255).unique().notNullable();
      table.string('phone', 50);
      table.text('address');
      table.decimal('latitude', 10, 8);
      table.decimal('longitude', 11, 8);
      table.integer('delivery_radius_km').defaultTo(50);
      table.decimal('rating', 3, 2).defaultTo(0);
      table.integer('response_time_avg').defaultTo(0);
      table.decimal('reliability_score', 3, 2).defaultTo(5.0);
      table.boolean('active').defaultTo(true);
      table.timestamps(true, true);
    });
    
    await db.schema.createTable('companies', function(table) {
      table.string('id').primary();
      table.string('name', 255).notNullable();
      table.string('contact_name', 255).notNullable();
      table.string('email', 255).unique().notNullable();
      table.string('phone', 50);
      table.text('address');
      table.string('tax_id', 50);
      table.timestamps(true, true);
    });
    
    await db.schema.createTable('quotes', function(table) {
      table.string('id').primary();
      table.string('company_id').references('id').inTable('companies');
      table.string('company_name', 255).notNullable();
      table.string('contact_name', 255).notNullable();
      table.string('email', 255).notNullable();
      table.string('phone', 50);
      table.text('delivery_address').notNullable();
      table.string('status', 50).defaultTo('draft');
      table.boolean('ai_decision_ready').defaultTo(false);
      table.timestamps(true, true);
    });
    
    await db.schema.createTable('quote_products', function(table) {
      table.string('id').primary();
      table.string('quote_id').references('id').inTable('quotes').onDelete('CASCADE');
      table.text('description').notNullable();
      table.integer('quantity').notNullable();
      table.string('unit', 50);
      table.string('reference', 255);
      table.timestamps(true, true);
    });
    
    await db.schema.createTable('supplier_quotes', function(table) {
      table.string('id').primary();
      table.string('quote_id').references('id').inTable('quotes').onDelete('CASCADE');
      table.string('supplier_id').references('id').inTable('suppliers');
      table.string('status', 50).defaultTo('sent');
      table.timestamp('sent_at').defaultTo(db.fn.now());
      table.timestamp('response_deadline');
      table.unique(['quote_id', 'supplier_id']);
    });
    
    await db.schema.createTable('supplier_quote_responses', function(table) {
      table.string('id').primary();
      table.string('quote_id').references('id').inTable('quotes').onDelete('CASCADE');
      table.string('supplier_id').references('id').inTable('suppliers');
      table.decimal('total_amount', 15, 2).notNullable();
      table.integer('delivery_time_days').notNullable();
      table.decimal('delivery_cost', 15, 2).defaultTo(0);
      table.text('notes');
      table.timestamp('received_at').defaultTo(db.fn.now());
    });
    
    console.log('✅ Tablas creadas');
    
    // Insertar datos de prueba
    const supplier1Id = uuidv4();
    const supplier2Id = uuidv4();
    const supplier3Id = uuidv4();
    
    await db('suppliers').insert([
      {
        id: supplier1Id,
        name: 'Ferretería El Constructor',
        contact_name: 'Carlos Hernández',
        email: 'ventas@elconstructor.com',
        phone: '(1) 234-5678',
        address: 'Calle 45 #23-67, Bogotá',
        rating: 4.5,
        response_time_avg: 45,
        reliability_score: 4.2
      },
      {
        id: supplier2Id,
        name: 'Distribuidora Mega',
        contact_name: 'Ana López',
        email: 'cotizaciones@megadist.com',
        phone: '(1) 345-6789',
        address: 'Av. 30 #15-23, Bogotá',
        rating: 4.2,
        response_time_avg: 30,
        reliability_score: 4.0
      },
      {
        id: supplier3Id,
        name: 'Ferretería Industrial Pro',
        contact_name: 'Miguel Torres',
        email: 'ventas@industrialpro.com',
        phone: '(1) 456-7890',
        address: 'Carrera 50 #28-45, Bogotá',
        rating: 4.8,
        response_time_avg: 20,
        reliability_score: 4.7
      }
    ]);
    
    console.log('✅ Datos de prueba insertados');
    console.log('🎉 Base de datos lista');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.destroy();
  }
}

createTables();
