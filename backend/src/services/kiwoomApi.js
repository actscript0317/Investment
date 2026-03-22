const axios = require('axios');
const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB 설정
const uri = process.env.MONGODB_URI;
let clientPromise = null;

if (uri) {
    const client = new MongoClient(uri);
    clientPromise = client.connect()
        .then(() => {
            console.log('✅ MongoDB 연결 성공 (키움증권 토큰 보관용)');
            const db = client.db(); // 연결 문자열에 포함된 기본 DB 사용
            const collection = db.collection('api_tokens');

            // 인덱스 생성 (provider 기준 고유값)
            collection.createIndex({ provider: 1 }, { unique: true }).catch(err => {
                console.warn('⚠️ MongoDB 인덱스 생성 오류 (이미 존재할 수 있음):', err.message);
            });
            return collection;
        })
        .catch(err => {
            console.error('❌ MongoDB 연결 실패:', err.message);
            return null;
        });
}

class KiwoomApiClient {
    constructor() {
        this.appKey = process.env.KIWOOM_APP_KEY;
        this.appSecret = process.env.KIWOOM_APP_SECRET; // 키움은 보통 secretkey 파라미터명 사용
        this.baseUrl = process.env.KIWOOM_BASE_URL || 'https://api.kiwoom.com';
        this.provider = 'kiwoom';

        // 메모리 캐싱 변수
        this.cachedToken = null;
        this.cachedExpiry = null;
    }

    /**
     * 키움증권 REST API 토큰 생성 (fn_au10001)
     */
    async generateAccessToken() {
        try {
            console.log('🔄 새로운 키움증권 접근 토큰 자동 발급 중...');

            const response = await axios.post(`${this.baseUrl}/oauth2/token`, {
                grant_type: 'client_credentials',
                appkey: this.appKey,
                secretkey: this.appSecret
            }, {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8'
                }
            });

            // 불필요한 콘솔 로그 제거
            const tokenData = response.data;
            const accessToken = tokenData.token; // Kiwoom은 'token' 이라는 필드로 반환함
            if (!accessToken) {
                throw new Error('access_token field is missing in response: ' + JSON.stringify(tokenData));
            }

            // Kiwoom은 만료시간을 "20260323085127" (expires_dt) 형태로 제공
            const expiresDtStr = tokenData.expires_dt;
            let expiresAt;
            if (expiresDtStr && expiresDtStr.length === 14) {
                const yyyy = expiresDtStr.substring(0, 4);
                const MM = expiresDtStr.substring(4, 6) - 1; // JS months are 0-indexed
                const dd = expiresDtStr.substring(6, 8);
                const hh = expiresDtStr.substring(8, 10);
                const mm = expiresDtStr.substring(10, 12);
                const ss = expiresDtStr.substring(12, 14);
                expiresAt = new Date(yyyy, MM, dd, hh, mm, ss);
            } else {
                // 명확하지 않으면 보수적으로 23시간 후로 설정
                const expiresIn = 82800;
                expiresAt = new Date(Date.now() + expiresIn * 1000);
            }

            console.log('✅ 키움증권 토큰 발급 성공');

            // MongoDB 연동 시 DB에 저장
            const collection = clientPromise ? await clientPromise : null;
            if (collection) {
                try {
                    await collection.updateOne(
                        { provider: this.provider },
                        {
                            $set: {
                                provider: this.provider,
                                access_token: accessToken,
                                expires_at: expiresAt,
                                updated_at: new Date()
                            },
                            $setOnInsert: { created_at: new Date() }
                        },
                        { upsert: true }
                    );
                    console.log(`✅ MongoDB에 토큰 저장 완료 (만료: ${expiresAt.toLocaleString('ko-KR')})`);
                } catch (error) {
                    console.error('⚠️ MongoDB api_tokens 컬렉션 저장 오류 (우선 메모리 사용):', error.message);
                }
            } else {
                console.warn('⚠️ MongoDB가 연결되지 않아 토큰이 DB에 저장되지 않습니다.');
            }

            this.cachedToken = accessToken;
            this.cachedExpiry = expiresAt.getTime();

            return accessToken;
        } catch (error) {
            console.error('❌ 키움증권 토큰 발급 실패:', error.response?.data || error.message);

            let errorDetail = error.message;
            if (error.response?.data) {
                errorDetail = JSON.stringify(error.response.data);
            }

            // 환경변수가 비어있는지 진단 메시지 추가
            const envStatus = `(APP_KEY: ${this.appKey ? '존재함' : '없음'}, SECRET: ${this.appSecret ? '존재함' : '없음'})`;

            throw new Error(`토큰 발급 상세 에러: ${errorDetail} ${envStatus}`);
        }
    }

    /**
     * 유효한 접근 토큰 가져오기 (DB/메모리 재사용)
     */
    async getAccessToken() {
        const nowTime = Date.now();

        // 1. 메모리 캐시 확인 (만료 1시간 전)
        if (this.cachedToken && this.cachedExpiry && this.cachedExpiry > nowTime + (1000 * 60 * 60)) {
            return this.cachedToken;
        }

        // 2. MongoDB DB 확인
        const collection = clientPromise ? await clientPromise : null;
        if (collection) {
            try {
                const data = await collection.findOne({ provider: this.provider });

                if (data && data.expires_at) {
                    const dbExpiresAt = new Date(data.expires_at).getTime();

                    // 유효기간이 1시간 이상 남았다면 DB 토큰 재사용
                    if (dbExpiresAt > nowTime + (1000 * 60 * 60)) {
                        console.log('✅ MongoDB에서 기존 유효 토큰 재사용');
                        this.cachedToken = data.access_token;
                        this.cachedExpiry = dbExpiresAt;
                        return data.access_token;
                    } else {
                        console.log('⚠️ MongoDB에 저장된 토큰이 만료되었거나 임박하여 새로 발급을 시도합니다.');
                    }
                }
            } catch (err) {
                console.warn('⚠️ MongoDB 토큰 확인 중 오류:', err.message);
            }
        }

        // 3. 메모리/DB에 유효한 토큰이 없으면 새로 발급
        return await this.generateAccessToken();
    }

    /**
     * 주식 잔고 및 평가 내역 조회 (fn_kt00018)
     */
    async getAccountBalance() {
        try {
            // getAccountBalance() 에서는 token을 스스로 꺼내옴
            const token = await this.getAccessToken();

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

            // 토큰 만료 에러일 경우 DB에서 삭제하여 다음 번에 새로 발급되게끔 조치
            const collection = clientPromise ? await clientPromise : null;
            if (error.response?.status === 401 && collection) {
                console.log('⚠️ 인증(401) 만료 오류 - 기존 토큰 데이터 파기');
                try {
                    await collection.deleteOne({ provider: this.provider });
                } catch (e) {
                    // ignore
                }
                this.cachedToken = null;
            }

            throw error;
        }
    }
}

module.exports = new KiwoomApiClient();
