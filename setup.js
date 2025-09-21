require('dotenv').config();
const db = require('./config/database');
const { v4: uuidv4 } = require('uuid');

async function setupDatabase() {
  try {
    console.log('🗄️  Creando esquema de base de datos...');
    
    await db.migrate.latest();
    console.log('✅ Migraciones ejecutadas correctamente');
    
    console.log('📝 Insertando datos de prueba...');
    
    // Generar IDs únicos
    const supplier1Id = uuidv4();
    const supplier2Id = uuidv4();
    const supplier3Id = uuidv4();
    const companyId = uuidv4();
    
    // Proveedores de prueba
    await db('suppliers').insert([
      {
        id: supplier1Id,
        name: 'Ferretería El Constructor',
        contact_name: 'Carlos Hernández',
        email: 'ventas@elconstructor.com',
        phone: '(1) 234-5678',
        address: 'Calle 45 #23-67, Bogotá',
        latitude: 4.7110,
        longitude: -74.0721,
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
        latitude: 4.6851,
        longitude: -74.0442,
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
        latitude: 4.6682,
        longitude: -74.0816,
        rating: 4.8,
        response_time_avg: 20,
        reliability_score: 4.7
      }
    ]);
    
    console.log('✅ 3 proveedores insertados');
    
    // Empresa de prueba
    await db('companies').insert([
      {
        id: companyId,
        name: 'Constructora ABC S.A.S',
        contact_name: 'Juan Pérez',
        email: 'compras@constructoraabc.com',
        phone: '+57 300 123 4567',
        address: 'Calle 100 #15-20, Bogotá',
        tax_id: '900123456-1'
      }
    ]);
    
    console.log('✅ 1 empresa de prueba insertada');
    console.log('🎉 Base de datos configurada correctamente!');
    
  } catch (error) {
    console.error('❌ Error configurando base de datos:', error);
  } finally {
    await db.destroy();
  }
}

if (require.main === module) {
  setupDatabase();
}
