// Thin wrapper around the compiled entry point. Deferring to dist/index.js
// keeps environment loading and the database connection in one place -
// this file previously required dist/app directly, skipping both.
require('./dist/index.js');
