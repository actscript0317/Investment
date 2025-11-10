const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TOKEN_CACHE_PATH = path.join(__dirname, 'src', '.token-cache.json');
const KIS_BASE_URL = process.env.KIS_BASE_URL;
const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_APP_SECRET = process.env.KIS_APP_SECRET;

async function testRawAPI() {
    // Load token
    const cacheData = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
    const token = cacheData.accessToken;

    console.log('🔍 Raw KIS API 테스트 (005930 - 삼성전자)...\n');

    try {
        const response = await axios.get(
            `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
            {
                headers: {
                    'content-type': 'application/json; charset=utf-8',
                    'authorization': `Bearer ${token}`,
                    'appkey': KIS_APP_KEY,
                    'appsecret': KIS_APP_SECRET,
                    'tr_id': 'FHKST01010100'
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J',
                    FID_INPUT_ISCD: '005930'
                }
            }
        );

        console.log('✅ Full API Response:');
        console.log(JSON.stringify(response.data, null, 2));

        console.log('\n📋 Output 필드들:');
        const output = response.data.output;
        for (const key in output) {
            if (output[key]) {
                console.log(`${key}: ${output[key]}`);
            }
        }
    } catch (error) {
        console.error('❌ API 호출 실패:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

testRawAPI();
