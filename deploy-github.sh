#!/bin/bash

echo "🚀 Deploy de FerreCotiza desde GitHub..."

# Variables
REPO_URL="https://github.com/lmllamass/ferrecotiza.git"
DEPLOY_PATH="/var/www/ferrecotiza"
BRANCH="main"

# Crear directorio si no existe
sudo mkdir -p $DEPLOY_PATH

# Clonar o actualizar repositorio
if [ -d "$DEPLOY_PATH/.git" ]; then
    echo "📥 Actualizando repositorio existente..."
    cd $DEPLOY_PATH
    sudo git pull origin $BRANCH
else
    echo "📦 Clonando repositorio..."
    sudo git clone $REPO_URL $DEPLOY_PATH
    cd $DEPLOY_PATH
fi

# Instalar dependencias
echo "📋 Instalando dependencias..."
sudo npm ci --only=production

# Ejecutar migraciones si es necesario
echo "🗄️ Ejecutando migraciones..."
sudo npm run migrate

# Reiniciar servicio con PM2
echo "🔄 Reiniciando servicio..."
sudo pm2 restart ferrecotiza || sudo pm2 start ecosystem.config.js --env production

echo "✅ Deploy completado!"
echo "🌐 Disponible en: https://ferreteria1.com/ferrecotiza

