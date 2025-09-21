-- migrations/001_create_base_tables.sql

-- Tabla de usuarios/empresas
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de proveedores/ferreterías
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  delivery_radius_km INTEGER DEFAULT 50,
  rating DECIMAL(3, 2) DEFAULT 0,
  response_time_avg INTEGER DEFAULT 0, -- minutos promedio de respuesta
  reliability_score DECIMAL(3, 2) DEFAULT 5.0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla principal de cotizaciones
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  company_name VARCHAR(255) NOT NULL,
  contact_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  delivery_address TEXT NOT NULL,
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  priority_price DECIMAL(3, 2) DEFAULT 0.6,
  priority_delivery DECIMAL(3, 2) DEFAULT 0.3,
  priority_reliability DECIMAL(3, 2) DEFAULT 0.1,
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, responded, decided, completed
  total_estimated_value DECIMAL(15, 2),
  ai_decision_ready BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos solicitados en cada cotización
CREATE TABLE quote_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit VARCHAR(50),
  reference VARCHAR(255),
  category VARCHAR(100),
  normalized_name VARCHAR(255), -- Nombre normalizado por IA
  normalized_category VARCHAR(100),
  standard_unit VARCHAR(50),
  ai_confidence DECIMAL(3, 2), -- Confianza de la normalización IA
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación cotización-proveedor (a quién se envió)
CREATE TABLE supplier_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  status VARCHAR(50) DEFAULT 'sent', -- sent, responded, expired
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  response_deadline TIMESTAMP,
  responded_at TIMESTAMP,
  UNIQUE(quote_id, supplier_id)
);

-- Respuestas de proveedores
CREATE TABLE supplier_quote_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  total_amount DECIMAL(15, 2) NOT NULL,
  delivery_time_days INTEGER NOT NULL,
  delivery_cost DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  validity_days INTEGER DEFAULT 15,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Productos cotizados por cada proveedor
CREATE TABLE supplier_product_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_response_id UUID REFERENCES supplier_quote_responses(id) ON DELETE CASCADE,
  quote_product_id UUID REFERENCES quote_products(id),
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  available_quantity INTEGER,
  delivery_time_days INTEGER,
  notes TEXT
);

-- Decisiones de compra generadas por IA
CREATE TABLE ai_purchase_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
  total_savings DECIMAL(15, 2),
  total_amount DECIMAL(15, 2),
  delivery_analysis JSONB,
  risk_assessment JSONB,
  decision_factors JSONB,
  confidence_score DECIMAL(3, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Órdenes de compra recomendadas
CREATE TABLE recommended_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_id UUID REFERENCES ai_purchase_decisions(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  total_amount DECIMAL(15, 2) NOT NULL,
  delivery_time_days INTEGER NOT NULL,
  priority_score DECIMAL(5, 2),
  savings_amount DECIMAL(15, 2),
  order_sequence INTEGER, -- Para ordenar las entregas
  status VARCHAR(50) DEFAULT 'recommended' -- recommended, approved, rejected
);

-- Productos en cada orden recomendada
CREATE TABLE recommended_order_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES recommended_orders(id) ON DELETE CASCADE,
  quote_product_id UUID REFERENCES quote_products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  total_price DECIMAL(15, 2) NOT NULL,
  reason TEXT -- Por qué se eligió este proveedor para este producto
);

-- Historial de decisiones y cambios
CREATE TABLE decision_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES quotes(id),
  decision_type VARCHAR(100), -- ai_recommendation, user_modification, final_approval
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar consultas
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_created_at ON quotes(created_at);
CREATE INDEX idx_supplier_quotes_quote_id ON supplier_quotes(quote_id);
CREATE INDEX idx_supplier_quotes_supplier_id ON supplier_quotes(supplier_id);
CREATE INDEX idx_quote_products_quote_id ON quote_products(quote_id);
CREATE INDEX idx_suppliers_location ON suppliers(latitude, longitude);
CREATE INDEX idx_suppliers_active ON suppliers(active);

-- Función para calcular distancia entre coordenadas
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL, lon1 DECIMAL, 
  lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    6371 * acos(
      cos(radians(lat1)) * cos(radians(lat2)) * 
      cos(radians(lon2) - radians(lon1)) + 
      sin(radians(lat1)) * sin(radians(lat2))
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Vista para proveedores cercanos
CREATE VIEW nearby_suppliers AS
SELECT 
  s.*,
  calculate_distance(s.latitude, s.longitude, 4.7110, -74.0721) as distance_km
FROM suppliers s
WHERE s.active = true
ORDER BY distance_km;

-- Triggers para actualizar timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_quotes_updated_at 
  BEFORE UPDATE ON quotes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at 
  BEFORE UPDATE ON companies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();