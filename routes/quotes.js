const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const AIDecisionService = require('../services/AIDecisionService');

router.post('/', async (req, res) => {
  try {
    const { company, contact, email, phone, location, products } = req.body;
    
    console.log('📝 Nueva cotización:', { company, contact, products: products?.length });
    
    const quoteId = uuidv4();
    
    await db('quotes').insert({
      id: quoteId,
      company_name: company,
      contact_name: contact,
      email: email,
      phone: phone,
      delivery_address: location,
      status: 'processing'
    });
    
    if (products && products.length > 0) {
      const productInserts = products.map(product => ({
        id: uuidv4(),
        quote_id: quoteId,
        description: product.description,
        quantity: parseInt(product.quantity),
        unit: product.unit,
        reference: product.reference
      }));
      await db('quote_products').insert(productInserts);
      
      // Simular respuestas de proveedores después de 2 segundos
      setTimeout(async () => {
        try {
          const responses = await AIDecisionService.simulateSupplierResponses(quoteId, products);
          await db('quotes').where('id', quoteId).update({ 
            status: 'completed',
            ai_decision_ready: true 
          });
          console.log(`✅ Decisión IA generada para cotización ${quoteId}`);
        } catch (error) {
          console.error('❌ Error generando decisión IA:', error);
        }
      }, 2000);
    }
    
    res.json({
      success: true,
      quote: { 
        id: quoteId, 
        company: company,
        status: 'processing'
      }
    });
    
  } catch (error) {
    console.error('❌ Error creando cotización:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/decision', async (req, res) => {
  try {
    const decision = await AIDecisionService.generateOptimalDecision(req.params.id);
    if (!decision) {
      return res.json({ ready: false });
    }
    
    res.json({ 
      ready: true, 
      decision: decision 
    });
  } catch (error) {
    console.error('❌ Error obteniendo decisión:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
