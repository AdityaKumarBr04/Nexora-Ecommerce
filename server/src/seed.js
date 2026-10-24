import "dotenv/config";
import mongoose from "mongoose";
import { Product } from "./models.js";

// NEXORA bulk catalog: 300 products in EACH of 10 categories = 3,000 products.
// Safe to rerun: uses stable SKUs and $setOnInsert, so existing products/orders are preserved.
const categories = [
  { name: "Electronics", code: "ELE", items: [
    ["Aero ANC Headphones",129,159,"photo-1505740420928-5e560c06d30e"],["Nova Bluetooth Speaker",69,89,"photo-1608043152269-423dbba4e7e1"],["Pulse Smart Watch",149,189,"photo-1523275335684-37898b6baf30"],["Lumen 4K Monitor",399,449,"photo-1527443224154-c4a3942d3acf"],["Slate Wireless Mouse",39,49,"photo-1527814050087-3793815479db"],["Studio Mechanical Keyboard",89,109,"photo-1587829741301-dc798b83add3"],["Orbit Tablet Stand",29,39,"photo-1586953208448-b95a79798f07"],["Pixel USB-C Hub",45,59,"photo-1625842268584-8f3296236761"],["Echo Webcam HD",59,79,"photo-1587825140708-dfaf72ae4b04"],["Volt Fast Charger",25,32,"photo-1609592806596-b43bada9f7c4"],["Terra Power Bank",49,65,"photo-1609091839311-d5365f9ff1c5"],["AirFlex Earbuds",79,99,"photo-1606220945770-b5b6c2c55bf1"]]},
  { name: "Fashion", code: "FAS", items: [
    ["Everyday Cotton T-Shirt",22,29,"photo-1521572163474-6864f9cf17ab"],["Classic Denim Jacket",75,95,"photo-1523205771623-e0faa4d2813d"],["Relaxed Fit Jeans",55,69,"photo-1542272604-787c3835535d"],["Urban Hoodie",48,60,"photo-1556821840-3a63f95609a7"],["Linen Summer Shirt",39,49,"photo-1596755094514-f87e34085b2c"],["Minimalist Sneakers",89,110,"photo-1542291026-7eec264c27ff"],["Canvas Everyday Tote",25,34,"photo-1490481651871-ab68de25d43d"],["Classic Baseball Cap",19,25,"photo-1588850561407-ed78c282e89b"],["Slim Leather Belt",28,38,"photo-1624222247344-550fb8a3d7b0"],["Weekend Joggers",35,45,"photo-1552902865-b72c031ac5ea"],["Knit Cardigan",59,75,"photo-1434389677669-e08b4cac3105"],["Lightweight Rain Jacket",79,99,"photo-1544923246-77307dd654cb"]]},
  { name: "Home", code: "HOM", items: [
    ["Prism Desk Lamp",49,65,"photo-1507473885765-e6ed057f782c"],["Cloud Ergonomic Chair",279,329,"photo-1505843490701-5be5d1b9e7b8"],["Soft Knit Throw",45,59,"photo-1600210492486-724fe5c67fb0"],["Ceramic Table Vase",24,32,"photo-1578500494198-246f612d3b3d"],["Modern Wall Clock",35,45,"photo-1563861826100-9cb868fdbe1c"],["Cotton Bedding Set",89,119,"photo-1631049307264-da0ec9d70304"],["Glass Storage Jars",22,29,"photo-1603199506016-b9a594b593c0"],["Minimal Bookshelf",159,199,"photo-1594620302200-9a762244a156"],["Soft Area Rug",99,129,"photo-1600166898405-da9535204843"],["Scented Candle Trio",27,36,"photo-1603006905003-be475563bc59"],["Wooden Serving Tray",32,42,"photo-1610701596007-11502861dcfa"],["Insulated Travel Mug",26,35,"photo-1514228742587-6b1558fcca3d"]]},
  { name: "Beauty", code: "BEA", items: [
    ["Hydrating Face Cream",24,32,"photo-1608248543803-ba4f8c70ae0b"],["Daily Skin Cleanser",18,25,"photo-1556229010-6c3f2c9ca5f8"],["Vitamin C Serum",29,39,"photo-1601049541289-9b1b7bbbfe19"],["Nourishing Hair Oil",16,22,"photo-1608571423902-eed4a5ad8108"],["Soft Bristle Brush",14,19,"photo-1522335789203-aabd1fc54bc9"],["Everyday Makeup Kit",42,55,"photo-1596462502278-27bfdc403348"],["Matte Lip Color",17,23,"photo-1586495777744-4413f21062fa"],["Gentle Body Lotion",15,21,"photo-1608248543803-ba4f8c70ae0b"],["Travel Grooming Set",31,42,"photo-1621607512214-68297480165e"],["Reusable Makeup Pads",12,17,"photo-1598440947619-2c35fc9aa908"],["Aloe Face Mist",13,18,"photo-1556228720-195a672e8a03"],["Spa Bath Gift Set",36,48,"photo-1608571423902-eed4a5ad8108"]]},
  { name: "Sports", code: "SPO", items: [
    ["Momentum Running Shoes",99,125,"photo-1542291026-7eec264c27ff"],["Pro Yoga Mat",35,45,"photo-1592432678016-e910b452f9a2"],["Adjustable Dumbbell",119,149,"photo-1583454110551-21f2fa2afe61"],["Insulated Sports Bottle",25,34,"photo-1602143407151-7111542de6e8"],["Fitness Resistance Bands",19,27,"photo-1598289431512-b97b0917affc"],["Training Gym Bag",49,65,"photo-1553062407-98eeb64c6a62"],["Cycling Helmet",59,75,"photo-1506629905607-d9f8f5d8d8a8"],["Outdoor Camping Tent",179,229,"photo-1504280390367-361c6d9f38f4"],["Trekking Backpack",109,139,"photo-1622260614153-03223fb72052"],["Sports Wrist Wraps",15,22,"photo-1517836357463-d25dfeac3438"],["Foam Roller",24,32,"photo-1599058917212-d750089bc07e"],["Compact Jump Rope",12,18,"photo-1434596922112-19c563067271"]]},
  { name: "Accessories", code: "ACC", items: [
    ["Nova Everyday Backpack",69,89,"photo-1553062407-98eeb64c6a62"],["Slim Card Wallet",25,35,"photo-1627123424574-724758594e93"],["Polarized Sunglasses",39,55,"photo-1511499767150-a48a237f0083"],["Stainless Steel Watch",89,119,"photo-1524592094714-0f0654e20314"],["Minimal Pendant Necklace",32,45,"photo-1515562141207-7a88fb7ce338"],["Classic Analog Watch",75,99,"photo-1524805444758-089113d48a6d"],["Travel Organizer Pouch",22,30,"photo-1553062407-98eeb64c6a62"],["Leather Laptop Sleeve",39,52,"photo- 腹"],["Everyday Key Holder",14,20,"photo-1553062407-98eeb64c6a62"],["Compact Umbrella",21,29,"photo-1534274988757-a28bf1a57c17"],["Soft Knit Scarf",28,39,"photo-1520903920243-00d872a2d1c9"],["Reusable Shopping Bag",9,14,"photo-1597481499750-3e6b22637e12"]]},
  { name: "Books", code: "BOO", items: [
    ["Atomic Habits",18,24,"photo-1544947950-fa07a98d237f"],["Deep Work",17,23,"photo-1512820790803-83ca734da794"],["The Creative Act",22,29,"photo-1543002588-bfa74002ed7e"],["Think Like a Programmer",32,42,"photo-1532012197267-da84d127e765"],["The Design of Everyday Things",21,28,"photo-1541961017774-22349e4a1262"],["Clean Code",39,49,"photo-1532012197267-da84d127e765"],["The Psychology of Money",16,22,"photo-1544947950-fa07a98d237f"],["Start With Why",19,26,"photo-1512820790803-83ca734da794"],["A Brief History of Time",18,24,"photo-1543002588-bfa74002ed7e"],["The Pragmatic Programmer",35,45,"photo-1532012197267-da84d127e765"],["Ikigai",14,19,"photo-1544947950-fa07a98d237f"],["Show Your Work",15,21,"photo-1512820790803-83ca734da794"]]},
  { name: "Kitchen", code: "KIT", items: [
    ["Chef Knife Set",59,79,"photo-1593618998160-e34014e67546"],["Pour-Over Coffee Maker",35,49,"photo-1495474472287-4d71bcdd2085"],["Electric Kettle",42,55,"photo-1608181831718-c9a7b7b7f6a3"],["Nonstick Frying Pan",39,52,"photo-1584990347449-a2d4a3a8d7d2"],["Digital Kitchen Scale",19,27,"photo-1556911220-e15b29be8c8f"],["Bamboo Cutting Board",24,32,"photo-1556911220-bff31c812dba"],["Glass Meal Prep Set",29,39,"photo-1490645935967-10de6ba17061"],["Compact Blender",49,65,"photo-1570222094114-d054a817e56b"],["Reusable Food Containers",22,30,"photo-1608686207856-001b95cf60ca"],["Cotton Kitchen Towels",16,22,"photo-1556911220-e15b29be8c8f"],["Insulated Lunch Box",27,36,"photo- lunchbox"],["Silicone Utensil Set",25,34,"photo-1556911220-bff31c812dba"]]},
  { name: "Toys", code: "TOY", items: [
    ["Build-It Block Set",35,45,"photo-1599623560574-39d485900c95"],["Wooden Puzzle Board",22,30,"photo-1606092195730-5d7b9af1efc5"],["Remote Control Racer",49,65,"photo-1594787318286-3d835c1d207f"],["Plush Bear Toy",19,27,"photo-1559454403-b8fb88521f11"],["Science Explorer Kit",39,52,"photo-1535378620166-273708d44e4c"],["Art & Craft Box",24,33,"photo-1513364776144-60967b0f800f"],["Mini Tabletop Game",29,39,"photo-1606503153255-59d8b8b8219b"],["Kids Drawing Tablet",32,42,"photo-1513364776144-60967b0f800f"],["Dinosaur Figure Set",21,29,"photo-1599623560574-39d485900c95"],["Beginner Chess Set",25,35,"photo-1586165368502-1bad197a6461"],["Outdoor Flying Disc",12,18,"photo-1599058917212-d750089bc07e"],["Magnetic Building Tiles",42,56,"photo-1599623560574-39d485900c95"]]},
  { name: "Lifestyle", code: "LIF", items: [
    ["Terra Insulated Bottle",29,39,"photo-1602143407151-7111542de6e8"],["Weekend Travel Duffel",59,79,"photo-1553062407-98eeb64c6a62"],["Compact Travel Pillow",22,30,"photo-1511895426328-dc8714191300"],["Reusable Coffee Cup",18,25,"photo-1514228742587-6b1558fcca3d"],["Daily Planner Notebook",16,22,"photo-1531346878377-a5be20888e57"],["Premium Pen Set",24,32,"photo-1455390582262-044cdead277a"],["Desk Organizer",28,38,"photo-1498050108023-c5249f4df085"],["Foldable Yoga Mat",39,52,"photo-1592432678016-e910b452f9a2"],["Sleep Eye Mask",12,18,"photo-1511295742362-92c96b7c9a0f"],["Travel Packing Cubes",25,34,"photo-1553062407-98eeb64c6a62"],["Portable Picnic Blanket",32,44,"photo-1500530855697-b586d89ba3ee"],["Aroma Diffuser",34,46,"photo-1608571423902-eed4a5ad8108"]]}
];

const prefixes = ["Premium", "Classic", "Modern", "Compact", "Essential", "Pro", "Everyday", "Urban", "Signature", "Lightweight", "Deluxe", "Smart", "Travel", "Active", "Minimal", "Plus", "Eco", "Advanced", "Comfort", "Studio", "Performance", "Luxe", "Fresh", "Flex", "Prime"];
const finishes = ["Edition", "Series", "Set", "Collection", "Model", "Design", "Pack", "Bundle", "Version", "Range", "Kit", "Style"];
const slug = value => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const safePhotos = new Set(categories.flatMap(category => category.items.map(item => item[3])));
const fallbackPhoto = "photo-1490481651871-ab68de25d43d";
const invalidPhotoIds = new Set(["photo- 腹", "photo- lunchbox"]);
const imageUrl = id => `https://images.unsplash.com/${invalidPhotoIds.has(id) ? fallbackPhoto : id}?auto=format&fit=crop&w=900&q=85`;

function makeProduct(category, categoryIndex, productIndex) {
  const [baseName, basePrice, baseCompare, photoId] = category.items[productIndex % category.items.length];
  const variant = Math.floor(productIndex / category.items.length);
  // Keep the first 12 product names/SKUs compatible with the previous 120-item seed.
  const name = variant === 0 ? baseName : `${prefixes[variant % prefixes.length]} ${baseName} ${finishes[Math.floor(variant / prefixes.length) % finishes.length]} ${String(variant + 1).padStart(2, "0")}`;
  const skuNumber = productIndex < 12
    ? categoryIndex * 12 + productIndex + 1
    : 120 + categoryIndex * 288 + (productIndex - 12) + 1;
  const sku = `NX-${category.code}-${String(skuNumber).padStart(4, "0")}`;
  const price = Math.max(5, Number((basePrice * (0.72 + ((productIndex * 17 + categoryIndex * 11) % 61) / 100)).toFixed(2)));
  const compareAtPrice = Number((Math.max(price + 3, baseCompare * (0.9 + ((productIndex * 7) % 21) / 100))).toFixed(2));
  const stock = 5 + ((productIndex * 13 + categoryIndex * 7) % 96);
  const rating = Number((4.0 + ((productIndex * 7 + categoryIndex) % 10) / 10).toFixed(1));
  return {
    name,
    slug: `${slug(name)}-${sku.toLowerCase()}`,
    description: `${name} from the NEXORA ${category.name.toLowerCase()} collection. Designed for everyday use with practical features, thoughtful details and reliable value. Demo catalog listing; confirm specifications and availability before purchase.`,
    category: category.name,
    price,
    compareAtPrice,
    stock,
    sku,
    image: imageUrl(photoId),
    featured: productIndex < 8,
    rating,
    active: true
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nexora_commerce");
  let inserted = 0;
  let existing = 0;
  for (let categoryIndex = 0; categoryIndex < categories.length; categoryIndex++) {
    const category = categories[categoryIndex];
    const operations = Array.from({ length: 300 }, (_, productIndex) => {
      const product = makeProduct(category, categoryIndex, productIndex);
      return {
        updateOne: {
          filter: { sku: product.sku },
          update: { $setOnInsert: product },
          upsert: true
        }
      };
    });
    const result = await Product.bulkWrite(operations, { ordered: false });
    inserted += result.upsertedCount || 0;
    existing += 300 - (result.upsertedCount || 0);
    console.log(`${category.name}: processed 300 products`);
  }
  console.log(`\nBulk catalog complete: 3,000 product records processed across 10 categories.`);
  console.log(`New products inserted: ${inserted}; existing SKU records preserved: ${existing}.`);
}

main()
  .catch(error => {
    console.error("Bulk seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
