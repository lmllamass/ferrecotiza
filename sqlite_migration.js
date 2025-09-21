// migrations/20241219_001_create_base_tables.js
exports.up = function(knex) {
  return knex.schema
    // Tabla de empresas/clientes
    .createTable('companies', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
      table.string('name', 255).notNullable();
      table.string('contact_name', 255).notNullable();
      table.string('email', 255).unique().notNullable();
      table.string('phone', 50);
      table.text('address');
      table.string('tax_id', 50);
      table.timestamps(true, true);
    })
    
    // Tabla de proveedores/ferreterías
    .createTable('suppliers', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
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
    })
    
    // Tabla principal de cotizaciones
    .createTable('quotes', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
      table.uuid('company_id').references('id').inTable('companies');
      table.string('company_name', 255).notNullable();
      table.string('contact_name', 255).notNullable();
      table.string('email', 255).notNullable();
      table.string('phone', 50);
      table.text('delivery_address').notNullable();
      table.decimal('delivery_latitude', 10, 8);
      table.decimal('delivery_longitude', 11, 8);
      table.decimal('priority_price', 3, 2).defaultTo(0.6);
      table.decimal('priority_delivery', 3, 2).defaultTo(0.3);
      table.decimal('priority_reliability', 3, 2).defaultTo(0.1);
      table.string('status', 50).defaultTo('draft');
      table.decimal('total_estimated_value', 15, 2);
      table.boolean('ai_decision_ready').defaultTo(false);
      table.timestamps(true, true);
    })
    
    // Productos solicitados en cada cotización
    .createTable('quote_products', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
      table.uuid('quote_id').references('id').inTable('quotes').onDelete('CASCADE');
      table.text('description').notNullable();
      table.integer('quantity').notNullable();
      table.string('unit', 50);
      table.string('reference', 255);
      table.string('category', 100);
      table.string('normalized_name', 255);
      table.string('normalized_category', 100);
      table.string('standard_unit', 50);
      table.decimal('ai_confidence', 3, 2);
      table.timestamps(true, true);
    })
    
    // Relación cotización-proveedor
    .createTable('supplier_quotes', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
      table.uuid('quote_id').references('id').inTable('quotes').onDelete('CASCADE');
      table.uuid('supplier_id').references('id').inTable('suppliers');
      table.string('status', 50).defaultTo('sent');
      table.timestamp('sent_at').defaultTo(knex.fn.now());
      table.timestamp('response_deadline');
      table.timestamp('responded_at');
      table.unique(['quote_id', 'supplier_id']);
    })
    
    // Respuestas de proveedores
    .createTable('supplier_quote_responses', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
      table.uuid('quote_id').references('id').inTable('quotes').onDelete('CASCADE');
      table.uuid('supplier_id').references('id').inTable('suppliers');
      table.decimal('total_amount', 15, 2).notNullable();
      table.integer('delivery_time_days').notNullable();
      table.decimal('delivery_cost', 15, 2).defaultTo(0);
      table.text('notes');
      table.integer('validity_days').defaultTo(15);
      table.timestamp('received_at').defaultTo(knex.fn.now());
    })
    
    // Productos cotizados por cada proveedor
    .createTable('supplier_product_quotes', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
      table.uuid('supplier_response_id').references('id').inTable('supplier_quote_responses').onDelete('CASCADE');
      table.uuid('quote_product_id').references('id').inTable('quote_products');
      table.decimal('unit_price', 15, 2).notNullable();
      table.decimal('total_price', 15, 2).notNullable();
      table.integer('available_quantity');
      table.integer('delivery_time_days');
      table.text('notes');
    })
    
    // Decisiones de compra IA
    .createTable('ai_purchase_decisions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
      table.uuid('quote_id').references('id').inTable('quotes').onDelete('CASCADE');
      table.decimal('total_savings', 15, 2);
      table.decimal('total_amount', 15, 2);
      table.json('delivery_analysis');
      table.json('risk_assessment');
      table.json('decision_factors');
      table.decimal('confidence_score', 3, 2);
      table.timestamps(true, true);
    })
    
    // Órdenes recomendadas
    .createTable('recommended_orders', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
      table.uuid('decision_id').references('id').inTable('ai_purchase_decisions').onDelete('CASCADE');
      table.uuid('supplier_id').references('id').inTable('suppliers');
      table.decimal('total_amount', 15, 2).notNullable();
      table.integer('delivery_time_days').notNullable();
      table.decimal('priority_score', 5, 2);
      table.decimal('savings_amount', 15, 2);
      table.integer('order_sequence');
      table.string('status', 50).defaultTo('recommended');
    })
    
    // Productos en órdenes recomendadas
    .createTable('recommended_order_products', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('lower(hex(randomblob(16)))'));
      table.uuid('order_id').references('id').inTable('recommended_orders').onDelete('CASCADE');
      table.uuid('quote_product_id').references('id').inTable('quote_products');
      table.integer('quantity').notNullable();
      table.decimal('unit_price', 15, 2).notNullable();
      table.decimal('total_price', 15, 2).notNullable();
      table.text('reason');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('recommended_order_products')
    .dropTableIfExists('recommended_orders')
    .dropTableIfExists('ai_purchase_decisions')
    .dropTableIfExists('supplier_product_quotes')
    .dropTableIfExists('supplier_quote_responses')
    .dropTableIfExists('supplier_quotes')
    .dropTableIfExists('quote_products')
    .dropTableIfExists('quotes')
    .dropTableIfExists('suppliers')
    .dropTableIfExists('companies');
};