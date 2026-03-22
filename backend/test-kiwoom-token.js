const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function testToken() {
    try {
        console.log('--- Testing generateAccessToken ---');

        const response = await axios.post(`https://api.kiwoom.com/oauth2/token`, {
            grant_type: 'client_credentials',
            appkey: process.env.KIWOOM_APP_KEY,
            secretkey: process.env.KIWOOM_APP_SECRET
        }, {
            headers: {
                'Content-Type': 'application/json;charset=UTF-8'
            }
        });

        fs.writeFileSync('token_response.json', JSON.stringify(response.data, null, 2));
        console.log('--- Wrote to token_response.json ---');
        process.exit(0);
    } catch (e) {
        console.error('Test Failed:', e);
        if (e.response && e.response.data) {
            fs.writeFileSync('token_error_response.json', JSON.stringify(e.response.data, null, 2));
        }
        process.exit(1);
    }
}
testToken();
