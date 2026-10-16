import 'dotenv/config';
import { PrismaClient, SaleStatus } from '@prisma/client';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed sales with NODE_ENV=production.');
  process.exit(1);
}

const DEMO = '00000000-0000-4000-8000-000000000001';
const PEPE = '00000000-0000-4000-8000-000000000002';
const LAPIZ = '00000000-0000-4000-8000-000000000003';

const prisma = new PrismaClient();

type LineSeed = {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

type SaleSeed = {
  id: string;
  businessId: string;
  status: SaleStatus;
  total: string;
  note: string;
  createdBy: string;
  idempotencyKey: string;
  createdAt: string;
  failureCode?: string;
  failureReason?: string;
  lines: LineSeed[];
};

const sales: SaleSeed[] = [
  {
    id: '00000000-0000-4000-8000-000000000701',
    businessId: DEMO,
    status: SaleStatus.CONFIRMED,
    total: '14.90',
    note: 'Venta de mostrador',
    createdBy: '00000000-0000-4000-8000-0000000000a1',
    idempotencyKey: 'seed:sale:701',
    createdAt: '2026-10-02T15:00:00.000Z',
    lines: [
      { id: '00000000-0000-4000-8000-000000000801', productId: '00000000-0000-4000-8000-000000000101', sku: 'AGUA-600', productName: 'Agua 600 ml', quantity: 4, unitPrice: '1.50', lineTotal: '6.00' },
      { id: '00000000-0000-4000-8000-000000000802', productId: '00000000-0000-4000-8000-000000000102', sku: 'CAFE-250', productName: 'Café molido 250 g', quantity: 1, unitPrice: '8.90', lineTotal: '8.90' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000702',
    businessId: DEMO,
    status: SaleStatus.CONFIRMED,
    total: '6.50',
    note: 'Pedido de despensa',
    createdBy: '00000000-0000-4000-8000-0000000000a1',
    idempotencyKey: 'seed:sale:702',
    createdAt: '2026-10-10T18:00:00.000Z',
    lines: [
      { id: '00000000-0000-4000-8000-000000000803', productId: '00000000-0000-4000-8000-000000000103', sku: 'ARROZ-1K', productName: 'Arroz 1 kg', quantity: 2, unitPrice: '3.25', lineTotal: '6.50' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000704',
    businessId: DEMO,
    status: SaleStatus.CANCELLED,
    total: '1.50',
    note: 'Cancelada en caja',
    createdBy: '00000000-0000-4000-8000-0000000000a1',
    idempotencyKey: 'seed:sale:704',
    createdAt: '2026-10-14T13:20:00.000Z',
    lines: [
      { id: '00000000-0000-4000-8000-000000000804', productId: '00000000-0000-4000-8000-000000000101', sku: 'AGUA-600', productName: 'Agua 600 ml', quantity: 1, unitPrice: '1.50', lineTotal: '1.50' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000703',
    businessId: PEPE,
    status: SaleStatus.CONFIRMED,
    total: '12.80',
    note: 'Venta de aceite',
    createdBy: '00000000-0000-4000-8000-0000000000a2',
    idempotencyKey: 'seed:sale:703',
    createdAt: '2026-10-05T16:00:00.000Z',
    lines: [
      { id: '00000000-0000-4000-8000-000000000805', productId: '00000000-0000-4000-8000-000000000201', sku: 'ACEITE-1L', productName: 'Aceite vegetal 1 L', quantity: 2, unitPrice: '6.40', lineTotal: '12.80' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000707',
    businessId: PEPE,
    status: SaleStatus.FAILED,
    total: '6.30',
    note: 'Sin existencias de azúcar',
    createdBy: '00000000-0000-4000-8000-0000000000a2',
    idempotencyKey: 'seed:sale:707',
    createdAt: '2026-10-12T17:40:00.000Z',
    failureCode: 'INSUFFICIENT_STOCK',
    failureReason: 'No hay azúcar suficiente para esta venta.',
    lines: [
      { id: '00000000-0000-4000-8000-000000000806', productId: '00000000-0000-4000-8000-000000000202', sku: 'AZUCAR-1K', productName: 'Azúcar 1 kg', quantity: 3, unitPrice: '2.10', lineTotal: '6.30' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000705',
    businessId: LAPIZ,
    status: SaleStatus.CONFIRMED,
    total: '10.60',
    note: 'Útiles escolares',
    createdBy: '00000000-0000-4000-8000-0000000000a3',
    idempotencyKey: 'seed:sale:705',
    createdAt: '2026-10-08T14:00:00.000Z',
    lines: [
      { id: '00000000-0000-4000-8000-000000000807', productId: '00000000-0000-4000-8000-000000000301', sku: 'LAP-HB', productName: 'Lápiz HB', quantity: 10, unitPrice: '0.50', lineTotal: '5.00' },
      { id: '00000000-0000-4000-8000-000000000808', productId: '00000000-0000-4000-8000-000000000302', sku: 'CUA-100', productName: 'Cuaderno 100 hojas', quantity: 2, unitPrice: '2.80', lineTotal: '5.60' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000706',
    businessId: LAPIZ,
    status: SaleStatus.CONFIRMED,
    total: '7.50',
    note: 'Resma para oficina',
    createdBy: '00000000-0000-4000-8000-0000000000a3',
    idempotencyKey: 'seed:sale:706',
    createdAt: '2026-10-13T19:30:00.000Z',
    lines: [
      { id: '00000000-0000-4000-8000-000000000809', productId: '00000000-0000-4000-8000-000000000303', sku: 'RES-CARTA', productName: 'Resma carta', quantity: 1, unitPrice: '7.50', lineTotal: '7.50' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000708',
    businessId: LAPIZ,
    status: SaleStatus.PENDING,
    total: '2.50',
    note: 'Pendiente de descontar inventario',
    createdBy: '00000000-0000-4000-8000-0000000000a3',
    idempotencyKey: 'seed:sale:708',
    createdAt: '2026-10-15T21:00:00.000Z',
    lines: [
      { id: '00000000-0000-4000-8000-000000000810', productId: '00000000-0000-4000-8000-000000000301', sku: 'LAP-HB', productName: 'Lápiz HB', quantity: 5, unitPrice: '0.50', lineTotal: '2.50' },
    ],
  },
];

async function main(): Promise<void> {
  for (const sale of sales) {
    await prisma.sale.upsert({
      where: { id: sale.id },
      update: {
        status: sale.status,
        total: sale.total,
        note: sale.note,
        failureCode: sale.failureCode ?? null,
        failureReason: sale.failureReason ?? null,
      },
      create: {
        id: sale.id,
        businessId: sale.businessId,
        status: sale.status,
        total: sale.total,
        note: sale.note,
        createdBy: sale.createdBy,
        idempotencyKey: sale.idempotencyKey,
        failureCode: sale.failureCode ?? null,
        failureReason: sale.failureReason ?? null,
        createdAt: new Date(sale.createdAt),
        lines: {
          create: sale.lines.map((line) => ({
            id: line.id,
            businessId: sale.businessId,
            productId: line.productId,
            sku: line.sku,
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
      },
    });

    for (const line of sale.lines) {
      await prisma.saleLine.upsert({
        where: { id: line.id },
        update: {
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
          productName: line.productName,
          sku: line.sku,
        },
        create: {
          id: line.id,
          saleId: sale.id,
          businessId: sale.businessId,
          productId: line.productId,
          sku: line.sku,
          productName: line.productName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          lineTotal: line.lineTotal,
        },
      });
    }
  }

  console.log(`Sales seed ready: ${sales.length} sales.`);
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
