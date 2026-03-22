const { MongoClient } = require('mongodb');
require('dotenv').config();

async function clearMongo() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.log('No URI');
        return;
    }
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db();
        await db.collection('api_tokens').deleteMany({});
        console.log('Cleared all tokens from mongo!');
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}
clearMongo();
