"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function cleanupOldData() {
    const now = new Date();
    const cutoff = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const spreadResult = await prisma.spreadHistory.deleteMany({
        where: {
            timestamp: {
                lt: cutoff,
            },
        },
    });
    const priceResult = await prisma.priceHistory.deleteMany({
        where: {
            timestamp: {
                lt: cutoff,
            },
        },
    });
    console.log(`Registros excluídos de SpreadHistory: ${spreadResult.count}`);
    console.log(`Registros excluídos de PriceHistory: ${priceResult.count}`);
    await prisma.$disconnect();
}
cleanupOldData().catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
});
//# sourceMappingURL=cleanupOldData.js.map