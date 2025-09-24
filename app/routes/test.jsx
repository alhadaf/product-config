import { json } from "@remix-run/node";

export const loader = async () => {
  return json({
    message: "Test endpoint is working!",
    timestamp: new Date().toISOString(),
    status: "success",
    version: "1.0.1" // Updated version
  });
};

export default function TestRoute() {
  return (
    <div>
      <h1>Test Endpoint</h1>
      <p>This is a test endpoint to verify the deployment is working.</p>
      <p>Version: 1.0.1</p>
    </div>
  );
}