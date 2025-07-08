const { PrismaClient } = require('@prisma/client');

async function checkDatabaseStatus() {
  console.log('🔍 Verificando status do banco de dados...');
  
  let prisma;
  try {
    prisma = new PrismaClient();
    console.log('✅ Prisma Client criado com sucesso');
    
    // Testar conexão
    await prisma.$connect();
    console.log('✅ Conexão com banco de dados estabelecida');
    
    // Verificar configurações de API
    console.log('\n📋 Verificando configurações de API...');
    const configs = await prisma.apiConfiguration.findMany({
      select: {
        id: true,
        exchange: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log(`📊 Total de configurações encontradas: ${configs.length}`);
    
    if (configs.length > 0) {
      console.log('\n🔑 Configurações ativas:');
      configs.forEach(config => {
        console.log(`  - ${config.exchange.toUpperCase()}: ${config.isActive ? '✅ Ativa' : '❌ Inativa'} (ID: ${config.id})`);
      });
    } else {
      console.log('⚠️  Nenhuma configuração encontrada no banco de dados');
    }
    
    // Verificar variáveis de ambiente
    console.log('\n🌍 Verificando variáveis de ambiente...');
    const envVars = [
      'GATEIO_API_KEY',
      'MEXC_API_KEY', 
      'BINANCE_API_KEY',
      'BYBIT_API_KEY',
      'BITGET_API_KEY'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`  - ${varName}: ✅ Definida (${value.substring(0, 8)}...)`);
      } else {
        console.log(`  - ${varName}: ❌ Não definida`);
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao conectar com banco de dados:', error.message);
    
    // Verificar variáveis de ambiente como fallback
    console.log('\n🌍 Verificando variáveis de ambiente (fallback)...');
    const envVars = [
      'GATEIO_API_KEY',
      'MEXC_API_KEY', 
      'BINANCE_API_KEY',
      'BYBIT_API_KEY',
      'BITGET_API_KEY'
    ];
    
    let hasEnvKeys = false;
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`  - ${varName}: ✅ Definida (${value.substring(0, 8)}...)`);
        hasEnvKeys = true;
      } else {
        console.log(`  - ${varName}: ❌ Não definida`);
      }
    });
    
    if (hasEnvKeys) {
      console.log('\n⚠️  Sistema usando variáveis de ambiente como fallback (banco inacessível)');
    } else {
      console.log('\n❌ Nenhuma fonte de configuração disponível');
    }
  } finally {
    if (prisma) {
      await prisma.$disconnect();
      console.log('\n🔌 Conexão com banco de dados fechada');
    }
  }
}

checkDatabaseStatus().catch(console.error); 