import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

try {
  prisma = new PrismaClient();
} catch (error) {
  console.warn('Aviso: Não foi possível conectar ao banco de dados');
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ error: 'Banco de dados não disponível' }, { status: 500 });
  }

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const count = await prisma.spreadHistory.count({
      where: {
        timestamp: {
          lt: twentyFourHoursAgo,
        },
      },
    });
    return NextResponse.json({ oldRecordsCount: count });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro desconhecido' }, { status: 500 });
  }
} 