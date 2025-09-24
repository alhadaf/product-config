import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { useEffect } from "react";

export default function App() {
  // Suppress App Bridge SendBeacon errors in development
  useEffect(() => {
    // Override the sendBeacon method to prevent errors
    const originalSendBeacon = navigator.sendBeacon;
    navigator.sendBeacon = function(url, data) {
      try {
        return originalSendBeacon.apply(this, arguments);
      } catch (error) {
        console.log("SendBeacon error suppressed:", error);
        return true; // Return true to prevent error propagation
      }
    };

    return () => {
      navigator.sendBeacon = originalSendBeacon;
    };
  }, []);

  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
