import 'dotenv/config';
import { MovementType, PrismaClient } from '@prisma/client';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed inventory with NODE_ENV=production.');
  process.exit(1);
}

const DEMO = '00000000-0000-4000-8000-000000000001';
const PEPE = '00000000-0000-4000-8000-000000000002';
const LAPIZ = '00000000-0000-4000-8000-000000000003';
const prisma = new PrismaClient();

type StockSeed = {
  id: string;
  businessId: string;
  productId: string;
  createdBy: string;
  quantity: number;
  minQuantity: number;
  openingId: string;
  openingQty: number;
  saleOut?: { id: string; quantity: number; saleId: string; at: string };
};

const stocks: StockSeed[] = [
  { id: '00000000-0000-4000-8000-000000000401', businessId: DEMO, createdBy: '00000000-0000-4000-8000-0000000000a1', productId: '00000000-0000-4000-8000-000000000101', quantity: 40, minQuantity: 10, openingId: '00000000-0000-4000-8000-000000000501', openingQty: 44, saleOut: { id: '00000000-0000-4000-8000-000000000601', quantity: 4, saleId: '00000000-0000-4000-8000-000000000701', at: '2026-10-02T15:10:00.000Z' } },
  { id: '00000000-0000-4000-8000-000000000402', businessId: DEMO, createdBy: '00000000-0000-4000-8000-0000000000a1', productId: '00000000-0000-4000-8000-000000000102', quantity: 12, minQuantity: 5, openingId: '00000000-0000-4000-8000-000000000502', openingQty: 13, saleOut: { id: '00000000-0000-4000-8000-000000000602', quantity: 1, saleId: '00000000-0000-4000-8000-000000000701', at: '2026-10-02T15:10:00.000Z' } },
  { id: '00000000-0000-4000-8000-000000000403', businessId: DEMO, createdBy: '00000000-0000-4000-8000-0000000000a1', productId: '00000000-0000-4000-8000-000000000103', quantity: 2, minQuantity: 8, openingId: '00000000-0000-4000-8000-000000000503', openingQty: 4, saleOut: { id: '00000000-0000-4000-8000-000000000603', quantity: 2, saleId: '00000000-0000-4000-8000-000000000702', at: '2026-10-10T18:00:00.000Z' } },
  { id: '00000000-0000-4000-8000-000000000404', businessId: PEPE, createdBy: '00000000-0000-4000-8000-0000000000a2', productId: '00000000-0000-4000-8000-000000000201', quantity: 15, minQuantity: 4, openingId: '00000000-0000-4000-8000-000000000504', openingQty: 17, saleOut: { id: '00000000-0000-4000-8000-000000000604', quantity: 2, saleId: '00000000-0000-4000-8000-000000000703', at: '2026-10-05T16:00:00.000Z' } },
  { id: '00000000-0000-4000-8000-000000000405', businessId: PEPE, createdBy: '00000000-0000-4000-8000-0000000000a2', productId: '00000000-0000-4000-8000-000000000202', quantity: 0, minQuantity: 5, openingId: '00000000-0000-4000-8000-000000000505', openingQty: 0 },
  { id: '00000000-0000-4000-8000-000000000406', businessId: PEPE, createdBy: '00000000-0000-4000-8000-0000000000a2', productId: '00000000-0000-4000-8000-000000000203', quantity: 25, minQuantity: 6, openingId: '00000000-0000-4000-8000-000000000506', openingQty: 25 },
  { id: '00000000-0000-4000-8000-000000000407', businessId: LAPIZ, createdBy: '00000000-0000-4000-8000-0000000000a3', productId: '00000000-0000-4000-8000-000000000301', quantity: 200, minQuantity: 50, openingId: '00000000-0000-4000-8000-000000000507', openingQty: 210, saleOut: { id: '00000000-0000-4000-8000-000000000607', quantity: 10, saleId: '00000000-0000-4000-8000-000000000705', at: '2026-10-08T14:00:00.000Z' } },
  { id: '00000000-0000-4000-8000-000000000408', businessId: LAPIZ, createdBy: '00000000-0000-4000-8000-0000000000a3', productId: '00000000-0000-4000-8000-000000000302', quantity: 35, minQuantity: 10, openingId: '00000000-0000-4000-8000-000000000508', openingQty: 37, saleOut: { id: '00000000-0000-4000-8000-000000000608', quantity: 2, saleId: '00000000-0000-4000-8000-000000000705', at: '2026-10-08T14:00:00.000Z' } },
  { id: '00000000-0000-4000-8000-000000000409', businessId: LAPIZ, createdBy: '00000000-0000-4000-8000-0000000000a3', productId: '00000000-0000-4000-8000-000000000303', quantity: 8, minQuantity: 10, openingId: '00000000-0000-4000-8000-000000000509', openingQty: 9, saleOut: { id: '00000000-0000-4000-8000-000000000609', quantity: 1, saleId: '00000000-0000-4000-8000-000000000706', at: '2026-10-13T19:30:00.000Z' } },
];

async function main(): Promise<void> {
  for (const stock of stocks) {
    const item = await prisma.stockItem.upsert({
      where: { businessId_productId: { businessId: stock.businessId, productId: stock.productId } },
      update: { quantity: stock.quantity, minQuantity: stock.minQuantity },
      create: {
        id: stock.id,
        businessId: stock.businessId,
        productId: stock.productId,
        quantity: stock.quantity,
        minQuantity: stock.minQuantity,
      },
    });

    if (stock.openingQty > 0) {
      await prisma.movement.upsert({
        where: { id: stock.openingId },
        update: { quantity: stock.openingQty, stockAfter: stock.openingQty, stockItemId: item.id },
        create: {
          id: stock.openingId,
          businessId: stock.businessId,
          stockItemId: item.id,
          productId: stock.productId,
          type: MovementType.IN,
          quantity: stock.openingQty,
          stockAfter: stock.openingQty,
          reason: 'Carga inicial de prueba',
          createdBy: stock.createdBy,
          createdAt: new Date('2026-10-01T12:00:00.000Z'),
        },
      });
    }

    if (stock.saleOut) {
      await prisma.movement.upsert({
        where: { id: stock.saleOut.id },
        update: {
          quantity: stock.saleOut.quantity,
          stockAfter: stock.quantity,
          stockItemId: item.id,
          referenceId: stock.saleOut.saleId,
        },
        create: {
          id: stock.saleOut.id,
          businessId: stock.businessId,
          stockItemId: item.id,
          productId: stock.productId,
          type: MovementType.OUT,
          quantity: stock.saleOut.quantity,
          stockAfter: stock.quantity,
          reason: 'Venta de prueba',
          referenceType: 'sale',
          referenceId: stock.saleOut.saleId,
          createdBy: stock.createdBy,
          createdAt: new Date(stock.saleOut.at),
        },
      });
    }
  }

  console.log(`Inventory seed ready: ${stocks.length} stock items.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
