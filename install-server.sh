#!/bin/bash

echo "🛠️ Instalando FerreCotiza en servidor..."

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Instalar Nginx
sudo apt install nginx -y

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Certbot para SSL
sudo apt install certbot python3-certbot-nginx -y

echo "✅ Dependencias instaladas"

# Configurar PostgreSQL
sudo -u postgres psql << PSQL
CREATE DATABASE ferrecotiza_prod;
CREATE USER ferrecotiza_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE ferrecotiza_prod TO ferrecotiza_user;
\q
PSQL

echo "✅ Base de datos PostgreSQL configurada"

# Configurar SSL con Let's Encrypt
sudo certbot --nginx -d ferreteria1.com -d www.ferreteria1.com

echo "✅ SSL configurado"

echo "🎉 Servidor listo para FerreCotiza"
echo ""
echo "📋 Para completar el deploy:"
echo "1. Subir archivos del proyecto a /var/www/ferrecotiza/"
echo "2. cd /var/www/ferrecotiza && npm install"
echo "3. pm2 start ecosystem.config.js --env production"
echo "4. pm2 save && pm2 startup"
