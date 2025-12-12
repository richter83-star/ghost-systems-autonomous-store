/**
 * INTEGRATION TEST SUITE
 * Tests all components of the Ghost Systems integration
 */

import 'dotenv/config';
import { 
    testConnection, 
    getStoreInfo, 
    getShopifyProducts 
} from './shopify-integration.js';

async function runTests() {
    console.log('================================================');
    console.log('   GHOST SYSTEMS - INTEGRATION TESTS');
    console.log('================================================\n');
    
    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };
    
    // Test 1: Environment Variables
    console.log('🧪 Test 1: Checking environment variables...');
    try {
        const requiredVars = [
            'SHOPIFY_STORE_URL',
            'SHOPIFY_ADMIN_API_TOKEN',
            'SHOPIFY_API_VERSION'
        ];
        
        const missing = requiredVars.filter(v => !process.env[v]);
        
        if (missing.length > 0) {
            throw new Error(`Missing variables: ${missing.join(', ')}`);
        }
        
        console.log('   ✓ All required environment variables present\n');
        results.passed++;
        results.tests.push({ name: 'Environment Variables', status: 'PASS' });
    } catch (error) {
        console.log(`   ✗ ${error.message}\n`);
        results.failed++;
        results.tests.push({ name: 'Environment Variables', status: 'FAIL', error: error.message });
    }
    
    // Test 2: Shopify Connection
    console.log('🧪 Test 2: Testing Shopify connection...');
    try {
        const connected = await testConnection();
        
        if (!connected) {
            throw new Error('Connection failed');
        }
        
        console.log('   ✓ Shopify connection successful\n');
        results.passed++;
        results.tests.push({ name: 'Shopify Connection', status: 'PASS' });
    } catch (error) {
        console.log(`   ✗ ${error.message}\n`);
        results.failed++;
        results.tests.push({ name: 'Shopify Connection', status: 'FAIL', error: error.message });
    }
    
    // Test 3: Store Information
    console.log('🧪 Test 3: Fetching store information...');
    try {
        const storeInfo = await getStoreInfo();
        
        console.log(`   ✓ Store Name: ${storeInfo.name}`);
        console.log(`   ✓ Domain: ${storeInfo.domain}`);
        console.log(`   ✓ Currency: ${storeInfo.currency}\n`);
        
        results.passed++;
        results.tests.push({ name: 'Store Information', status: 'PASS' });
    } catch (error) {
        console.log(`   ✗ ${error.message}\n`);
        results.failed++;
        results.tests.push({ name: 'Store Information', status: 'FAIL', error: error.message });
    }
    
    // Test 4: Product Access
    console.log('🧪 Test 4: Fetching products...');
    try {
        const products = await getShopifyProducts(10);
        
        console.log(`   ✓ Found ${products.length} products`);
        if (products.length > 0) {
            console.log(`   ✓ Sample: "${products[0].title}"`);
        }
        console.log('');
        
        results.passed++;
        results.tests.push({ name: 'Product Access', status: 'PASS' });
    } catch (error) {
        console.log(`   ✗ ${error.message}\n`);
        results.failed++;
        results.tests.push({ name: 'Product Access', status: 'FAIL', error: error.message });
    }
    
    // Test 5: Gemini AI (Optional)
    console.log('🧪 Test 5: Testing Gemini AI...');
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY not configured (optional)');
        }
        
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' });
        
        const result = await model.generateContent('Say "test successful" in exactly 2 words');
        const text = result.response.text();
        
        console.log(`   ✓ Gemini AI responding: "${text.trim()}"\n`);
        results.passed++;
        results.tests.push({ name: 'Gemini AI', status: 'PASS' });
    } catch (error) {
        console.log(`   ⚠ ${error.message}\n`);
        results.tests.push({ name: 'Gemini AI', status: 'SKIP', error: error.message });
    }
    
    // Test 6: Firebase (Optional)
    console.log('🧪 Test 6: Testing Firebase...');
    try {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON not configured (optional)');
        }
        
        console.log('   ✓ Firebase credentials present\n');
        results.passed++;
        results.tests.push({ name: 'Firebase', status: 'PASS' });
    } catch (error) {
        console.log(`   ⚠ ${error.message}\n`);
        results.tests.push({ name: 'Firebase', status: 'SKIP', error: error.message });
    }
    
    // Summary
    console.log('================================================');
    console.log('   TEST RESULTS');
    console.log('================================================\n');
    
    results.tests.forEach(test => {
        const icon = test.status === 'PASS' ? '✓' : test.status === 'FAIL' ? '✗' : '⚠';
        console.log(`${icon} ${test.name}: ${test.status}`);
    });
    
    console.log('\n------------------------------------------------');
    console.log(`Total: ${results.tests.length} tests`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    console.log('------------------------------------------------\n');
    
    if (results.failed === 0) {
        console.log('✓ All critical tests passed!');
        console.log('  Your integration is ready to use.\n');
        return true;
    } else {
        console.log('✗ Some tests failed.');
        console.log('  Please check your configuration.\n');
        return false;
    }
}

// Run tests
runTests()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('Test suite error:', error);
        process.exit(1);
    });
