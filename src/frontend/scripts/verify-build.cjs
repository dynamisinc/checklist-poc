/**
 * Post-build verification script
 *
 * Checks the production build for common issues:
 * 1. No localhost references that would break production
 * 2. API base URL is correctly configured (empty or valid URL, not /api)
 *
 * Run after build: node scripts/verify-build.js
 * Or automatically via package.json postbuild hook
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const ASSETS_DIR = path.join(DIST_DIR, 'assets');

console.log('🔍 Verifying production build...\n');

let hasErrors = false;

// Find the main JS bundle
const jsFiles = fs.readdirSync(ASSETS_DIR).filter(f => f.endsWith('.js'));
if (jsFiles.length === 0) {
  console.error('❌ No JS files found in dist/assets/');
  process.exit(1);
}

const mainBundle = jsFiles.find(f => f.startsWith('index-')) || jsFiles[0];
const bundlePath = path.join(ASSETS_DIR, mainBundle);
const bundleContent = fs.readFileSync(bundlePath, 'utf8');

console.log(`📦 Checking bundle: ${mainBundle}\n`);

// Check 1: API base URL should not be localhost
const localhostMatches = bundleContent.match(/baseURL:["'][^"']*localhost[^"']*["']/g);
if (localhostMatches) {
  console.error('❌ ERROR: Found localhost in API baseURL:');
  localhostMatches.forEach(m => console.error(`   ${m}`));
  console.error('   Fix: Check .env.production VITE_API_URL setting\n');
  hasErrors = true;
} else {
  console.log('✅ No localhost in API baseURL');
}

// Check 2: No /api/api double prefix pattern
// Look for patterns like "/api/api" or baseURL containing just "/api"
const doubleApiPattern = /["']\/api\/api/g;
const doubleApiMatches = bundleContent.match(doubleApiPattern);
if (doubleApiMatches) {
  console.error('❌ ERROR: Found /api/api double prefix pattern:');
  console.error('   This indicates VITE_API_URL is set to /api but service files already include /api/');
  console.error('   Fix: Set VITE_API_URL= (empty) in .env.production\n');
  hasErrors = true;
} else {
  console.log('✅ No /api/api double prefix');
}

// Check 3: Verify baseURL value is not /api (which would cause double prefix)
const baseUrlApiOnly = /baseURL:["']\/api["']/g;
const baseUrlApiMatches = bundleContent.match(baseUrlApiOnly);
if (baseUrlApiMatches) {
  console.error('❌ ERROR: baseURL is set to "/api" which causes double prefix:');
  console.error('   Service files use /api/events -> results in /api/api/events');
  console.error('   Fix: Set VITE_API_URL= (empty) in .env.production\n');
  hasErrors = true;
} else {
  console.log('✅ baseURL is not "/api"');
}

// Check 4: Verify there's no http://localhost:5000 or https://localhost:5001 as API base
const devLocalhostPattern = /["'](https?:\/\/localhost:[0-9]+)["']/g;
let match;
const devHosts = [];
while ((match = devLocalhostPattern.exec(bundleContent)) !== null) {
  // Ignore localhost in window.location fallbacks (from libraries)
  const context = bundleContent.substring(Math.max(0, match.index - 50), match.index);
  if (!context.includes('window.location') && !context.includes('location.href')) {
    devHosts.push(match[1]);
  }
}

if (devHosts.length > 0) {
  console.error('❌ ERROR: Found development localhost URLs:');
  devHosts.forEach(h => console.error(`   ${h}`));
  console.error('   Fix: Ensure VITE_API_URL is properly set in .env.production\n');
  hasErrors = true;
} else {
  console.log('✅ No development localhost URLs in API config');
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.error('❌ Build verification FAILED');
  console.error('   Please fix the issues above before deploying.\n');
  process.exit(1);
} else {
  console.log('✅ Build verification PASSED');
  console.log('   Production build is ready for deployment.\n');
}
