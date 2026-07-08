/// <reference types="node" />
// Vercel serverless entry point. Vercel invokes this single function and the
// Expo server adapter routes the request to the right +api.ts handler in the
// exported server bundle (dist/server). Do not confuse this with the app's
// route handlers in src/app/api/*.
const { createRequestHandler } = require('expo-server/adapter/vercel');

module.exports = createRequestHandler({
  build: require('path').join(__dirname, '../dist/server'),
});
