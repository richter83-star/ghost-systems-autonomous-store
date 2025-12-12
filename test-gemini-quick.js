import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyBthB_v0LFifL4O4kuDoJZb6ZhwQ8TmXog');

async function test() {
    try {
        console.log('Testing Gemini 2.5 Flash...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent('Write a 2-sentence product description for an AI automation tool.');
        const text = result.response.text();
        console.log('\n✓ Gemini AI is working!\n');
        console.log('Sample output:', text.trim());
        console.log('\n✓ Ready to generate products!');
        process.exit(0);
    } catch (error) {
        console.error('✗ Error:', error.message);
        process.exit(1);
    }
}

test();
