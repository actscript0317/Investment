const axios = require('axios');
const fs = require('fs');

async function run() {
    const APP_KEY = 'HaeFwgwuunSsQwMoX2VtWAADubD25lOncJaGs98m8dE';
    const SECRET_KEY = 'vP9CnrTJ_N03qUFqcxiSAjRLhaiwWkBogFYtY1i1cnM';

    try {
        const host = 'https://api.kiwoom.com';

        let token = null;
        try {
            const res = await axios.post(`${host}/oauth2/token`, {
                grant_type: 'client_credentials',
                appkey: APP_KEY,
                appsecret: SECRET_KEY
            });
            token = res.data.access_token;
        } catch (e) {
            try {
                const res2 = await axios.post(`${host}/oauth2/tokenP`, {
                    grant_type: 'client_credentials',
                    appkey: APP_KEY,
                    appsecret: SECRET_KEY
                });
                token = res2.data.access_token;
            } catch (e2) {
                // Ignore
            }
        }

        if (!token) {
            fs.writeFileSync('out.json', JSON.stringify({ error: 'No token generated' }));
            return;
        }

        const headers = {
            'Content-Type': 'application/json;charset=UTF-8',
            'authorization': `Bearer ${token}`,
            'cont-yn': 'N',
            'next-key': '',
            'api-id': 'kt00018'
        };

        const body = {
            'qry_tp': '1',
            'dmst_stex_tp': 'KRX'
        };

        const balanceRes = await axios.post(`${host}/api/dostk/acnt`, body, { headers });
        fs.writeFileSync('out.json', JSON.stringify(balanceRes.data, null, 2));

    } catch (error) {
        fs.writeFileSync('out.json', JSON.stringify({ error: error.response?.data || error.message }));
    }
}

run();
