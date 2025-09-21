const { v4: uuidv4 } = require('uuid');

class AIDecisionService {
  static async normalizeProducts(products) {
    console.log('Normalizando productos básicamente...');
    
    return products.map(product => {
      const category = this.detectCategory(product.description);
      const estimatedPrice = this.estimatePrice(product.description, category);
      
      return {
        ...product,
        normalized_name: product.description.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim(),
        category: category,
        standard_unit: product.unit,
        estimated_unit_price_cop: estimatedPrice,
        confidence: 0.9,
        ai_processed: true
      };
    });
  }

  static estimatePrice(description, category) {
    const desc = description.toLowerCase();
    
    if (desc.includes('cemento')) {
      if (desc.includes('50kg') || desc.includes('bulto')) return 18500;
      return 18000;
    }
    if (desc.includes('varilla') || desc.includes('hierro')) {
      if (desc.includes('3/8') || desc.includes('12m')) return 45000;
      if (desc.includes('1/2')) return 62000;
      return 45000;
    }
    if (desc.includes('cable') || desc.includes('thhn')) {
      if (desc.includes('12')) return 4200;
      if (desc.includes('14')) return 3800;
      return 3500;
    }
    if (desc.includes('pintura')) {
      if (desc.includes('20') || desc.includes('galon')) return 85000;
      return 25000;
    }
    if (desc.includes('interruptor')) {
      if (desc.includes('doble')) return 12000;
      return 8500;
    }
    
    const basePrices = {
      'cemento': 18000,
      'acero': 45000,
      'mamposteria': 800,
      'electricidad': 8000,
      'pintura': 25000,
      'herramientas': 15000,
      'otros': 5000
    };
    
    return basePrices[category] || basePrices['otros'];
  }

  static async generateMarketAnalysis(products, responses) {
    const priceRange = Math.max(...responses.map(r => r.total_amount)) - Math.min(...responses.map(r => r.total_amount));
    const avgPrice = responses.reduce((sum, r) => sum + r.total_amount, 0) / responses.length;
    const variation = ((priceRange / avgPrice) * 100).toFixed(1);
    
    return {
      market_insights: `Análisis de mercado: encontramos ${responses.length} proveedores competitivos con una variación de precios del ${variation}%`,
      price_analysis: `Los precios varían entre $${Math.min(...responses.map(r => r.total_amount)).toLocaleString()} y $${Math.max(...responses.map(r => r.total_amount)).toLocaleString()}`,
      recommendations: "Recomendamos considerar el equilibrio entre precio, tiempo de entrega y confiabilidad del proveedor",
      negotiation_tips: `Con una variación del ${variation}%, hay margen para negociar descuentos adicionales por volumen`
    };
  }

  static async simulateSupplierResponses(quoteId, products) {
    const db = require('../config/database');
    
    const normalizedProducts = await this.normalizeProducts(products);
    const suppliers = await db('suppliers').where('active', true);
    const responses = [];
    
    for (const supplier of suppliers) {
      const basePrice = this.calculateSmartPrice(normalizedProducts, supplier);
      const variation = 0.88 + (Math.random() * 0.24);
      const totalAmount = Math.round(basePrice * variation);
      const deliveryDays = this.calculateDeliveryTime(supplier, normalizedProducts);
      
      const responseId = uuidv4();
      
      await db('supplier_quote_responses').insert({
        id: responseId,
        quote_id: quoteId,
        supplier_id: supplier.id,
        total_amount: totalAmount,
        delivery_time_days: deliveryDays,
        received_at: new Date()
      });
      
      responses.push({
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        total_amount: totalAmount,
        delivery_time_days: deliveryDays,
        reliability_score: supplier.reliability_score
      });
    }
    
    console.log(`Generadas ${responses.length} respuestas de proveedores`);
    return responses;
  }

  static calculateSmartPrice(normalizedProducts, supplier) {
    return normalizedProducts.reduce((total, product) => {
      const unitPrice = product.estimated_unit_price_cop;
      const supplierMultiplier = supplier.reliability_score > 4.5 ? 1.03 : 0.98;
      
      return total + (unitPrice * product.quantity * supplierMultiplier);
    }, 0);
  }

  static calculateDeliveryTime(supplier, products) {
    let baseTime = Math.floor(Math.random() * 3) + 1;
    
    if (supplier.reliability_score > 4.5) {
      baseTime = Math.max(1, baseTime - 1);
    }
    
    const hasComplexProducts = products.some(p => 
      p.category === 'electricidad' || p.quantity > 500
    );
    
    if (hasComplexProducts) {
      baseTime += 1;
    }
    
    return Math.min(baseTime, 7);
  }

  static detectCategory(description) {
    const desc = description.toLowerCase();
    if (desc.includes('cemento')) return 'cemento';
    if (desc.includes('varilla') || desc.includes('hierro') || desc.includes('acero')) return 'acero';
    if (desc.includes('bloque') || desc.includes('ladrillo') || desc.includes('arena')) return 'mamposteria';
    if (desc.includes('cable') || desc.includes('interruptor') || desc.includes('tomacorriente') || desc.includes('thhn')) return 'electricidad';
    if (desc.includes('pintura') || desc.includes('barniz') || desc.includes('esmalte') || desc.includes('látex')) return 'pintura';
    if (desc.includes('taladro') || desc.includes('martillo') || desc.includes('destornillador')) return 'herramientas';
    return 'otros';
  }

  static async generateOptimalDecision(quoteId) {
    const db = require('../config/database');
    
    const responses = await db('supplier_quote_responses')
      .join('suppliers', 'supplier_quote_responses.supplier_id', 'suppliers.id')
      .where('supplier_quote_responses.quote_id', quoteId)
      .select('supplier_quote_responses.*', 'suppliers.name as supplier_name', 'suppliers.reliability_score');
    
    if (responses.length === 0) return null;

    const products = await db('quote_products').where('quote_id', quoteId);
    const marketAnalysis = await this.generateMarketAnalysis(products, responses);
    
    const scoredResponses = responses.map(response => {
      const priceScore = (Math.min(...responses.map(r => r.total_amount)) / response.total_amount) * 0.5;
      const deliveryScore = (Math.min(...responses.map(r => r.delivery_time_days)) / response.delivery_time_days) * 0.3;
      const reliabilityScore = (response.reliability_score / 5) * 0.2;
      
      return {
        ...response,
        total_score: priceScore + deliveryScore + reliabilityScore,
        price_score: priceScore,
        delivery_score: deliveryScore,
        reliability_score: reliabilityScore
      };
    });
    
    scoredResponses.sort((a, b) => b.total_score - a.total_score);
    
    const bestOption = scoredResponses[0];
    const worstPrice = Math.max(...responses.map(r => r.total_amount));
    const savings = worstPrice - bestOption.total_amount;
    
    console.log(`Decisión generada: mejor opción ${bestOption.supplier_name} con ahorro de $${savings.toLocaleString()}`);
    
    return {
      recommended_supplier: bestOption,
      all_options: scoredResponses,
      total_savings: savings,
      savings_percentage: ((savings / worstPrice) * 100).toFixed(1),
      market_analysis: marketAnalysis,
      decision_factors: {
        price_weight: 50,
        delivery_weight: 30,
        reliability_weight: 20
      },
      ai_powered: true
    };
  }
}

module.exports = AIDecisionService;
