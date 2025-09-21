const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('📁 Archivo recibido:', file.originalname, file.mimetype);
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/excel', upload.single('file'), (req, res) => {
  try {
    console.log('📊 Procesando archivo Excel...');
    
    if (!req.file) {
      console.log('❌ No se recibió archivo');
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    console.log('📄 Archivo:', req.file.originalname, req.file.size, 'bytes');

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    console.log('📋 Datos del Excel:', jsonData.length, 'filas');
    
    const products = [];
    
    jsonData.forEach((row, index) => {
      const description = row['Descripcion'] || row['Descripción'] || row['Producto'] || row['Description'] || '';
      const quantity = row['Cantidad'] || row['Qty'] || row['Quantity'] || 0;
      const unit = row['Unidad'] || row['Unit'] || row['Medida'] || 'unidades';
      const reference = row['Referencia'] || row['Codigo'] || row['Code'] || row['SKU'] || '';
      
      if (description && quantity > 0) {
        products.push({
          description: String(description).trim(),
          quantity: parseInt(quantity),
          unit: String(unit).trim(),
          reference: String(reference).trim()
        });
      }
    });

    console.log('✅ Productos procesados:', products.length);

    res.json({
      success: true,
      products: products,
      total: products.length,
      message: `Se procesaron ${products.length} productos`
    });

  } catch (error) {
    console.error('❌ Error procesando Excel:', error);
    res.status(500).json({ 
      error: 'Error procesando archivo',
      details: error.message 
    });
  }
});

module.exports = router;
