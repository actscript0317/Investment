const axios = require('axios');
require('dotenv').config();

class KiwoomApiClient {
    constructor() {
        this.appKey = process.env.KIWOOM_APP_KEY;
        this.appSecret = process.env.KIWOOM_APP_SECRET;
        this.baseUrl = process.env.KIWOOM_BASE_URL || 'https://api.kiwoom.com';
    }

    /**
     * 주식 잔고 및 평가 내역 조회 (fn_kt00018)
     * @param {string} token - Kiwoom REST Access Token
     * @returns {Object} 잔고 정보 JSON
     */
    async getAccountBalance(token) {
        try {
            if (!token) {
                throw new Error('접근 토큰이 제공되지 않았습니다.');
            }

            console.log('📡 키움증권 계좌 잔고 조회 요청 (api-id: kt00018)');

            const response = await axios.post(
                `${this.baseUrl}/api/dostk/acnt`,
                {
                    qry_tp: '1',  // 조회구분 1:합산, 2:개별
                    dmst_stex_tp: 'KRX' // 국내거래소구분
                },
                {
                    headers: {
                        'Content-Type': 'application/json;charset=UTF-8',
                        'authorization': `Bearer ${token}`,
                        'cont-yn': 'N',
                        'next-key': '',
                        'api-id': 'kt00018'
                    }
                }
            );

            return response.data;
        } catch (error) {
            console.error('❌ 키움증권 계좌 잔고 조회 실패:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new KiwoomApiClient();
