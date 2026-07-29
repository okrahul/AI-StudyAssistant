import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const serverModule = require("../dist/server.cjs");
const app = serverModule.default || serverModule.app || serverModule;

export default app;
