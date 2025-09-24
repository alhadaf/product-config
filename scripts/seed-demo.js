// Demo Data Seeder for Product Configurator
// Run this script to populate your app with sample data

console.log('🎯 Product Configurator Demo Data Seeder');
console.log('==========================================');
console.log('');

console.log('📦 DEMO PRODUCTS TO CREATE:');
console.log('');

const products = [
  {
    name: "Classic Cotton T-Shirt",
    description: "Premium 100% cotton t-shirt perfect for custom designs",
    colors: ["Black", "White", "Navy", "Red", "Royal Blue", "Forest Green"],
    sizes: ["XS", "S", "M", "L", "XL", "2XL"],
    decorations: ["Screenprint", "Embroidery", "Heat Transfer"],
    price: "$15.99"
  },
  {
    name: "Premium Hoodie", 
    description: "Comfortable fleece hoodie with kangaroo pocket",
    colors: ["Black", "Charcoal", "Navy", "Maroon", "Forest Green"],
    sizes: ["S", "M", "L", "XL", "2XL", "3XL"],
    decorations: ["Screenprint", "Embroidery", "Digital Print"],
    price: "$35.99"
  },
  {
    name: "Performance Polo",
    description: "Moisture-wicking polo shirt for professional wear", 
    colors: ["White", "Black", "Navy", "Red", "Kelly Green", "Royal Blue"],
    sizes: ["XS", "S", "M", "L", "XL", "2XL", "3XL"],
    decorations: ["Embroidery", "Heat Transfer"],
    price: "$28.99"
  },
  {
    name: "Canvas Tote Bag",
    description: "Eco-friendly canvas tote bag for custom printing",
    colors: ["Natural", "Black", "Navy", "Red"],
    sizes: ["One Size"],
    decorations: ["Screenprint", "Heat Transfer", "Digital Print"],
    price: "$12.99"
  },
  {
    name: "Baseball Cap",
    description: "Adjustable baseball cap with structured crown",
    colors: ["Black", "Navy", "Red", "White", "Khaki"],
    sizes: ["One Size"],
    decorations: ["Embroidery"],
    price: "$18.99"
  }
];

products.forEach((product, index) => {
  console.log(`${index + 1}. ${product.name} - ${product.price}`);
  console.log(`   Description: ${product.description}`);
  console.log(`   Colors: ${product.colors.join(', ')}`);
  console.log(`   Sizes: ${product.sizes.join(', ')}`);
  console.log(`   Decorations: ${product.decorations.join(', ')}`);
  console.log('');
});

console.log('💰 DECORATION PRICING:');
console.log('');
console.log('Screenprint:');
console.log('  • Setup Fee: $25.00');
console.log('  • Per Piece: $3.50');
console.log('  • Min Quantity: 12');
console.log('');
console.log('Embroidery:');
console.log('  • Setup Fee: $35.00');
console.log('  • Per Piece: $5.00');
console.log('  • Min Quantity: 6');
console.log('');
console.log('Heat Transfer:');
console.log('  • Setup Fee: $15.00');
console.log('  • Per Piece: $4.00');
console.log('  • Min Quantity: 1');
console.log('');
console.log('Digital Print:');
console.log('  • Setup Fee: $20.00');
console.log('  • Per Piece: $6.00');
console.log('  • Min Quantity: 1');
console.log('');

console.log('🎨 SAMPLE DESIGN ORDERS:');
console.log('');
console.log('1. john.doe@example.com - PENDING');
console.log('   Product: Classic Cotton T-Shirt');
console.log('   Decoration: Screenprint');
console.log('   Notes: Logo for company event t-shirts. Need 50 pieces.');
console.log('');
console.log('2. sarah.smith@company.com - APPROVED');
console.log('   Product: Performance Polo');
console.log('   Decoration: Embroidery');
console.log('   Notes: Corporate logo for polo shirts. High-quality embroidery.');
console.log('');
console.log('3. mike.johnson@startup.io - IN PRODUCTION');
console.log('   Product: Premium Hoodie');
console.log('   Decoration: Heat Transfer');
console.log('   Notes: Startup logo for team hoodies. Modern gradient design.');
console.log('');
console.log('4. lisa.brown@nonprofit.org - COMPLETED');
console.log('   Product: Canvas Tote Bag');
console.log('   Decoration: Screenprint');
console.log('   Notes: Charity event tote bags. Eco-friendly printing preferred.');
console.log('');

console.log('🚀 HOW TO IMPORT THIS DATA:');
console.log('');
console.log('1. Open your Product Configurator app at: http://localhost:3000');
console.log('2. Go to "Setup" to create products using the wizard');
console.log('3. Use the data above to create each product with their configurations');
console.log('4. Go to "Settings" to configure decoration pricing');
console.log('5. Test the design submission workflow');
console.log('');
console.log('✅ Your demo environment will be ready to showcase!');