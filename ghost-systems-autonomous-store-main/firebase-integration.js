/**
 * FIREBASE INTEGRATION MODULE
 * Handles Firestore operations for product management
 */

import admin from 'firebase-admin';
import 'dotenv/config';

let db = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin
 */
export function initializeFirebase() {
    if (isInitialized) {
        return db;
    }

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        }
        
        db = admin.firestore();
        isInitialized = true;
        
        console.log('✓ Firebase initialized successfully');
        console.log(`  Project: ${serviceAccount.project_id}`);
        
        return db;
    } catch (error) {
        console.error('✗ Firebase initialization failed:', error.message);
        throw error;
    }
}

/**
 * Save product to Firestore
 */
export async function saveProductToFirestore(productData) {
    try {
        const db = initializeFirebase();
        const collection = process.env.FIRESTORE_JOBS_COLLECTION || 'products';
        
        const docRef = await db.collection(collection).add({
            ...productData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✓ Saved to Firestore: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        console.error('✗ Failed to save to Firestore:', error.message);
        throw error;
    }
}

/**
 * Get product from Firestore
 */
export async function getProductFromFirestore(productId) {
    try {
        const db = initializeFirebase();
        const collection = process.env.FIRESTORE_JOBS_COLLECTION || 'products';
        
        const doc = await db.collection(collection).doc(productId).get();
        
        if (!doc.exists) {
            throw new Error('Product not found');
        }
        
        return { id: doc.id, ...doc.data() };
    } catch (error) {
        console.error('✗ Failed to get from Firestore:', error.message);
        throw error;
    }
}

/**
 * Get all products from Firestore
 */
export async function getAllProductsFromFirestore(limit = 100) {
    try {
        const db = initializeFirebase();
        const collection = process.env.FIRESTORE_JOBS_COLLECTION || 'products';
        
        const snapshot = await db.collection(collection)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        
        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });
        
        return products;
    } catch (error) {
        console.error('✗ Failed to get products from Firestore:', error.message);
        throw error;
    }
}

/**
 * Update product in Firestore
 */
export async function updateProductInFirestore(productId, updates) {
    try {
        const db = initializeFirebase();
        const collection = process.env.FIRESTORE_JOBS_COLLECTION || 'products';
        
        await db.collection(collection).doc(productId).update({
            ...updates,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✓ Updated Firestore doc: ${productId}`);
        return true;
    } catch (error) {
        console.error('✗ Failed to update Firestore:', error.message);
        throw error;
    }
}

/**
 * Delete product from Firestore
 */
export async function deleteProductFromFirestore(productId) {
    try {
        const db = initializeFirebase();
        const collection = process.env.FIRESTORE_JOBS_COLLECTION || 'products';
        
        await db.collection(collection).doc(productId).delete();
        
        console.log(`✓ Deleted from Firestore: ${productId}`);
        return true;
    } catch (error) {
        console.error('✗ Failed to delete from Firestore:', error.message);
        throw error;
    }
}

/**
 * Save product analytics
 */
export async function saveProductAnalytics(productId, analytics) {
    try {
        const db = initializeFirebase();
        
        await db.collection('analytics').doc(productId).set({
            ...analytics,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`✓ Analytics saved for: ${productId}`);
        return true;
    } catch (error) {
        console.error('✗ Failed to save analytics:', error.message);
        throw error;
    }
}

/**
 * Get product analytics
 */
export async function getProductAnalytics(productId) {
    try {
        const db = initializeFirebase();
        
        const doc = await db.collection('analytics').doc(productId).get();
        
        if (!doc.exists) {
            return null;
        }
        
        return doc.data();
    } catch (error) {
        console.error('✗ Failed to get analytics:', error.message);
        throw error;
    }
}

/**
 * Sync Shopify product to Firestore
 */
export async function syncShopifyToFirestore(shopifyProduct) {
    try {
        const productData = {
            shopifyId: shopifyProduct.id.toString(),
            title: shopifyProduct.title,
            description: shopifyProduct.body_html,
            productType: shopifyProduct.product_type,
            vendor: shopifyProduct.vendor,
            tags: shopifyProduct.tags,
            price: shopifyProduct.variants[0]?.price,
            imageUrl: shopifyProduct.image?.src,
            status: shopifyProduct.status,
            handle: shopifyProduct.handle,
            publishedAt: shopifyProduct.published_at,
            source: 'shopify'
        };
        
        const firestoreId = await saveProductToFirestore(productData);
        return firestoreId;
    } catch (error) {
        console.error('✗ Sync failed:', error.message);
        throw error;
    }
}

/**
 * Test Firebase connection
 */
export async function testFirebaseConnection() {
    try {
        const db = initializeFirebase();
        const collection = process.env.FIRESTORE_JOBS_COLLECTION || 'products';
        
        // Try to read from collection
        await db.collection(collection).limit(1).get();
        
        console.log('✓ Firebase connection test successful');
        return true;
    } catch (error) {
        console.error('✗ Firebase connection test failed:', error.message);
        return false;
    }
}

export default {
    initializeFirebase,
    saveProductToFirestore,
    getProductFromFirestore,
    getAllProductsFromFirestore,
    updateProductInFirestore,
    deleteProductFromFirestore,
    saveProductAnalytics,
    getProductAnalytics,
    syncShopifyToFirestore,
    testFirebaseConnection
};
