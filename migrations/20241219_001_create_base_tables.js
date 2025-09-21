exports.up = function(knex) {
  return knex.schema
    .createTable('companies', function(table) {
      table.string('id').primary();
      table.string('name', 255).notNullable();
      table.string('contact_name', 255).notNullable();
      table.string('email', 255).unique().notNullable();
      table.string('phone', 50);
      table.text('address');
      table.string('tax_id', 50);
      table.timestamps(true, true);
    })
    
    .createTable('suppliers', function(table) {
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
    })
    
    .createTable('quotes', function(table) {
      table.string('id').primary();
      table.string('company_id').references('id').inTable('companies');
      table.string('company_name', 255).notNullable();
      table.string('contact_name', 255).notNullable();
      table.string('email', 255).notNullable();
      table.string('phone', 50);
      table.text('delivery_address').notNullable();
      table.decimal('delivery_latitude', 10, 8);
      table.decimal('delivery_longitude', 11, 8);
      table.string('status', 50).defaultTo('draft');
      table.decimal('total_estimated_value', 15, 2);
      table.boolean('ai_decision_ready').defaultTo(false);
      table.timestamps(true, true);
    })
    
    .createTable('quote_products', function(table) {
      table.string('id').primary();
      table.string('quote_id').references('id').inTable('quotes').onDelete('CASCADE');
      table.text('description').notNullable();
      table.integer('quantity').notNullable();
      table.string('unit', 50);
      table.string('reference', 255);
      table.string('category', 100);
      table.string('normalized_name', 255);
      table.timestamps(true, true);
    })
    
    .createTable('supplier_quotes', function(table) {
      table.string('id').primary();
      table.string('quote_id').references('id').inTable('quotes').onDelete('CASCADE');
      table.string('supplier_id').references('id').inTable('suppliers');
      table.string('status', 50).defaultTo('sent');
      table.timestamp('sent_at').defaultTo(knex.fn.now());
      table.timestamp('response_deadline');
      table.unique(['quote_id', 'supplier_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('supplier_quotes')
    .dropTableIfExists('quote_products')
    .dropTableIfExists('quotes')
    .dropTableIfExists('suppliers')
    .dropTableIfExists('companies');
};
