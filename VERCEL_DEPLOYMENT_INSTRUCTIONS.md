# Vercel Deployment Instructions

## Issue Summary
The Shopify app was failing to deploy to Vercel with the error:
```
ShopifyError: Detected an empty appUrl configuration, please make sure to set the necessary environment variables.
```

## Root Cause
The issue was caused by the `SHOPIFY_APP_URL` environment variable being set to a specific domain in the [.env](file:///c%3A/Users/alimh/Downloads/Compressed/theme_export__double-exposure-com-double-expo-theme-main__15SEP2025-0629am/product-configurator/.env) file, but Vercel generates dynamic URLs for deployments.

## Solution Implemented
1. Modified [shopify.server.js](file:///c%3A/Users/alimh/Downloads/Compressed/theme_export__double-exposure-com-double-expo-theme-main__15SEP2025-0629am/product-configurator/app/shopify.server.js) to use a fallback URL when `SHOPIFY_APP_URL` is not set
2. Created [.env.local](file:///c%3A/Users/alimh/Downloads/Compressed/theme_export__double-exposure-com-double-expo-theme-main__15SEP2025-0629am/product-configurator/.env.local) with `SHOPIFY_APP_URL` left empty for Vercel deployments
3. Updated API routes to use real Shopify data instead of mock data with proper fallbacks

## Vercel Deployment Steps

1. **Set up Environment Variables in Vercel:**
   Go to your Vercel project settings → Environment Variables and add:
   ```
   SHOPIFY_API_KEY=91152a39706588ee7af1680e7922831c
   SHOPIFY_API_SECRET=043ccd33478209d255e6afba1e7591d6
   SHOPIFY_APP_URL=         # Leave this empty
   SHOP_CUSTOM_DOMAIN=double-exposure-2.myshopify.com
   SCOPES=read_products,write_products,read_files,write_files,read_metaobjects,write_metaobjects,read_orders,write_orders,read_order_edits,write_order_edits,read_customers
   DATABASE_URL=file:./prisma/dev.sqlite
   ```

2. **Deploy the Application:**
   Push your changes to GitHub and let Vercel automatically deploy, or use the Vercel CLI:
   ```bash
   vercel --prod
   ```

3. **Update Shopify App Configuration:**
   After deployment, get your Vercel URL and update your Shopify app configuration:
   - Go to your Shopify Partner Dashboard
   - Select your app
   - Go to App setup
   - Update the "App URL" with your Vercel deployment URL
   - Update the "Whitelisted redirection URL(s)" to include:
     - `[YOUR_VERCEL_URL]/auth/callback`
     - `[YOUR_VERCEL_URL]/auth/shopify/callback`
     - `[YOUR_VERCEL_URL]/api/auth/callback`

## Local Development
For local development, use the existing [.env](file:///c%3A/Users/alimh/Downloads/Compressed/theme_export__double-exposure-com-double-expo-theme-main__15SEP2025-0629am/product-configurator/.env) file or create a new one with:
```
SHOPIFY_API_KEY=91152a39706588ee7af1680e7922831c
SHOPIFY_API_SECRET=043ccd33478209d255e6afba1e7591d6
SHOPIFY_APP_URL=http://localhost:3000
SHOP_CUSTOM_DOMAIN=double-exposure-2.myshopify.com
SCOPES=read_products,write_products,read_files,write_files,read_metaobjects,write_metaobjects,read_orders,write_orders,read_order_edits,write_order_edits,read_customers
NODE_ENV=development
FRONTEND_PORT=8002
PORT=3000
HMR_SERVER_PORT=8002
DATABASE_URL=file:./prisma/dev.sqlite
```

Then run:
```bash
npm run dev
```

## Troubleshooting

If you still encounter issues:
1. Make sure all environment variables are correctly set in Vercel
2. Check that the Shopify app configuration matches your deployment URL
3. Verify that the required scopes are included
4. Check the Vercel logs for specific error messages