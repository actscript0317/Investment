const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 클라이언트 설정 (선택적)
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('✅ kisApiService: Supabase 클라이언트 초기화 완료');
} else {
    console.log('⚠️ kisApiService: Supabase 설정이 없습니다. DB 캐싱이 비활성화됩니다.');
}

// 한국투자증권 API 설정
const KIS_BASE_URL = process.env.KIS_BASE_URL || 'https://openapi.koreainvestment.com:9443';
const KIS_APP_KEY = process.env.KIS_APP_KEY;
const KIS_APP_SECRET = process.env.KIS_APP_SECRET;

// 토큰 저장 경로
const TOKEN_CACHE_PATH = path.join(__dirname, '..', '.token-cache.json');

let accessToken = null;
let tokenExpiry = null;

// 저장된 토큰 로드
function loadTokenFromCache() {
    try {
        if (fs.existsSync(TOKEN_CACHE_PATH)) {
            const cacheData = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));

            // 토큰이 아직 유효한지 확인
            if (cacheData.tokenExpiry && Date.now() < cacheData.tokenExpiry) {
                accessToken = cacheData.accessToken;
                tokenExpiry = cacheData.tokenExpiry;
                const remainingHours = Math.floor((tokenExpiry - Date.now()) / 1000 / 60 / 60);
                console.log(`✅ 저장된 토큰 로드 성공 (만료까지 약 ${remainingHours}시간 남음)`);
                return true;
            } else {
                console.log('⚠️ 저장된 토큰이 만료되었습니다.');
            }
        }
    } catch (error) {
        console.log('⚠️ 토큰 캐시 로드 실패:', error.message);
    }
    return false;
}

// 토큰 파일에 저장
function saveTokenToCache(token, expiry, issuedDate) {
    try {
        const cacheData = {
            accessToken: token,
            tokenExpiry: expiry,
            issuedDate: issuedDate // 발급 날짜 저장
        };
        fs.writeFileSync(TOKEN_CACHE_PATH, JSON.stringify(cacheData, null, 2), 'utf8');
    } catch (error) {
        console.error('⚠️ 토큰 캐시 저장 실패:', error.message);
    }
}

// 초기화 시 저장된 토큰 로드
loadTokenFromCache();

// 하루에 한 번만 토큰 발급 확인
function canIssueToken() {
    try {
        if (fs.existsSync(TOKEN_CACHE_PATH)) {
            const cacheData = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));

            if (cacheData.issuedDate) {
                const issuedDate = new Date(cacheData.issuedDate);
                const today = new Date();

                // 같은 날짜인지 확인 (년, 월, 일 비교)
                const isSameDay =
                    issuedDate.getFullYear() === today.getFullYear() &&
                    issuedDate.getMonth() === today.getMonth() &&
                    issuedDate.getDate() === today.getDate();

                if (isSameDay) {
                    console.log('⚠️ 오늘 이미 토큰이 발급되었습니다. 기존 토큰을 사용합니다.');
                    return false;
                }
            }
        }
    } catch (error) {
        console.log('⚠️ 토큰 발급 체크 실패:', error.message);
    }
    return true;
}

// 액세스 토큰 가져오기 (자동 발급 안함 - 저장된 토큰만 사용)
async function getAccessToken() {
    console.log('📞 getAccessToken() 호출됨');

    // 메모리에 토큰이 있고 유효하면 재사용
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        const remainingMinutes = Math.floor((tokenExpiry - Date.now()) / 1000 / 60);
        console.log(`✅ 캐시된 토큰 재사용 (만료까지 약 ${Math.floor(remainingMinutes / 60)}시간 ${remainingMinutes % 60}분 남음)`);
        return accessToken;
    }

    console.log('⚠️ 메모리에 토큰 없음, 파일에서 로드 시도...');

    // 파일에서 다시 로드 시도
    if (loadTokenFromCache()) {
        console.log('✅ 파일에서 토큰 로드 성공');
        return accessToken;
    }

    // 저장된 토큰이 없으면 자동 발급 (클라우드 환경 대응)
    console.log('⚠️ 저장된 토큰이 없습니다. 자동으로 토큰을 발급합니다...');
    try {
        await issueTokenWithoutDateCheck();
        return accessToken;
    } catch (error) {
        console.error('❌ 자동 토큰 발급 실패:', error.message);
        throw new Error('토큰 발급에 실패했습니다. 잠시 후 다시 시도해주세요.');
    }
}

// 날짜 체크 없이 토큰 발급 (클라우드 환경용)
async function issueTokenWithoutDateCheck() {
    try {
        console.log('🔄 새로운 토큰 자동 발급 중...');
        const response = await axios.post(`${KIS_BASE_URL}/oauth2/tokenP`, {
            grant_type: 'client_credentials',
            appkey: KIS_APP_KEY,
            appsecret: KIS_APP_SECRET
        });

        accessToken = response.data.access_token;
        const now = Date.now();
        const issuedDate = new Date(now).toISOString();
        // 토큰 만료 시간 설정 (발급 후 23시간 59분 유효)
        tokenExpiry = now + (23 * 60 * 60 * 1000) + (59 * 60 * 1000);

        // 토큰을 파일에 저장
        saveTokenToCache(accessToken, tokenExpiry, issuedDate);

        console.log('✅ 한국투자증권 API 토큰 자동 발급 성공');
        console.log(`   - 발급 시간: ${new Date(now).toLocaleString('ko-KR')}`);
        console.log(`   - 만료 시간: ${new Date(tokenExpiry).toLocaleString('ko-KR')}`);

        return true;
    } catch (error) {
        console.error('❌ 한국투자증권 API 토큰 발급 실패:', error.message);
        throw error;
    }
}

// 새로운 토큰 수동 발급
async function issueNewToken() {
    // 하루에 한 번만 발급 체크
    if (!canIssueToken()) {
        throw new Error('오늘 이미 토큰이 발급되었습니다. 내일 다시 시도해주세요.');
    }

    try {
        await issueTokenWithoutDateCheck();
        return {
            success: true,
            message: '토큰 발급 성공',
            issuedAt: new Date(Date.now()).toISOString(),
            expiresAt: new Date(tokenExpiry).toISOString()
        };
    } catch (error) {
        console.error('❌ 한국투자증권 API 토큰 발급 실패:', error.message);
        throw error;
    }
}

// 토큰 상태 확인
function getTokenStatus() {
    if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
        const remainingHours = Math.floor((tokenExpiry - Date.now()) / 1000 / 60 / 60);
        return {
            hasToken: true,
            isValid: true,
            remainingHours: remainingHours,
            expiresAt: new Date(tokenExpiry).toISOString()
        };
    }

    // 파일에서 확인
    try {
        if (fs.existsSync(TOKEN_CACHE_PATH)) {
            const cacheData = JSON.parse(fs.readFileSync(TOKEN_CACHE_PATH, 'utf8'));
            if (cacheData.tokenExpiry && Date.now() < cacheData.tokenExpiry) {
                const remainingHours = Math.floor((cacheData.tokenExpiry - Date.now()) / 1000 / 60 / 60);
                return {
                    hasToken: true,
                    isValid: true,
                    remainingHours: remainingHours,
                    expiresAt: new Date(cacheData.tokenExpiry).toISOString()
                };
            }
        }
    } catch (error) {
        // 무시
    }

    return {
        hasToken: false,
        isValid: false,
        message: '토큰이 없거나 만료되었습니다.'
    };
}

// 주식 현재가 조회
async function getStockQuote(stockCode) {
    try {
        const token = await getAccessToken();

        const response = await axios.get(
            `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price`,
            {
                headers: {
                    'content-type': 'application/json; charset=utf-8',
                    'authorization': `Bearer ${token}`,
                    'appkey': KIS_APP_KEY,
                    'appsecret': KIS_APP_SECRET,
                    'tr_id': 'FHKST01010100' // 주식현재가 시세 조회 tr_id
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J', // 주식 시장 구분 (J: 주식)
                    FID_INPUT_ISCD: stockCode // 종목코드
                }
            }
        );

        const data = response.data.output;

        return {
            code: stockCode,
            name: data.hts_kor_isnm || '알 수 없는 종목',
            currentPrice: parseInt(data.stck_prpr) || 0,
            priceChange: parseInt(data.prdy_vrss) || 0,
            changeRate: parseFloat(data.prdy_ctrt) || 0,
            openPrice: parseInt(data.stck_oprc) || 0,
            highPrice: parseInt(data.stck_hgpr) || 0,
            lowPrice: parseInt(data.stck_lwpr) || 0,
            volume: parseInt(data.acml_vol) || 0,
            // 추가 정보
            marketCap: parseInt(data.hts_avls) || 0,           // 시가총액
            listedShares: parseInt(data.lstn_stcn) || 0,        // 상장주식수
            week52High: parseInt(data.w52_hgpr) || 0,           // 52주 최고가
            week52Low: parseInt(data.w52_lwpr) || 0,            // 52주 최저가
            tradeValue: parseInt(data.acml_tr_pbmn) || 0        // 누적거래대금
        };
    } catch (error) {
        console.error('주식 시세 조회 오류:', error.message);
        throw error;
    }
}

// 주식 일별 차트 데이터 조회
async function getStockChartData(stockCode, period = 'D', loadAll = false) {
    try {
        const token = await getAccessToken();

        // 봉 차트 타입에 따른 기간 분류 코드
        // API 제한: D(일) 최근 30거래일, W(주) 최근 30주, M(월) 최근 30개월
        let periodDivCode = period; // D, W, M 직접 사용

        // Y(년봉)는 월봉 데이터를 사용
        if (period === 'Y') {
            periodDivCode = 'M';
        }

        // 전체 데이터 로드 시
        if (loadAll) {
            // 1. 먼저 DB에서 조회
            console.log(`🔍 DB에서 ${stockCode} ${getBongName(period)} 데이터 조회 중...`);
            let dbData = await getChartDataFromDB(stockCode, periodDivCode);

            if (dbData && dbData.length > 0) {
                console.log(`✅ DB에서 ${dbData.length}개 데이터 발견`);

                // 2. DB에 있는 가장 최근 날짜 확인
                const latestDate = await getLatestDateFromDB(stockCode, periodDivCode);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // 3. 최근 데이터가 오늘이 아니면 최신 데이터만 추가 로드
                if (latestDate && latestDate < today) {
                    console.log(`📥 최신 데이터 업데이트 중... (${latestDate.toLocaleDateString()} 이후)`);
                    const newData = await fetchRecentData(stockCode, periodDivCode, token);

                    if (newData && newData.length > 0) {
                        // DB에 저장
                        await saveChartDataToDB(stockCode, periodDivCode, newData);

                        // 기존 데이터와 병합
                        const allData = [...dbData, ...newData];
                        // 중복 제거 및 정렬
                        const uniqueData = Array.from(
                            new Map(allData.map(item => [item.date, item])).values()
                        ).sort((a, b) => new Date(a.date) - new Date(b.date));

                        console.log(`✅ 총 ${uniqueData.length}개 데이터 (기존: ${dbData.length}, 신규: ${newData.length})`);
                        return uniqueData;
                    }
                }

                // 4. 이미 최신이면 DB 데이터 그대로 반환
                return dbData;
            }

            // 5. DB에 없으면 전체 데이터 로드
            console.log(`📥 DB에 데이터가 없어 전체 데이터 로딩 시작...`);
            const allData = await loadAllHistoricalData(stockCode, periodDivCode, token);

            // 6. DB에 저장
            if (allData && allData.length > 0) {
                await saveChartDataToDB(stockCode, periodDivCode, allData);
            }

            return allData;
        }

        const response = await axios.get(
            `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-price`,
            {
                headers: {
                    'content-type': 'application/json; charset=utf-8',
                    'authorization': `Bearer ${token}`,
                    'appkey': KIS_APP_KEY,
                    'appsecret': KIS_APP_SECRET,
                    'tr_id': 'FHKST01010400', // 주식현재가 일자별
                    'custtype': 'P' // 개인
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J', // J:KRX, NX:NXT, UN:통합
                    FID_INPUT_ISCD: stockCode, // 종목코드
                    FID_PERIOD_DIV_CODE: periodDivCode, // D:일, W:주, M:월
                    FID_ORG_ADJ_PRC: '0' // 0:수정주가미반영, 1:수정주가반영
                }
            }
        );

        const chartArray = response.data.output || [];

        // 데이터가 없으면 빈 배열 반환
        if (chartArray.length === 0) {
            console.log('⚠️ 차트 데이터가 없습니다.');
            return [];
        }

        // 데이터 변환
        const mappedData = chartArray.map(item => ({
            date: formatDateString(item.stck_bsop_date), // 주식 영업 일자
            open: parseInt(item.stck_oprc) || 0,         // 주식 시가
            high: parseInt(item.stck_hgpr) || 0,         // 주식 최고가
            low: parseInt(item.stck_lwpr) || 0,          // 주식 최저가
            close: parseInt(item.stck_clpr) || 0,        // 주식 종가
            volume: parseInt(item.acml_vol) || 0         // 누적 거래량
        })).reverse(); // 날짜 오름차순 정렬

        console.log(`✅ ${getBongName(period)} 차트 데이터 조회 성공: ${mappedData.length}개 데이터`);
        return mappedData;
    } catch (error) {
        console.error('❌ 차트 데이터 조회 오류:', error.response?.data || error.message);
        throw error;
    }
}

// 전체 히스토리 데이터 로드 (상장 이후 전체) - 기간별 차트 API 사용
async function loadAllHistoricalData(stockCode, periodDivCode, token) {
    console.log(`📥 전체 ${getBongName(periodDivCode)} 데이터 로딩 시작 (기간별 차트 API 사용)...`);

    try {
        // 조회 종료일자 (오늘)
        const endDate = new Date();
        const endDateStr = formatDateToYYYYMMDD(endDate);

        // 조회 시작일자 (상장일 추정 - 충분히 과거로 설정)
        const startDate = new Date();
        if (periodDivCode === 'D') {
            startDate.setFullYear(startDate.getFullYear() - 20); // 일봉: 20년 전
        } else if (periodDivCode === 'W') {
            startDate.setFullYear(startDate.getFullYear() - 30); // 주봉: 30년 전
        } else if (periodDivCode === 'M') {
            startDate.setFullYear(startDate.getFullYear() - 50); // 월봉: 50년 전
        }
        const startDateStr = formatDateToYYYYMMDD(startDate);

        console.log(`📅 조회 기간: ${startDateStr} ~ ${endDateStr}`);

        const response = await axios.get(
            `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
            {
                headers: {
                    'content-type': 'application/json; charset=utf-8',
                    'authorization': `Bearer ${token}`,
                    'appkey': KIS_APP_KEY,
                    'appsecret': KIS_APP_SECRET,
                    'tr_id': 'FHKST03010100', // 주식현재가 일자별시세(기간별)
                    'custtype': 'P'
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J', // J:KRX
                    FID_INPUT_ISCD: stockCode,
                    FID_INPUT_DATE_1: startDateStr, // 조회 시작일자
                    FID_INPUT_DATE_2: endDateStr,   // 조회 종료일자
                    FID_PERIOD_DIV_CODE: periodDivCode, // D:일, W:주, M:월
                    FID_ORG_ADJ_PRC: '0' // 0:수정주가미반영, 1:수정주가반영
                }
            }
        );

        const chartArray = response.data.output2 || [];

        if (chartArray.length === 0) {
            console.log(`⚠️ 데이터 없음`);
            return [];
        }

        // 데이터 변환
        const allData = chartArray.map(item => ({
            date: formatDateString(item.stck_bsop_date),
            open: parseInt(item.stck_oprc) || 0,
            high: parseInt(item.stck_hgpr) || 0,
            low: parseInt(item.stck_lwpr) || 0,
            close: parseInt(item.stck_clpr) || 0,
            volume: parseInt(item.acml_vol) || 0
        }));

        console.log(`✅ 전체 ${allData.length}개 데이터 로딩 완료`);

        // 날짜순 정렬
        allData.sort((a, b) => new Date(a.date) - new Date(b.date));

        return allData;

    } catch (error) {
        console.error('❌ 전체 데이터 로딩 실패:', error.message);
        // 실패 시 빈 배열 반환
        return [];
    }
}

// 데이터베이스에서 차트 데이터 조회
async function getChartDataFromDB(stockCode, periodType) {
    try {
        const { data, error } = await supabase
            .from('stock_price_history')
            .select('*')
            .eq('stock_code', stockCode)
            .eq('period_type', periodType)
            .order('trade_date', { ascending: true });

        if (error) {
            console.error('❌ DB 조회 오류:', error);
            return null;
        }

        if (!data || data.length === 0) {
            return null;
        }

        // DB 데이터를 차트 형식으로 변환
        return data.map(item => ({
            date: item.trade_date,
            open: item.open_price,
            high: item.high_price,
            low: item.low_price,
            close: item.close_price,
            volume: item.volume
        }));
    } catch (error) {
        console.error('❌ DB 조회 중 오류:', error);
        return null;
    }
}

// 데이터베이스에 차트 데이터 저장
async function saveChartDataToDB(stockCode, periodType, chartData) {
    try {
        // 저장할 데이터 변환
        const dbData = chartData.map(item => ({
            stock_code: stockCode,
            period_type: periodType,
            trade_date: item.date,
            open_price: item.open,
            high_price: item.high,
            low_price: item.low,
            close_price: item.close,
            volume: item.volume
        }));

        // upsert로 중복 시 업데이트
        const { data, error } = await supabase
            .from('stock_price_history')
            .upsert(dbData, {
                onConflict: 'stock_code,period_type,trade_date',
                ignoreDuplicates: false
            });

        if (error) {
            console.error('❌ DB 저장 오류:', error);
            return false;
        }

        console.log(`✅ DB에 ${chartData.length}개 데이터 저장 완료`);
        return true;
    } catch (error) {
        console.error('❌ DB 저장 중 오류:', error);
        return false;
    }
}

// DB에서 가장 최근 날짜 조회
async function getLatestDateFromDB(stockCode, periodType) {
    try {
        const { data, error } = await supabase
            .from('stock_price_history')
            .select('trade_date')
            .eq('stock_code', stockCode)
            .eq('period_type', periodType)
            .order('trade_date', { ascending: false })
            .limit(1);

        if (error || !data || data.length === 0) {
            return null;
        }

        return new Date(data[0].trade_date);
    } catch (error) {
        console.error('❌ 최근 날짜 조회 오류:', error);
        return null;
    }
}

// 최근 데이터만 가져오기 (30일/30주/30개월)
async function fetchRecentData(stockCode, periodDivCode, token) {
    try {
        const response = await axios.get(
            `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-price`,
            {
                headers: {
                    'content-type': 'application/json; charset=utf-8',
                    'authorization': `Bearer ${token}`,
                    'appkey': KIS_APP_KEY,
                    'appsecret': KIS_APP_SECRET,
                    'tr_id': 'FHKST01010400',
                    'custtype': 'P'
                },
                params: {
                    FID_COND_MRKT_DIV_CODE: 'J',
                    FID_INPUT_ISCD: stockCode,
                    FID_PERIOD_DIV_CODE: periodDivCode,
                    FID_ORG_ADJ_PRC: '0'
                }
            }
        );

        const chartArray = response.data.output || [];
        if (chartArray.length === 0) {
            return [];
        }

        return chartArray.map(item => ({
            date: formatDateString(item.stck_bsop_date),
            open: parseInt(item.stck_oprc) || 0,
            high: parseInt(item.stck_hgpr) || 0,
            low: parseInt(item.stck_lwpr) || 0,
            close: parseInt(item.stck_clpr) || 0,
            volume: parseInt(item.acml_vol) || 0
        }));
    } catch (error) {
        console.error('❌ 최근 데이터 조회 오류:', error.message);
        return [];
    }
}

// 날짜 포맷팅 (YYYYMMDD)
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 날짜 문자열 포맷팅 (YYYYMMDD -> YYYY-MM-DD)
function formatDateString(dateStr) {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`;
}

// Date 객체를 YYYYMMDD 형식으로 변환
function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// 봉 차트 이름 가져오기
function getBongName(period) {
    const names = {
        'D': '일봉',
        'W': '주봉',
        'M': '월봉',
        'Y': '년봉'
    };
    return names[period] || '일봉';
}

module.exports = {
    getAccessToken,
    issueNewToken,
    getTokenStatus,
    getStockQuote,
    getStockChartData
};
