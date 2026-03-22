const kiwoomApi = require('./src/services/kiwoomApi');
const fs = require('fs');

async function test() {
    try {
        console.log('--- Testing kiwoomApi getAccountBalance ---');
        const balance = await kiwoomApi.getAccountBalance();
        fs.writeFileSync('balance.json', JSON.stringify(balance, null, 2));
        console.log('--- Wrote to balance.json ---');
        process.exit(0);
    } catch (e) {
        console.error('Test Failed:', e.message);
        if (e.response && e.response.data) {
            fs.writeFileSync('balance_error.json', JSON.stringify(e.response.data, null, 2));
        }
        process.exit(1);
    }
}
test();
