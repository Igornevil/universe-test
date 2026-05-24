/* eslint-disable no-console */
import { randomUUID } from 'node:crypto';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { products } from './schema';

interface DotenvModule {
  config(options: { path: string[] }): void;
}
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const dotenv = require('dotenv') as DotenvModule;
  dotenv.config({ path: ['../../.env', '.env'] });
} catch {
  // dotenv not installed in production image — that is fine
}

interface SampleProduct {
  name: string;
  description: string;
  priceCents: number;
}

const sampleProducts: readonly SampleProduct[] = [
  {
    name: 'Wireless Noise-Cancelling Headphones',
    description: 'Over-ear, 30h battery, ANC v3',
    priceCents: 24999,
  },
  { name: 'Ceramic Coffee Mug', description: '350ml, matte black finish', priceCents: 1499 },
  { name: 'Organic Cotton T-Shirt', description: 'Unisex, fair-trade, M/L/XL', priceCents: 2999 },
  { name: 'Mechanical Keyboard', description: 'Hot-swap, Cherry MX Brown, RGB', priceCents: 14900 },
  { name: 'Ergonomic Mouse', description: 'Vertical design, 4000 DPI', priceCents: 6499 },
  { name: 'USB-C Hub 7-in-1', description: 'HDMI 4K, SD/microSD, PD 100W', priceCents: 4999 },
  { name: 'Bluetooth Speaker', description: 'Waterproof IP67, 20h playback', priceCents: 8999 },
  { name: 'Smart LED Bulb', description: 'Wi-Fi, 16M colors, Matter', priceCents: 1899 },
  { name: 'Wireless Charger', description: '15W fast charge, Qi-certified', priceCents: 2999 },
  { name: 'Standing Desk Mat', description: 'Anti-fatigue, beveled edges', priceCents: 4500 },
  { name: 'Notebook A5', description: 'Dotted pages, 240 pages', priceCents: 1299 },
  { name: 'Fountain Pen', description: 'Fine nib, converter included', priceCents: 3799 },
  { name: 'Leather Wallet', description: 'Bifold, RFID-blocking', priceCents: 5499 },
  { name: 'Stainless Water Bottle', description: '750ml, double-wall vacuum', priceCents: 2799 },
  { name: 'Yoga Mat', description: '6mm thickness, eco TPE', priceCents: 3500 },
  { name: 'Resistance Bands Set', description: '5 levels, with door anchor', priceCents: 1999 },
  { name: 'Foam Roller', description: '33cm high-density EVA', priceCents: 2599 },
  { name: 'Backpack 25L', description: 'Water-resistant, laptop sleeve', priceCents: 6999 },
  { name: 'Travel Toiletry Bag', description: 'Hanging, 4 compartments', priceCents: 1899 },
  { name: 'Packing Cubes Set', description: '6-piece nylon, lightweight', priceCents: 2499 },
  { name: 'Cast Iron Skillet 26cm', description: 'Pre-seasoned, oven-safe', priceCents: 4999 },
  { name: 'Chef Knife 8"', description: 'High-carbon stainless steel', priceCents: 6500 },
  { name: 'Wooden Cutting Board', description: 'Acacia, 40x28cm', priceCents: 3299 },
  { name: 'French Press', description: 'Borosilicate glass, 1L', priceCents: 2799 },
  { name: 'Pour-Over Kettle', description: 'Gooseneck spout, stovetop', priceCents: 4599 },
  { name: 'Espresso Tamper', description: '58mm, calibrated 30lb', priceCents: 3499 },
  { name: 'Plant Pot Ceramic', description: 'Drainage hole, 15cm', priceCents: 1699 },
  { name: 'Indoor Garden Tools', description: '3-piece set, wooden handles', priceCents: 1499 },
  { name: 'Air Plant Trio', description: 'Tillandsia varieties', priceCents: 1899 },
  { name: 'Desk Lamp LED', description: 'Adjustable warmth, USB charging', priceCents: 4900 },
  { name: 'Monitor Stand Bamboo', description: 'Storage drawer, 56cm wide', priceCents: 3799 },
  { name: 'Cable Organizer Tray', description: 'Under-desk, magnetic mount', priceCents: 2199 },
  { name: 'Webcam 1080p', description: 'Auto-focus, dual mic', priceCents: 6900 },
  { name: 'Ring Light 10"', description: 'Tripod, phone holder', priceCents: 3499 },
  { name: 'Audio Interface', description: '2-channel, 24-bit/192kHz', priceCents: 12900 },
  { name: 'Studio Headphones', description: 'Closed-back, 50mm drivers', priceCents: 9900 },
  { name: 'Pop Filter', description: '6-inch double-layer mesh', priceCents: 1299 },
  { name: 'Acoustic Foam Pack', description: '12 panels, 30x30cm wedges', priceCents: 3999 },
  { name: 'Smart Plug 2-pack', description: 'Wi-Fi, energy monitoring', priceCents: 2499 },
  { name: 'Motion Sensor', description: 'Battery-powered, Zigbee', priceCents: 1899 },
  { name: 'Security Camera', description: '2K, outdoor, color night vision', priceCents: 8999 },
  { name: 'Robot Vacuum', description: 'LiDAR mapping, 3500Pa suction', priceCents: 39900 },
  { name: 'Air Purifier', description: 'HEPA H13, 40m² coverage', priceCents: 19900 },
  { name: 'Humidifier 4L', description: 'Ultrasonic, top-fill', priceCents: 5900 },
  { name: 'Smart Thermostat', description: 'Wi-Fi, learns schedule', priceCents: 17900 },
  { name: 'E-Reader', description: '7" glare-free, waterproof', priceCents: 14999 },
  { name: 'Tablet Stylus', description: 'Pressure-sensitive, magnetic', priceCents: 8900 },
  { name: 'Phone Tripod', description: 'Bluetooth remote, 1.6m', priceCents: 2999 },
  { name: 'Action Camera Mount', description: 'Suction cup, multi-angle', priceCents: 1599 },
  { name: 'Drone Battery', description: 'Compatible with X-series, 45min', priceCents: 7900 },
  { name: 'Bike Multi-Tool', description: '15 functions, chain breaker', priceCents: 2499 },
  { name: 'Cycling Gloves', description: 'Gel-padded, breathable', priceCents: 2299 },
  { name: 'Running Belt', description: 'Water-resistant, 2 pouches', priceCents: 1799 },
  { name: 'Jump Rope Speed', description: 'Adjustable, ball bearings', priceCents: 1499 },
  { name: 'Gym Towel Set', description: '2-pack microfiber, hooks', priceCents: 1899 },
  { name: 'Reusable Grocery Bags', description: '5-pack, foldable nylon', priceCents: 1299 },
  { name: 'Bamboo Cutlery Set', description: 'Travel size, with case', priceCents: 1599 },
  { name: 'Glass Food Containers', description: '5-piece, snap lids', priceCents: 3799 },
  { name: 'Insulated Lunch Bag', description: 'Leak-proof, shoulder strap', priceCents: 2499 },
  { name: 'Reusable Coffee Cup', description: '450ml, leakproof lid', priceCents: 1999 },
];

const main = async (): Promise<void> => {
  const databaseUrl = process.env.PRODUCTS_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('PRODUCTS_DATABASE_URL is required');
  }

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema: { products } });

  try {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;

    const records = sampleProducts.map((product, index) => ({
      id: randomUUID(),
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      currency: 'USD',
      // Spread creation times so list ordering is meaningful (newest first).
      // Index 0 → most recent, index N → oldest.
      createdAt: new Date(now - index * HOUR),
    }));

    console.log(`Seeding ${records.length} products...`);
    await db.insert(products).values(records);
    console.log('Seed complete');
  } finally {
    await client.end({ timeout: 5 });
  }
};

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
