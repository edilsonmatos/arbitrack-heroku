import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DeleteResult {
    count: number;
}

async function cleanup() {
    try {
        console.log('Iniciando limpeza do banco de dados...');
        const timestamp = new Date().toISOString();

        // Deletar registros antigos do SpreadHistory (mais de 24 horas)
        const deletedSpreads = await prisma.spreadHistory.deleteMany({
            where: {
                timestamp: {
                    lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 horas atrás
                }
            }
        });
        console.log(`[${timestamp}] Deletados ${deletedSpreads.count} registros antigos de SpreadHistory`);

        // Deletar registros antigos do PriceHistory (mais de 24 horas)
        const deletedPrices = await prisma.$queryRaw<DeleteResult[]>`
            DELETE FROM "PriceHistory"
            WHERE timestamp < NOW() - INTERVAL '24 hours'
            RETURNING COUNT(*) as count
        `;
        console.log(`[${timestamp}] Deletados ${deletedPrices[0].count} registros antigos de PriceHistory`);

        // Contar registros restantes
        const remainingSpreads = await prisma.spreadHistory.count();
        const remainingPrices = await prisma.$queryRaw<DeleteResult[]>`
            SELECT COUNT(*) as count FROM "PriceHistory"
        `;

        console.log(`\n[${timestamp}] Registros restantes:`);
        console.log(`SpreadHistory: ${remainingSpreads}`);
        console.log(`PriceHistory: ${remainingPrices[0].count}`);

        console.log(`\n[${timestamp}] Limpeza concluída com sucesso!`);
    } catch (error) {
        console.error('Erro durante a limpeza:', error);
        throw error;
    }
}

// Agendar limpeza para rodar diariamente às 02:00 (mantém apenas últimas 24h)
cron.schedule('0 2 * * *', async () => {
    try {
        await cleanup();
    } catch (error) {
        console.error('Erro ao executar limpeza agendada:', error);
    }
});

// Também executar uma limpeza inicial ao iniciar o script
cleanup()
    .catch(error => {
        console.error('Erro na limpeza inicial:', error);
    });

console.log('Script de limpeza agendada iniciado. Rodará diariamente às 02:00 (mantém apenas últimas 24h).');

// Manter o processo rodando
process.on('SIGINT', async () => {
    console.log('Encerrando script de limpeza...');
    await prisma.$disconnect();
    process.exit(0);
}); 