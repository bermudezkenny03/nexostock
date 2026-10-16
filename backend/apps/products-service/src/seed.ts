import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed products with NODE_ENV=production.');
  process.exit(1);
}

const DEMO = '00000000-0000-4000-8000-000000000001';
const PEPE = '00000000-0000-4000-8000-000000000002';
const LAPIZ = '00000000-0000-4000-8000-000000000003';

const prisma = new PrismaClient();

const categories = [
  { id: '00000000-0000-4000-8000-000000000011', businessId: DEMO, name: 'Bebidas', description: 'Bebidas de mostrador' },
  { id: '00000000-0000-4000-8000-000000000012', businessId: DEMO, name: 'Abarrotes', description: 'Productos secos' },
  { id: '00000000-0000-4000-8000-000000000021', businessId: PEPE, name: 'Abarrotes', description: 'Despensa' },
  { id: '00000000-0000-4000-8000-000000000031', businessId: LAPIZ, name: 'Papelería', description: 'Útiles escolares' },
  { id: '00000000-0000-4000-8000-000000000032', businessId: LAPIZ, name: 'Oficina', description: 'Insumos de oficina' },
];

const products = [
  { id: '00000000-0000-4000-8000-000000000101', businessId: DEMO, categoryId: '00000000-0000-4000-8000-000000000011', sku: 'AGUA-600', name: 'Agua 600 ml', description: 'Botella de agua', price: '1.50' },
  { id: '00000000-0000-4000-8000-000000000102', businessId: DEMO, categoryId: '00000000-0000-4000-8000-000000000011', sku: 'CAFE-250', name: 'Café molido 250 g', description: 'Café de mostrador', price: '8.90' },
  { id: '00000000-0000-4000-8000-000000000103', businessId: DEMO, categoryId: '00000000-0000-4000-8000-000000000012', sku: 'ARROZ-1K', name: 'Arroz 1 kg', description: 'Arroz blanco', price: '3.25' },
  { id: '00000000-0000-4000-8000-000000000201', businessId: PEPE, categoryId: '00000000-0000-4000-8000-000000000021', sku: 'ACEITE-1L', name: 'Aceite vegetal 1 L', description: 'Aceite de cocina', price: '6.40' },
  { id: '00000000-0000-4000-8000-000000000202', businessId: PEPE, categoryId: '00000000-0000-4000-8000-000000000021', sku: 'AZUCAR-1K', name: 'Azúcar 1 kg', description: 'Azúcar blanca', price: '2.10' },
  { id: '00000000-0000-4000-8000-000000000203', businessId: PEPE, categoryId: '00000000-0000-4000-8000-000000000021', sku: 'FRIJOL-1K', name: 'Frijol 1 kg', description: 'Frijol negro', price: '4.75' },
  { id: '00000000-0000-4000-8000-000000000301', businessId: LAPIZ, categoryId: '00000000-0000-4000-8000-000000000031', sku: 'LAP-HB', name: 'Lápiz HB', description: 'Lápiz de grafito', price: '0.50' },
  { id: '00000000-0000-4000-8000-000000000302', businessId: LAPIZ, categoryId: '00000000-0000-4000-8000-000000000031', sku: 'CUA-100', name: 'Cuaderno 100 hojas', description: 'Cuaderno rayado', price: '2.80' },
  { id: '00000000-0000-4000-8000-000000000303', businessId: LAPIZ, categoryId: '00000000-0000-4000-8000-000000000032', sku: 'RES-CARTA', name: 'Resma carta', description: '500 hojas tamaño carta', price: '7.50' },
];

async function main(): Promise<void> {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: { name: category.name, description: category.description, isActive: true },
      create: category,
    });
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {
        name: product.name,
        description: product.description,
        price: product.price,
        sku: product.sku,
        categoryId: product.categoryId,
        isActive: true,
      },
      create: product,
    });
  }

  console.log(`Products seed ready: ${categories.length} categories, ${products.length} products.`);
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
