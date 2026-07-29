// Vercel Serverless Function entry point
// Imports the compiled CommonJS server bundle created during 'npm run build'
const serverModule = require("../dist/server.cjs");
const app = serverModule.default || serverModule.app || serverModule;

export default app;
