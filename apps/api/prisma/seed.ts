/**
 * Seed script — Rich demo dataset with multi-day orders.
 *
 * Populates the DB with realistic café data so every screen is lively:
 * - 3 users (admin / cashier / kitchen)
 * - 6 categories, 24 products (full café menu)
 * - 3 payment methods (Cash, Card, UPI)
 * - 3 promotions (1 coupon, 2 automated)
 * - 10 customers
 * - 2 floors with 12 tables
 * - 3 registers
 * - ~40 historical orders spread across 10 days with random items & totals
 * - 4 bookings
 *
 * Idempotent — safe to re-run (drops transactional data, upserts config).
 */
import {
  PrismaClient,
  Role,
  PaymentType,
  OrderStatus,
  KdsStage,
  PaymentStatus,
  BookingStatus,
  PromotionType,
  PromotionScope,
  DiscountType,
  SessionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'password123';

/** Deterministic-ish random using a simple seed. */
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pickRandom<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRandom(seed) * arr.length)];
}

function randInt(min: number, max: number, seed: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

async function main(): Promise<void> {
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

  // ──── CLEAN TRANSACTIONAL DATA (order matters for FK) ────
  await prisma.payment.deleteMany();
  await prisma.orderLine.deleteMany();
  await prisma.order.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.session.deleteMany();

  // ──── USERS ────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cafe.local' },
    update: { name: 'Rajesh Sharma', username: 'admin', role: Role.ADMIN },
    create: { name: 'Rajesh Sharma', username: 'admin', email: 'admin@cafe.local', role: Role.ADMIN, passwordHash },
  });
  const cashier = await prisma.user.upsert({
    where: { email: 'cashier@cafe.local' },
    update: { name: 'Priya Patel', username: 'cashier', role: Role.CASHIER },
    create: { name: 'Priya Patel', username: 'cashier', email: 'cashier@cafe.local', role: Role.CASHIER, passwordHash },
  });
  await prisma.user.upsert({
    where: { email: 'kitchen@cafe.local' },
    update: { name: 'Amit Kumar', username: 'kitchen', role: Role.KITCHEN },
    create: { name: 'Amit Kumar', username: 'kitchen', email: 'kitchen@cafe.local', role: Role.KITCHEN, passwordHash },
  });

  const cashiers = [admin, cashier]; // both can run sessions

  // ──── REGISTERS ────
  const reg1 = await prisma.register.upsert({ where: { name: 'Counter 1' }, update: {}, create: { name: 'Counter 1' } });
  const reg2 = await prisma.register.upsert({ where: { name: 'Counter 2' }, update: {}, create: { name: 'Counter 2' } });
  await prisma.register.upsert({ where: { name: 'Drive-Thru' }, update: {}, create: { name: 'Drive-Thru' } });

  const registers = [reg1, reg2];

  // ──── PAYMENT METHODS ────
  const existingCash = await prisma.paymentMethod.findFirst({ where: { type: PaymentType.CASH } });
  if (!existingCash) await prisma.paymentMethod.create({ data: { name: 'Cash', type: PaymentType.CASH } });
  const existingCard = await prisma.paymentMethod.findFirst({ where: { type: PaymentType.CARD } });
  if (!existingCard) await prisma.paymentMethod.create({ data: { name: 'Card', type: PaymentType.CARD } });
  const existingUpi = await prisma.paymentMethod.findFirst({ where: { type: PaymentType.UPI } });
  if (!existingUpi) await prisma.paymentMethod.create({ data: { name: 'UPI', type: PaymentType.UPI, upiId: 'cafepos@ybl' } });

  // ──── CATALOG: 6 Categories + 24 Products ────
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  const hotDrinks = await prisma.category.create({ data: { name: 'Hot Drinks', color: '#F59E0B' } });
  const coldDrinks = await prisma.category.create({ data: { name: 'Cold Beverages', color: '#3B82F6' } });
  const snacks = await prisma.category.create({ data: { name: 'Snacks', color: '#10B981' } });
  const desserts = await prisma.category.create({ data: { name: 'Desserts', color: '#EC4899' } });
  const meals = await prisma.category.create({ data: { name: 'Meals', color: '#8B5CF6' } });
  const extras = await prisma.category.create({ data: { name: 'Extras', color: '#6B7280' } });

  const products = await Promise.all([
    // 0-4: Hot Drinks
    prisma.product.create({ data: { name: 'Espresso', categoryId: hotDrinks.id, price: 120, unitOfMeasure: 'piece', taxPercent: 5, description: 'Strong single shot' } }),
    prisma.product.create({ data: { name: 'Cappuccino', categoryId: hotDrinks.id, price: 180, unitOfMeasure: 'piece', taxPercent: 5, description: 'Classic Italian with steamed milk' } }),
    prisma.product.create({ data: { name: 'Latte', categoryId: hotDrinks.id, price: 200, unitOfMeasure: 'piece', taxPercent: 5, description: 'Smooth and creamy' } }),
    prisma.product.create({ data: { name: 'Masala Chai', categoryId: hotDrinks.id, price: 60, unitOfMeasure: 'piece', taxPercent: 5, description: 'Aromatic Indian spiced tea' } }),
    prisma.product.create({ data: { name: 'Hot Chocolate', categoryId: hotDrinks.id, price: 220, unitOfMeasure: 'piece', taxPercent: 5, description: 'Rich Belgian cocoa' } }),
    // 5-8: Cold Beverages
    prisma.product.create({ data: { name: 'Iced Americano', categoryId: coldDrinks.id, price: 160, unitOfMeasure: 'piece', taxPercent: 5 } }),
    prisma.product.create({ data: { name: 'Cold Brew', categoryId: coldDrinks.id, price: 220, unitOfMeasure: 'piece', taxPercent: 5, description: '12-hour slow steeped' } }),
    prisma.product.create({ data: { name: 'Mango Smoothie', categoryId: coldDrinks.id, price: 180, unitOfMeasure: 'piece', taxPercent: 5 } }),
    prisma.product.create({ data: { name: 'Fresh Lime Soda', categoryId: coldDrinks.id, price: 80, unitOfMeasure: 'piece', taxPercent: 18 } }),
    // 9-13: Snacks
    prisma.product.create({ data: { name: 'Paneer Tikka Sandwich', categoryId: snacks.id, price: 220, unitOfMeasure: 'piece', taxPercent: 5 } }),
    prisma.product.create({ data: { name: 'Veg Club Sandwich', categoryId: snacks.id, price: 250, unitOfMeasure: 'piece', taxPercent: 5 } }),
    prisma.product.create({ data: { name: 'Garlic Bread', categoryId: snacks.id, price: 150, unitOfMeasure: 'piece', taxPercent: 5 } }),
    prisma.product.create({ data: { name: 'French Fries', categoryId: snacks.id, price: 120, unitOfMeasure: 'piece', taxPercent: 5 } }),
    prisma.product.create({ data: { name: 'Samosa (2 pcs)', categoryId: snacks.id, price: 60, unitOfMeasure: 'piece', taxPercent: 5 } }),
    // 14-17: Desserts
    prisma.product.create({ data: { name: 'Chocolate Brownie', categoryId: desserts.id, price: 180, unitOfMeasure: 'piece', taxPercent: 18 } }),
    prisma.product.create({ data: { name: 'Blueberry Cheesecake', categoryId: desserts.id, price: 280, unitOfMeasure: 'piece', taxPercent: 18 } }),
    prisma.product.create({ data: { name: 'Gulab Jamun (2 pcs)', categoryId: desserts.id, price: 100, unitOfMeasure: 'piece', taxPercent: 5 } }),
    prisma.product.create({ data: { name: 'Tiramisu', categoryId: desserts.id, price: 320, unitOfMeasure: 'piece', taxPercent: 18 } }),
    // 18-21: Meals
    prisma.product.create({ data: { name: 'Margherita Pizza', categoryId: meals.id, price: 350, unitOfMeasure: 'piece', taxPercent: 5, description: 'Wood-fired, fresh mozzarella' } }),
    prisma.product.create({ data: { name: 'Penne Arrabbiata', categoryId: meals.id, price: 280, unitOfMeasure: 'piece', taxPercent: 5 } }),
    prisma.product.create({ data: { name: 'Caesar Salad', categoryId: meals.id, price: 240, unitOfMeasure: 'piece', taxPercent: 5, description: 'Crisp romaine, parmesan, croutons' } }),
    prisma.product.create({ data: { name: 'Butter Chicken Bowl', categoryId: meals.id, price: 320, unitOfMeasure: 'piece', taxPercent: 5, description: 'Served with steamed rice' } }),
    // 22-23: Extras
    prisma.product.create({ data: { name: 'Bottled Water', categoryId: extras.id, price: 30, unitOfMeasure: 'piece', taxPercent: 18, showOnKds: false } }),
    prisma.product.create({ data: { name: 'Extra Cheese', categoryId: extras.id, price: 40, unitOfMeasure: 'piece', taxPercent: 5, showOnKds: false } }),
  ]);

  // ──── PROMOTIONS ────
  await prisma.promotion.deleteMany();
  await prisma.promotion.create({
    data: {
      name: 'Welcome 10% Off', type: PromotionType.COUPON, code: 'WELCOME10',
      scope: PromotionScope.ORDER, discountType: DiscountType.PERCENTAGE,
      discountValue: 10, description: 'First time visitor discount', active: true,
    },
  });
  await prisma.promotion.create({
    data: {
      name: 'Happy Hours ₹50 Off', type: PromotionType.AUTOMATED,
      scope: PromotionScope.ORDER, minOrderAmount: 500,
      discountType: DiscountType.FIXED, discountValue: 50,
      description: 'Auto-applied on orders above ₹500', active: true,
    },
  });
  await prisma.promotion.create({
    data: {
      name: 'Buy 2 Get 20% Off Espresso', type: PromotionType.AUTOMATED,
      scope: PromotionScope.PRODUCT, productId: products[0].id, minQuantity: 2,
      discountType: DiscountType.PERCENTAGE, discountValue: 20,
      description: 'Auto-applied when 2+ espressos ordered', active: true,
    },
  });

  // ──── CUSTOMERS ────
  await prisma.customer.deleteMany();
  const customers = await Promise.all([
    prisma.customer.create({ data: { name: 'Ananya Verma', email: 'ananya@gmail.com', phone: '9876543210' } }),
    prisma.customer.create({ data: { name: 'Rohan Mehta', email: 'rohan.m@gmail.com', phone: '9876543211' } }),
    prisma.customer.create({ data: { name: 'Sneha Iyer', email: 'sneha.i@outlook.com', phone: '9876543212' } }),
    prisma.customer.create({ data: { name: 'Vikram Singh', email: 'vikram.s@yahoo.com', phone: '9876543213' } }),
    prisma.customer.create({ data: { name: 'Pooja Reddy', email: 'pooja.r@gmail.com', phone: '9876543214' } }),
    prisma.customer.create({ data: { name: 'Arjun Nair', email: 'arjun.n@gmail.com', phone: '9876543215' } }),
    prisma.customer.create({ data: { name: 'Kavya Joshi', email: 'kavya.j@hotmail.com', phone: '9876543216' } }),
    prisma.customer.create({ data: { name: 'Deepak Gupta', phone: '9876543217' } }),
    prisma.customer.create({ data: { name: 'Meera Kapoor', email: 'meera.k@gmail.com', phone: '9876543218' } }),
    prisma.customer.create({ data: { name: 'Siddharth Rao', email: 'sid.rao@gmail.com', phone: '9876543219' } }),
  ]);

  // ──── FLOORS + TABLES ────
  await prisma.table.deleteMany();
  await prisma.floor.deleteMany();

  const groundFloor = await prisma.floor.create({ data: { name: 'Ground Floor' } });
  const terrace = await prisma.floor.create({ data: { name: 'Terrace' } });

  const tablesDef = [
    { floorId: groundFloor.id, tableNumber: 1, seats: 2 },
    { floorId: groundFloor.id, tableNumber: 2, seats: 2 },
    { floorId: groundFloor.id, tableNumber: 3, seats: 4 },
    { floorId: groundFloor.id, tableNumber: 4, seats: 4 },
    { floorId: groundFloor.id, tableNumber: 5, seats: 6 },
    { floorId: groundFloor.id, tableNumber: 6, seats: 6 },
    { floorId: groundFloor.id, tableNumber: 7, seats: 2 },
    { floorId: groundFloor.id, tableNumber: 8, seats: 4 },
    { floorId: terrace.id, tableNumber: 1, seats: 4 },
    { floorId: terrace.id, tableNumber: 2, seats: 4 },
    { floorId: terrace.id, tableNumber: 3, seats: 6 },
    { floorId: terrace.id, tableNumber: 4, seats: 2 },
  ];
  const createdTables = await Promise.all(
    tablesDef.map((t) => prisma.table.create({ data: t })),
  );

  // ──── PAYMENT TYPES to cycle through ────
  const payTypes = [PaymentType.CASH, PaymentType.CARD, PaymentType.UPI];

  // ──── MULTI-DAY SESSIONS + ORDERS (last 10 days) ────
  //
  // Day pattern: random # of orders per day (3-7), random items, random quantities.
  // This creates a nice jagged line chart and varied pie chart.
  //

  const now = new Date();
  let globalOrderSeed = 42; // deterministic randomness

  // Generate orders for each of the last 10 days
  for (let daysAgo = 9; daysAgo >= 0; daysAgo--) {
    const dayDate = new Date(now);
    dayDate.setDate(dayDate.getDate() - daysAgo);
    dayDate.setHours(9, 0, 0, 0); // session opens at 9 AM

    // Pick a random cashier and register for this day's session
    const sessionCashier = pickRandom(cashiers, globalOrderSeed++);
    const sessionRegister = pickRandom(registers, globalOrderSeed++);

    const session = await prisma.session.create({
      data: {
        employeeId: sessionCashier.id,
        registerId: sessionRegister.id,
        status: daysAgo === 0 ? SessionStatus.OPEN : SessionStatus.CLOSED,
        openedAt: dayDate,
        closedAt: daysAgo === 0 ? undefined : new Date(dayDate.getTime() + 10 * 60 * 60 * 1000),
      },
    });

    // Random number of orders this day: 3-7
    const numOrders = randInt(3, 7, globalOrderSeed++);

    let dayRevenue = 0;

    for (let orderIdx = 0; orderIdx < numOrders; orderIdx++) {
      // Random time spread across the day (9 AM to 7 PM)
      const hoursOffset = randInt(0, 9, globalOrderSeed++) + seededRandom(globalOrderSeed++) * 0.9;
      const orderTime = new Date(dayDate.getTime() + hoursOffset * 60 * 60 * 1000);

      // Random table
      const tableIdx = randInt(0, createdTables.length - 1, globalOrderSeed++);

      // Random customer (70% chance of having one)
      const hasCustomer = seededRandom(globalOrderSeed++) > 0.3;
      const customerIdx = hasCustomer ? randInt(0, customers.length - 1, globalOrderSeed++) : null;

      // Random number of line items: 1-5
      const numItems = randInt(1, 5, globalOrderSeed++);
      const usedProducts = new Set<number>();
      const items: { productIdx: number; qty: number }[] = [];

      for (let itemIdx = 0; itemIdx < numItems; itemIdx++) {
        let pIdx = randInt(0, products.length - 1, globalOrderSeed++);
        // Avoid duplicates in the same order
        let attempts = 0;
        while (usedProducts.has(pIdx) && attempts < 10) {
          pIdx = randInt(0, products.length - 1, globalOrderSeed++);
          attempts++;
        }
        if (!usedProducts.has(pIdx)) {
          usedProducts.add(pIdx);
          items.push({ productIdx: pIdx, qty: randInt(1, 3, globalOrderSeed++) });
        }
      }

      // Calculate totals
      let subtotal = 0;
      let taxTotal = 0;
      const lineData = items.map((item) => {
        const p = products[item.productIdx];
        const unitPrice = Number(p.price);
        const lineTotal = unitPrice * item.qty;
        const tax = lineTotal * (Number(p.taxPercent) / 100);
        subtotal += lineTotal;
        taxTotal += tax;
        return {
          productId: p.id,
          productName: p.name,
          quantity: item.qty,
          unitPrice,
          taxPercent: Number(p.taxPercent),
          lineTotal,
        };
      });

      const total = Math.round((subtotal + taxTotal) * 100) / 100;
      dayRevenue += total;

      // Payment type
      const payType = pickRandom(payTypes, globalOrderSeed++);

      // KDS stage: completed for past days, random for today
      let kdsStage: KdsStage;
      if (daysAgo > 0) {
        kdsStage = KdsStage.COMPLETED;
      } else {
        const stages = [KdsStage.TO_COOK, KdsStage.PREPARING, KdsStage.COMPLETED];
        kdsStage = pickRandom(stages, globalOrderSeed++);
      }

      const order = await prisma.order.create({
        data: {
          sessionId: session.id,
          tableId: createdTables[tableIdx].id,
          customerId: customerIdx !== null ? customers[customerIdx].id : undefined,
          status: OrderStatus.PAID,
          subtotal,
          taxTotal: Math.round(taxTotal * 100) / 100,
          total,
          kdsStage,
          sentToKitchenAt: orderTime,
          createdAt: orderTime,
          lines: { create: lineData },
        },
      });

      // Payment record
      const isCash = payType === PaymentType.CASH;
      await prisma.payment.create({
        data: {
          orderId: order.id,
          type: payType,
          status: PaymentStatus.SUCCESS,
          amount: total,
          cashReceived: isCash ? Math.ceil(total / 100) * 100 : undefined,
          changeDue: isCash ? Math.ceil(total / 100) * 100 - total : undefined,
          reference: payType !== PaymentType.CASH
            ? `${payType.toLowerCase()}_${Date.now()}_${globalOrderSeed.toString(36)}`
            : undefined,
        },
      });
    }

    // Update closing amount for closed sessions
    if (daysAgo > 0) {
      await prisma.session.update({
        where: { id: session.id },
        data: { closingAmount: Math.round(dayRevenue * 100) / 100 },
      });
    }
  }

  // ──── BOOKINGS (upcoming) ────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const bookingData = [
    { customerId: customers[0].id, tableId: createdTables[2].id, reservedAt: new Date(new Date(tomorrow).setHours(12, 0, 0, 0)), partySize: 3, notes: 'Birthday celebration', status: BookingStatus.BOOKED },
    { customerId: customers[1].id, tableId: createdTables[4].id, reservedAt: new Date(new Date(tomorrow).setHours(13, 30, 0, 0)), partySize: 5, notes: 'Team lunch', status: BookingStatus.BOOKED },
    { customerId: customers[3].id, tableId: createdTables[8].id, reservedAt: new Date(new Date(tomorrow).setHours(18, 0, 0, 0)), partySize: 4, notes: null, status: BookingStatus.BOOKED },
    { guestName: 'Walk-in Guest', guestPhone: '9988776655', tableId: createdTables[0].id, reservedAt: new Date(new Date(tomorrow).setHours(19, 30, 0, 0)), partySize: 2, notes: 'Anniversary dinner', status: BookingStatus.BOOKED },
  ];
  for (const b of bookingData) {
    await prisma.booking.create({ data: b as any });
  }

  // ──── SUMMARY ────
  const totalOrders = await prisma.order.count();
  const totalSessions = await prisma.session.count();

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║             ✅  SEED COMPLETE — Cafe POS                ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║  Users:       3  (admin / cashier / kitchen)            ║');
  console.log('║  Password:    password123                               ║');
  console.log('║  Categories:  6                                         ║');
  console.log('║  Products:    24                                        ║');
  console.log('║  Customers:   10                                        ║');
  console.log('║  Floors:      2  (Ground Floor + Terrace)               ║');
  console.log('║  Tables:      12                                        ║');
  console.log('║  Registers:   3  (Counter 1, Counter 2, Drive-Thru)     ║');
  console.log(`║  Sessions:    ${String(totalSessions).padEnd(3)} (10 days, 9 closed + 1 open today)   ║`);
  console.log(`║  Orders:      ${String(totalOrders).padEnd(3)} (random across 10 days)              ║`);
  console.log('║  Bookings:    4  (tomorrow)                             ║');
  console.log('║  Promotions:  3  (WELCOME10 + 2 automated)             ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
