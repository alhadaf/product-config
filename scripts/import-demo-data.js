import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Demo product data
const demoProducts = [
  {
    title: "Classic Cotton T-Shirt",
    description: "Premium 100% cotton t-shirt perfect for custom designs",
    vendor: "Double Exposure",
    productType: "Apparel",
    status: "ACTIVE",
    colors: ["Black", "White", "Navy", "Red", "Royal Blue", "Forest Green"],
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    decorations: ["Screenprint", "Embroidery", "Heat Transfer"],
    basePrice: 15.99
  },
  {
    title: "Premium Hoodie",
    description: "Comfortable fleece hoodie with kangaroo pocket",
    vendor: "Double Exposure",
    productType: "Apparel",
    status: "ACTIVE",
    colors: ["Black", "Charcoal", "Navy", "Maroon", "Forest Green"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    decorations: ["Screenprint", "Embroidery", "Digital Print"],
    basePrice: 35.99
  },
  {
    title: "Performance Polo",
    description: "Moisture-wicking polo shirt for professional wear",
    vendor: "Double Exposure",
    productType: "Apparel",
    status: "ACTIVE",
    colors: ["White", "Black", "Navy", "Red", "Kelly Green", "Royal Blue"],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    decorations: ["Embroidery", "Heat Transfer"],
    basePrice: 28.99
  },
  {
    title: "Canvas Tote Bag",
    description: "Eco-friendly canvas tote bag for custom printing",
    vendor: "Double Exposure",
    productType: "Accessories",
    status: "ACTIVE",
    colors: ["Natural", "Black", "Navy", "Red"],
    sizes: ["One Size"],
    decorations: ["Screenprint", "Heat Transfer", "Digital Print"],
    basePrice: 12.99
  },
  {
    title: "Baseball Cap",
    description: "Adjustable baseball cap with structured crown",
    vendor: "Double Exposure",
    productType: "Accessories",
    status: "ACTIVE",
    colors: ["Black", "Navy", "Red", "White", "Khaki"],
    sizes: ["One Size"],
    decorations: ["Embroidery"],
    basePrice: 18.99
  }
];

// Demo design submissions
const demoDesigns = [
  {
    customerEmail: "john.doe@example.com",
    status: "pending",
    decoration: "Screenprint",
    notes: "Logo for company event t-shirts. Need 50 pieces in various sizes.",
    productTitle: "Classic Cotton T-Shirt"
  },
  {
    customerEmail: "sarah.smith@company.com",
    status: "approved",
    decoration: "Embroidery",
    notes: "Corporate logo for polo shirts. High-quality embroidery preferred.",
    productTitle: "Performance Polo"
  },
  {
    customerEmail: "mike.johnson@startup.io",
    status: "in_production",
    decoration: "Heat Transfer",
    notes: "Startup logo for team hoodies. Modern design with gradient colors.",
    productTitle: "Premium Hoodie"
  },
  {
    customerEmail: "lisa.brown@nonprofit.org",
    status: "completed",
    decoration: "Screenprint",
    notes: "Charity event tote bags. Eco-friendly printing methods preferred.",
    productTitle: "Canvas Tote Bag"
  }
];

// Fee mapping data
const feeMapping = {
  "Screenprint": {
    "setup_fee": 25.00,
    "per_piece_fee": 3.50,
    "min_quantity": 12
  },
  "Embroidery": {
    "setup_fee": 35.00,
    "per_piece_fee": 5.00,
    "min_quantity": 6
  },
  "Heat Transfer": {
    "setup_fee": 15.00,
    "per_piece_fee": 4.00,
    "min_quantity": 1
  },
  "Digital Print": {
    "setup_fee": 20.00,
    "per_piece_fee": 6.00,
    "min_quantity": 1
  }
};

async function importDemoData() {
  try {
    console.log('🚀 Starting demo data import...');

    // Note: This script provides demo data structure
    // The actual import would need to be done through the Shopify Admin API
    // since this app uses Shopify's product system

    console.log('📦 Demo Products to Import:');
    demoProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.title}`);
      console.log(`   - Colors: ${product.colors.join(', ')}`);
      console.log(`   - Sizes: ${product.sizes.join(', ')}`);
      console.log(`   - Decorations: ${product.decorations.join(', ')}`);
      console.log(`   - Base Price: $${product.basePrice}`);
      console.log('');
    });

    console.log('🎨 Demo Design Submissions:');
    demoDesigns.forEach((design, index) => {
      console.log(`${index + 1}. ${design.customerEmail} - ${design.status}`);
      console.log(`   - Product: ${design.productTitle}`);
      console.log(`   - Decoration: ${design.decoration}`);
      console.log(`   - Notes: ${design.notes}`);
      console.log('');
    });

    console.log('💰 Fee Mapping Structure:');
    Object.entries(feeMapping).forEach(([method, fees]) => {
      console.log(`${method}:`);
      console.log(`   - Setup Fee: $${fees.setup_fee}`);
      console.log(`   - Per Piece: $${fees.per_piece_fee}`);
      console.log(`   - Min Quantity: ${fees.min_quantity}`);
      console.log('');
    });

    console.log('✅ Demo data structure ready!');
    console.log('');
    console.log('📝 Next Steps:');
    console.log('1. Use the Product Setup Wizard in the app to create these products');
    console.log('2. Configure the fee mapping in the app settings');
    console.log('3. Test the design submission workflow');
    console.log('');
    console.log('🌐 Access your app at: http://localhost:3000');

  } catch (error) {
    console.error('❌ Error importing demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export the demo data for use in the application
export { demoProducts, demoDesigns, feeMapping };

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importDemoData();
}