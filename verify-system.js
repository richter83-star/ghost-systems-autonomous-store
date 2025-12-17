/**
 * SYSTEM VERIFICATION SCRIPT
 * Checks system status without requiring all environment variables
 */

import 'dotenv/config';
import { existsSync } from 'fs';
import { readFileSync } from 'fs';

console.log('================================================');
console.log('   GHOST SYSTEMS - SYSTEM VERIFICATION');
console.log('================================================\n');

const checks = {
    passed: 0,
    failed: 0,
    warnings: 0,
    details: []
};

// Check 1: Node.js version
console.log('✓ Check 1: Node.js version...');
try {
    const version = process.version;
    const major = parseInt(version.split('.')[0].substring(1));
    console.log(`   Node.js ${version}`);
    if (major >= 18) {
        checks.passed++;
        checks.details.push({ check: 'Node.js Version', status: 'PASS', version });
    } else {
        checks.failed++;
        checks.details.push({ check: 'Node.js Version', status: 'FAIL', message: 'Node.js 18+ required' });
    }
} catch (error) {
    checks.failed++;
    checks.details.push({ check: 'Node.js Version', status: 'FAIL', error: error.message });
}
console.log('');

// Check 2: Package.json exists
console.log('✓ Check 2: Package configuration...');
try {
    if (existsSync('package.json')) {
        const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
        console.log(`   Package: ${pkg.name}`);
        console.log(`   Version: ${pkg.version}`);
        console.log(`   Dependencies: ${Object.keys(pkg.dependencies || {}).length}`);
        checks.passed++;
        checks.details.push({ check: 'Package Configuration', status: 'PASS' });
    } else {
        throw new Error('package.json not found');
    }
} catch (error) {
    checks.failed++;
    checks.details.push({ check: 'Package Configuration', status: 'FAIL', error: error.message });
}
console.log('');

// Check 3: Core files exist
console.log('✓ Check 3: Core files...');
const coreFiles = [
    'server.js',
    'shopify-integration.js',
    'product-generator.js',
    'test-integration.js'
];
let filesFound = 0;
coreFiles.forEach(file => {
    if (existsSync(file)) {
        filesFound++;
        console.log(`   ✓ ${file}`);
    } else {
        console.log(`   ✗ ${file} (missing)`);
    }
});
if (filesFound === coreFiles.length) {
    checks.passed++;
    checks.details.push({ check: 'Core Files', status: 'PASS', count: filesFound });
} else {
    checks.failed++;
    checks.details.push({ check: 'Core Files', status: 'FAIL', found: filesFound, required: coreFiles.length });
}
console.log('');

// Check 4: Dependencies installed
console.log('✓ Check 4: Dependencies...');
try {
    if (existsSync('node_modules')) {
        const requiredDeps = ['express', 'axios', '@google/generative-ai', 'dotenv'];
        let depsFound = 0;
        requiredDeps.forEach(dep => {
            if (existsSync(`node_modules/${dep}`)) {
                depsFound++;
                console.log(`   ✓ ${dep}`);
            } else {
                console.log(`   ✗ ${dep} (missing)`);
            }
        });
        if (depsFound === requiredDeps.length) {
            checks.passed++;
            checks.details.push({ check: 'Dependencies', status: 'PASS', count: depsFound });
        } else {
            checks.failed++;
            checks.details.push({ check: 'Dependencies', status: 'FAIL', found: depsFound, required: requiredDeps.length });
        }
    } else {
        throw new Error('node_modules not found - run npm install');
    }
} catch (error) {
    checks.failed++;
    checks.details.push({ check: 'Dependencies', status: 'FAIL', error: error.message });
}
console.log('');

// Check 5: Environment variables
console.log('✓ Check 5: Environment configuration...');
const requiredEnv = {
    'SHOPIFY_STORE_URL': 'Required - Your Shopify store URL',
    'SHOPIFY_ADMIN_API_TOKEN': 'Required - Shopify Admin API token',
    'SHOPIFY_API_VERSION': 'Optional - Defaults to 2024-10'
};
const optionalEnv = {
    'GEMINI_API_KEY': 'Optional - For AI product generation',
    'FIREBASE_SERVICE_ACCOUNT_JSON': 'Optional - For Firebase integration',
    'SHOPIFY_WEBHOOK_SECRET': 'Optional - For webhook security'
};

let envConfigured = 0;
let envMissing = 0;

console.log('   Required variables:');
Object.keys(requiredEnv).forEach(key => {
    if (process.env[key]) {
        const value = key.includes('TOKEN') || key.includes('KEY') || key.includes('SECRET') 
            ? '***configured***' 
            : process.env[key];
        console.log(`   ✓ ${key}: ${value}`);
        envConfigured++;
    } else {
        console.log(`   ✗ ${key}: ${requiredEnv[key]}`);
        envMissing++;
    }
});

console.log('\n   Optional variables:');
Object.keys(optionalEnv).forEach(key => {
    if (process.env[key]) {
        console.log(`   ✓ ${key}: configured`);
        envConfigured++;
    } else {
        console.log(`   ⚠ ${key}: ${optionalEnv[key]}`);
        checks.warnings++;
    }
});

if (envMissing === 0) {
    checks.passed++;
    checks.details.push({ check: 'Environment Variables', status: 'PASS', configured: envConfigured });
} else {
    checks.failed++;
    checks.details.push({ check: 'Environment Variables', status: 'FAIL', missing: envMissing });
}
console.log('');

// Check 6: Code syntax (basic import check)
console.log('✓ Check 6: Code structure...');
try {
    // Try to import the main modules to check syntax
    const serverCode = readFileSync('server.js', 'utf-8');
    const shopifyCode = readFileSync('shopify-integration.js', 'utf-8');
    
    // Basic syntax checks
    const hasImports = serverCode.includes('import ') && shopifyCode.includes('import ');
    const hasExports = serverCode.includes('export ') || serverCode.includes('module.exports');
    
    if (hasImports) {
        console.log('   ✓ ES Module syntax detected');
        checks.passed++;
        checks.details.push({ check: 'Code Structure', status: 'PASS' });
    } else {
        checks.failed++;
        checks.details.push({ check: 'Code Structure', status: 'FAIL', message: 'Invalid module syntax' });
    }
} catch (error) {
    checks.failed++;
    checks.details.push({ check: 'Code Structure', status: 'FAIL', error: error.message });
}
console.log('');

// Summary
console.log('================================================');
console.log('   VERIFICATION SUMMARY');
console.log('================================================\n');

checks.details.forEach(detail => {
    const icon = detail.status === 'PASS' ? '✓' : detail.status === 'FAIL' ? '✗' : '⚠';
    console.log(`${icon} ${detail.check}: ${detail.status}`);
    if (detail.error) console.log(`   Error: ${detail.error}`);
    if (detail.missing) console.log(`   Missing: ${detail.missing} required items`);
});

console.log('\n------------------------------------------------');
console.log(`Passed: ${checks.passed}`);
console.log(`Failed: ${checks.failed}`);
console.log(`Warnings: ${checks.warnings}`);
console.log('------------------------------------------------\n');

if (checks.failed === 0) {
    console.log('✓ System structure is valid!');
    if (envMissing > 0) {
        console.log('\n⚠ Note: Some environment variables are missing.');
        console.log('   Set them in your .env file or environment to enable full functionality.\n');
    } else {
        console.log('✓ All checks passed! System is ready to run.\n');
    }
} else {
    console.log('✗ Some checks failed. Please fix the issues above.\n');
}

// Provide next steps
console.log('================================================');
console.log('   NEXT STEPS');
console.log('================================================\n');

if (envMissing > 0) {
    console.log('1. Configure environment variables:');
    console.log('   Create a .env file with:');
    console.log('   SHOPIFY_STORE_URL=your_store.myshopify.com');
    console.log('   SHOPIFY_ADMIN_API_TOKEN=your_token');
    console.log('   GEMINI_API_KEY=your_key (optional)\n');
}

if (!existsSync('node_modules')) {
    console.log('2. Install dependencies:');
    console.log('   npm install\n');
}

console.log('3. Run integration tests:');
console.log('   npm test\n');

console.log('4. Start the server:');
console.log('   npm start\n');

process.exit(checks.failed === 0 ? 0 : 1);

