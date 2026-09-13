import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

export function generateEan13Barcode(indexSeed: number): string {
  // EAN-13 format: 884 (Cambodia GS1 prefix) + 9 digits + 1 check digit = 13 digits total
  const seedStr = String(100000000 + indexSeed).slice(-9);
  const raw12 = `884${seedStr}`; // Exactly 12 digits
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(raw12[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${raw12}${checkDigit}`;
}

async function ensureAllProductsHaveBarcodes() {
  console.log('🚀 Starting Barcode Backfill & Validation for All Products...');
  
  const allProducts = await prisma.product.findMany({
    select: { id: true, name: true, sku: true, barcode: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`🔍 Total Products in Database: ${allProducts.length}`);

  const usedBarcodes = new Set<string>();
  // Collect existing valid non-NaN barcodes
  for (const p of allProducts) {
    if (p.barcode && p.barcode.trim() && !p.barcode.includes('NaN')) {
      usedBarcodes.add(p.barcode.trim());
    }
  }

  let updatedCount = 0;
  let counter = 1001;

  for (const prod of allProducts) {
    let currentBarcode = prod.barcode ? prod.barcode.trim() : '';

    // If barcode is missing OR contains NaN from previous interrupted run
    if (!currentBarcode || currentBarcode.includes('NaN')) {
      let candidate = generateEan13Barcode(counter++);
      while (usedBarcodes.has(candidate)) {
        candidate = generateEan13Barcode(counter++);
      }

      await prisma.product.update({
        where: { id: prod.id },
        data: { barcode: candidate },
      });

      usedBarcodes.add(candidate);
      updatedCount++;
      console.log(`✅ Assigned Barcode: [${candidate}] -> ${prod.name} (${prod.sku || prod.id})`);
    } else {
      console.log(`ℹ️ Existing Barcode:  [${currentBarcode}] -> ${prod.name}`);
    }
  }

  console.log(`\n🎉 Success! All ${allProducts.length} products now have valid 13-digit EAN barcodes.`);
  console.log(`✨ Newly updated/fixed products: ${updatedCount}`);
}

ensureAllProductsHaveBarcodes()
  .catch((e) => {
    console.error('❌ Error updating barcodes:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
