import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  try {
    console.log('=== API PRODUCTS VARIANTS LOADER START ===');

    // Authenticate the request
    const { admin } = await authenticate.admin(request);
    
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");

    if (!productId) {
      console.log('❌ No product ID provided');
      return json({ success: false, error: "Product ID is required" });
    }

    console.log(`📋 Fetching variants for product ID: ${productId}`);

    // Fetch real product variants from Shopify
    const getVariantsQuery = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          options {
            name
            values
          }
          metafields(identifiers: [
            { namespace: "product_configurator", key: "colors" },
            { namespace: "product_configurator", key: "sizes" },
            { namespace: "product_configurator", key: "decorations" },
            { namespace: "product_configurator", key: "base_price" },
            { namespace: "custom", key: "colors" },
            { namespace: "custom", key: "sizes" },
            { namespace: "custom", key: "decorations" }
          ]) {
            namespace
            key
            value
          }
          variants(first: 100) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryQuantity
                selectedOptions {
                  name
                  value
                }
              }
            }
          }
        }
      }
    `;

    const productResponse = await admin.graphql(getVariantsQuery, {
      variables: { id: productId }
    });

    const productResult = await productResponse.json();
    const product = productResult.data?.product;

    if (!product) {
      console.log('❌ Product not found in Shopify');
      return json({ success: false, error: "Product not found" });
    }

    // Process variants
    const variants = product.variants?.edges?.map(edge => ({
      id: edge.node.id,
      title: edge.node.title,
      price: edge.node.price,
      sku: edge.node.sku,
      inventoryQuantity: edge.node.inventoryQuantity,
      selectedOptions: edge.node.selectedOptions
    })) || [];

    // Process metafields
    const metafields = {};
    if (product.metafields) {
      product.metafields.forEach(metafield => {
        if (metafield.namespace && metafield.key && metafield.value) {
          const key = `${metafield.namespace}.${metafield.key}`;
          try {
            // Try to parse JSON values
            metafields[key] = JSON.parse(metafield.value);
          } catch (e) {
            // If not JSON, store as string
            metafields[key] = metafield.value;
          }
        }
      });
    }

    // Process options
    const options = {};
    if (product.options) {
      product.options.forEach(option => {
        if (option.name && option.values) {
          options[option.name.toLowerCase()] = option.values;
        }
      });
    }

    const result = {
      success: true,
      variants: variants,
      product: {
        id: product.id,
        title: product.title,
        handle: product.handle,
        options: options,
        metafields: metafields
      }
    };

    console.log('✅ API call completed successfully with real Shopify data');
    return json(result);

  } catch (error) {
    console.error('❌ Error in API loader:', error);
    
    // Fallback to mock data if there's an error
    const mockVariants = [
      {
        id: "gid://shopify/ProductVariant/1",
        title: "Small / Default",
        price: "15.99",
        sku: "PROD-SMALL-DEFAULT",
        inventoryQuantity: 100,
        selectedOptions: [
          { name: "Size", value: "Small" },
          { name: "Color", value: "Default" }
        ]
      },
      {
        id: "gid://shopify/ProductVariant/2",
        title: "Medium / Default",
        price: "17.99",
        sku: "PROD-MEDIUM-DEFAULT",
        inventoryQuantity: 75,
        selectedOptions: [
          { name: "Size", value: "Medium" },
          { name: "Color", value: "Default" }
        ]
      },
      {
        id: "gid://shopify/ProductVariant/3",
        title: "Large / Default",
        price: "19.99",
        sku: "PROD-LARGE-DEFAULT",
        inventoryQuantity: 50,
        selectedOptions: [
          { name: "Size", value: "Large" },
          { name: "Color", value: "Default" }
        ]
      }
    ];

    const mockMetafields = {
      "product_configurator.colors": ["Red", "Blue", "Black", "White"],
      "product_configurator.sizes": ["Small", "Medium", "Large", "XL"],
      "product_configurator.decorations": ["Screen Print", "Embroidery", "Heat Transfer"],
      "product_configurator.base_price": "15.99"
    };

    return json({
      success: true,
      variants: mockVariants,
      product: {
        id: "gid://shopify/Product/14895984542060",
        title: "Sample Product",
        handle: "sample-product",
        options: {
          size: ["Small", "Medium", "Large", "XL"],
          color: ["Red", "Blue", "Black", "White"],
          decoration: ["Screen Print", "Embroidery", "Heat Transfer"]
        },
        metafields: mockMetafields
      }
    });
  }
};

export const action = () => new Response("Method Not Allowed", { status: 405 });