const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Login de proveedor
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const supplier = await db('suppliers').where('email', email).first();
    
    if (!supplier) {
      return res.status(401).json({ error: 'Proveedor no encontrado' });
    }
    
    res.json({
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
        email: supplier.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener cotizaciones (activas y respondidas)
router.get('/:supplierId/quotes', async (req, res) => {
  try {
    const { supplierId } = req.params;
    
    const quotes = await db('supplier_quotes')
      .join('quotes', 'supplier_quotes.quote_id', 'quotes.id')
      .where('supplier_quotes.supplier_id', supplierId)
      .whereIn('supplier_quotes.status', ['sent', 'responded'])
      .where('supplier_quotes.response_deadline', '>', new Date())
      .select('quotes.*', 'supplier_quotes.sent_at', 'supplier_quotes.response_deadline', 'supplier_quotes.status as quote_status');
    
    for (let quote of quotes) {
      quote.products = await db('quote_products').where('quote_id', quote.id);
      
      if (quote.quote_status === 'responded') {
        const response = await db('supplier_quote_responses')
          .where({ quote_id: quote.id, supplier_id: supplierId })
          .first();
        
        if (response) {
          quote.current_response = response;
          quote.product_prices = await db('supplier_product_quotes')
            .where('supplier_response_id', response.id);
        }
      }
    }
    
    res.json({ quotes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener señales competitivas (sin datos específicos)
router.get('/quotes/:quoteId/competition/:supplierId', async (req, res) => {
  try {
    const { quoteId, supplierId } = req.params;
    
    // Obtener respuestas de competidores
    const competitorResponses = await db('supplier_quote_responses')
      .join('suppliers', 'supplier_quote_responses.supplier_id', 'suppliers.id')
      .leftJoin('supplier_product_quotes', 'supplier_quote_responses.id', 'supplier_product_quotes.supplier_response_id')
      .leftJoin('quote_products', 'supplier_product_quotes.quote_product_id', 'quote_products.id')
      .where('supplier_quote_responses.quote_id', quoteId)
      .where('supplier_quote_responses.supplier_id', '!=', supplierId)
      .select(
        'supplier_quote_responses.total_amount',
        'quote_products.id as product_id',
        'supplier_product_quotes.unit_price'
      );
    
    // Procesar competencia por producto (solo rangos, no valores exactos)
    const products = await db('quote_products').where('quote_id', quoteId);
    const productCompetition = {};
    
    products.forEach(product => {
      const productPrices = competitorResponses
        .filter(r => r.product_id === product.id && r.unit_price)
        .map(r => r.unit_price);
      
      if (productPrices.length > 0) {
        productCompetition[product.id] = {
          min_price: Math.min(...productPrices),
          max_price: Math.max(...productPrices),
          competitor_count: productPrices.length
        };
      }
    });
    
    // Competencia de totales (solo rangos)
    const totalPrices = competitorResponses
      .filter(r => r.total_amount)
      .map(r => r.total_amount);
    
    const totalCompetition = totalPrices.length > 0 ? {
      min_total: Math.min(...totalPrices),
      max_total: Math.max(...totalPrices),
      competitor_count: totalPrices.length
    } : null;
    
    res.json({ 
      product_competition: productCompetition,
      total_competition: totalCompetition
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Enviar o actualizar cotización
router.post('/quotes/:quoteId/respond', async (req, res) => {
  try {
    const { quoteId } = req.params;
    const { supplier_id, delivery_time_days, notes, product_prices } = req.body;
    
    const existingResponse = await db('supplier_quote_responses')
      .where({ quote_id: quoteId, supplier_id })
      .first();
    
    const total_amount = Object.values(product_prices).reduce((sum, price) => sum + parseFloat(price.total || 0), 0);
    
    let responseId;
    
    if (existingResponse) {
      responseId = existingResponse.id;
      
      await db('supplier_quote_responses')
        .where('id', responseId)
        .update({
          total_amount,
          delivery_time_days,
          notes,
          received_at: new Date()
        });
      
      await db('supplier_product_quotes')
        .where('supplier_response_id', responseId)
        .del();
      
    } else {
      responseId = require('uuid').v4();
      
      await db('supplier_quote_responses').insert({
        id: responseId,
        quote_id: quoteId,
        supplier_id,
        total_amount,
        delivery_time_days,
        notes,
        received_at: new Date()
      });
      
      await db('supplier_quotes')
        .where({ quote_id: quoteId, supplier_id })
        .update({ 
          status: 'responded', 
          responded_at: new Date() 
        });
    }
    
    const productInserts = [];
    for (const [productId, priceData] of Object.entries(product_prices)) {
      productInserts.push({
        id: require('uuid').v4(),
        supplier_response_id: responseId,
        quote_product_id: productId,
        unit_price: parseFloat(priceData.unit_price),
        total_price: parseFloat(priceData.total),
        notes: priceData.notes || null
      });
    }
    
    if (productInserts.length > 0) {
      await db('supplier_product_quotes').insert(productInserts);
    }
    
    const action = existingResponse ? 'actualizada' : 'enviada';
    res.json({ 
      success: true, 
      message: `Cotización ${action} correctamente`, 
      total_amount,
      updated: !!existingResponse
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Obtener cotizaciones vencidas
router.get('/:supplierId/quotes/expired', async (req, res) => {
  try {
    const { supplierId } = req.params;
    
    const quotes = await db('supplier_quotes')
      .join('quotes', 'supplier_quotes.quote_id', 'quotes.id')
      .where('supplier_quotes.supplier_id', supplierId)
      .where('supplier_quotes.response_deadline', '<', new Date())
      .select('quotes.*', 'supplier_quotes.sent_at', 'supplier_quotes.response_deadline', 'supplier_quotes.status as quote_status');
    
    for (let quote of quotes) {
      quote.products = await db('quote_products').where('quote_id', quote.id);
      
      if (quote.quote_status === 'responded') {
        const response = await db('supplier_quote_responses')
          .where({ quote_id: quote.id, supplier_id: supplierId })
          .first();
        
        if (response) {
          quote.current_response = response;
        }
      }
    }
    
    res.json({ quotes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
