/**
 * API Health Check Utility
 *
 * Verifies API connectivity and URL configuration.
 * Can be run from browser console or used in automated tests.
 *
 * Usage from browser console:
 *   import('/src/core/utils/apiHealthCheck.ts').then(m => m.runHealthCheck())
 *
 * Or access via window object (exposed in development):
 *   window.apiHealthCheck.run()
 */

import { apiClient } from '../services/api';

export interface HealthCheckResult {
  endpoint: string;
  status: 'pass' | 'fail';
  statusCode?: number;
  responseTime: number;
  error?: string;
  url?: string;
}

export interface HealthCheckReport {
  timestamp: string;
  environment: string;
  baseUrl: string;
  results: HealthCheckResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

/**
 * Test endpoints to verify API connectivity
 */
const TEST_ENDPOINTS = [
  { name: 'Event Categories', path: '/api/eventcategories' },
  { name: 'Events', path: '/api/events?activeOnly=false' },
  { name: 'Templates', path: '/api/templates?includeArchived=false' },
  { name: 'Checklists', path: '/api/checklists?showAll=false' },
];

/**
 * Check a single endpoint
 */
async function checkEndpoint(name: string, path: string): Promise<HealthCheckResult> {
  const startTime = performance.now();

  try {
    const response = await apiClient.get(path);
    const responseTime = Math.round(performance.now() - startTime);

    return {
      endpoint: name,
      status: 'pass',
      statusCode: response.status,
      responseTime,
      url: apiClient.defaults.baseURL + path,
    };
  } catch (error: unknown) {
    const responseTime = Math.round(performance.now() - startTime);

    // Extract error details
    let errorMessage = 'Unknown error';
    let statusCode: number | undefined;

    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: unknown }; config?: { url?: string }; message?: string };
      statusCode = axiosError.response?.status;
      errorMessage = axiosError.message || 'Request failed';

      // Check for /api/api double prefix issue
      const requestUrl = axiosError.config?.url || '';
      if (requestUrl.includes('/api/api/')) {
        errorMessage = `DOUBLE PREFIX DETECTED: URL contains /api/api/. Check .env.production VITE_API_URL setting. Request URL: ${requestUrl}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      endpoint: name,
      status: 'fail',
      statusCode,
      responseTime,
      error: errorMessage,
      url: apiClient.defaults.baseURL + path,
    };
  }
}

/**
 * Run health check on all endpoints
 */
export async function runHealthCheck(): Promise<HealthCheckReport> {
  const baseUrl = apiClient.defaults.baseURL || window.location.origin;
  const environment = import.meta.env.MODE || 'unknown';

  console.log('🏥 API Health Check Starting...');
  console.log(`   Environment: ${environment}`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log('');

  const results: HealthCheckResult[] = [];

  for (const endpoint of TEST_ENDPOINTS) {
    console.log(`   Testing: ${endpoint.name}...`);
    const result = await checkEndpoint(endpoint.name, endpoint.path);
    results.push(result);

    if (result.status === 'pass') {
      console.log(`   ✅ ${endpoint.name}: ${result.statusCode} (${result.responseTime}ms)`);
    } else {
      console.error(`   ❌ ${endpoint.name}: ${result.error}`);
    }
  }

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  console.log('');
  console.log('📊 Summary:');
  console.log(`   Total: ${results.length}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Failed: ${failed}`);

  if (failed > 0) {
    console.log('');
    console.log('🔍 Failed Endpoints:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`   - ${r.endpoint}: ${r.error}`);
      if (r.url) console.log(`     URL: ${r.url}`);
    });

    // Check for common issues
    const hasDoublePrefix = results.some(r => r.error?.includes('DOUBLE PREFIX'));
    if (hasDoublePrefix) {
      console.log('');
      console.log('⚠️  COMMON ISSUE DETECTED: /api/api double prefix');
      console.log('   Fix: Set VITE_API_URL= (empty) in .env.production');
    }
  }

  const report: HealthCheckReport = {
    timestamp: new Date().toISOString(),
    environment,
    baseUrl,
    results,
    summary: {
      total: results.length,
      passed,
      failed,
    },
  };

  return report;
}

/**
 * Quick check - just returns pass/fail
 */
export async function quickCheck(): Promise<boolean> {
  try {
    const response = await apiClient.get('/api/eventcategories');
    return response.status === 200;
  } catch {
    return false;
  }
}

// Expose to window in development for easy console access
if (import.meta.env.DEV) {
  (window as unknown as { apiHealthCheck: { run: typeof runHealthCheck; quick: typeof quickCheck } }).apiHealthCheck = {
    run: runHealthCheck,
    quick: quickCheck,
  };
  console.log('💡 API Health Check available: window.apiHealthCheck.run()');
}
