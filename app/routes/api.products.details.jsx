import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  
  try {
    const url = new URL(request.url);
    const productId = url.searchParams.get("productId");
    
    if (!productId) {
      return json({ success: false, error: "Product ID is required" });
    }

    const getProductQuery = `
      query getProduct($id: ID!) {
        product(id: $id) {
          id
          title
          handle
          description
          productType
          vendor
          tags
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
            { namespace: "custom", key: "decorations" },
            { namespace: "custom", key: "specs" },
            { namespace: "custom", key: "specifications" }
          ]) {
            namespace
            key
            value
          }
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
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
    
    const productResponse = await admin.graphql(getProductQuery, {
      variables: { id: productId }
    });
    
    const productResult = await productResponse.json();
    const product = productResult.data?.product;
    
    if (!product) {
      return json({ success: false, error: "Product not found" });
    }
    
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
    
    // Return processed product data
    const processedProduct = {
      id: product.id,
      title: product.title,
      handle: product.handle,
      description: product.description,
      productType: product.productType,
      vendor: product.vendor,
      tags: product.tags,
      options: options,
      metafields: metafields,
      images: product.images?.edges?.map(edge => edge.node) || [],
      variants: product.variants?.edges?.map(edge => edge.node) || []
    };
    
    return json({ 
      success: true, 
      product: processedProduct
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return json({ 
      success: false, 
      error: "Failed to fetch product details" 
    });
  }
};