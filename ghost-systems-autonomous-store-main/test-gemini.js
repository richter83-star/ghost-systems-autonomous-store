import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyBthB_v0LFifL4O4kuDoJZb6ZhwQ8TmXog');

async function testGemini() {
    console.log('Testing Gemini AI...\n');
    
    const models = ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'];
    
    for (const modelName of models) {
        try {
            console.log(`Trying ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Say hello in exactly 2 words');
            const text = result.response.text();
            console.log(`✓ ${modelName} works! Response: "${text.trim()}"\n`);
            
            // Update .env with working model
            console.log(`\nWorking model: ${modelName}`);
            process.exit(0);
        } catch (error) {
            console.log(`✗ ${modelName} failed: ${error.message}\n`);
        }
    }
    
    console.log('All models failed. Check API key permissions.');
    process.exit(1);
}

testGemini();
