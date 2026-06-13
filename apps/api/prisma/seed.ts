/**
 * Seed script (PRD §17 / base prompt §5).
 *
 * Creates a minimal demo dataset so the scaffold is immediately navigable:
 * one Admin / Cashier / Kitchen user (hashed passwords), 2 categories,
 * 3 products (one with showOnKds=false), Cash + UPI payment methods, one floor
 * with 4 tables, and one register. Idempotent — safe to re-run.
 */
import { PrismaClient, Role, PaymentType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'password123';

async function main(): Promise<void> {
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  // ---- Users (one per role) ----
  const users = [
    { name: 'Cafe Admin', username: 'admin', email: 'admin@cafe.local', role: Role.ADMIN },
    { name: 'Cafe Cashier', username: 'cashier', email: 'cashier@cafe.local', role: Role.CASHIER },
    { name: 'Cafe Kitchen', username: 'kitchen', email: 'kitchen@cafe.local', role: Role.KITCHEN },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, username: u.username, role: u.role },
      create: { ...u, passwordHash },
    });
  }

  // ---- Register ----
  await prisma.register.upsert({
    where: { name: 'Counter 1' },
    update: {},
    create: { name: 'Counter 1' },
  });

  // ---- Payment methods (Cash + UPI) ----
  const existingCash = await prisma.paymentMethod.findFirst({ where: { type: PaymentType.CASH } });
  if (!existingCash) {
    await prisma.paymentMethod.create({ data: { name: 'Cash', type: PaymentType.CASH } });
  }
  const existingUpi = await prisma.paymentMethod.findFirst({ where: { type: PaymentType.UPI } });
  if (!existingUpi) {
    await prisma.paymentMethod.create({
      data: { name: 'UPI', type: PaymentType.UPI, upiId: 'cafepos@upi' },
    });
  }

  // ---- Catalog (only seed once) ----
  const hasCatalog = await prisma.category.findFirst();
  if (!hasCatalog) {
    const hotDrinks = await prisma.category.create({
      data: { name: 'Hot Drinks', color: '#F59E0B' },
    });
    const snacks = await prisma.category.create({
      data: { name: 'Snacks', color: '#10B981' },
    });

    await prisma.product.createMany({
      data: [
        {
          name: 'Espresso',
          categoryId: hotDrinks.id,
          price: 120,
          unitOfMeasure: 'piece',
          taxPercent: 5,
          showOnKds: true,
        },
        {
          name: 'Cappuccino',
          categoryId: hotDrinks.id,
          price: 180,
          unitOfMeasure: 'piece',
          taxPercent: 5,
          showOnKds: true,
        },
        {
          // showOnKds=false → never appears on the KDS (PRD §7.6)
          name: 'Bottled Water',
          categoryId: snacks.id,
          price: 30,
          unitOfMeasure: 'piece',
          taxPercent: 18,
          showOnKds: false,
        },
      ],
    });
  }

  // ---- Floor + 4 tables ----
  const hasFloor = await prisma.floor.findFirst();
  if (!hasFloor) {
    const floor = await prisma.floor.create({ data: { name: 'Ground Floor' } });
    const seats = [2, 2, 4, 4];
    for (let i = 0; i < seats.length; i++) {
      await prisma.table.create({
        data: { floorId: floor.id, tableNumber: i + 1, seats: seats[i] },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log('✅ Seed complete. Demo users (password: password123): admin / cashier / kitchen');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
