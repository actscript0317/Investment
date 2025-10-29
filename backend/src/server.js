const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const kisApiService = require('./services/kisApiService');
const kisApi = require('./services/kisApi');
require('dotenv').config();

// Load stock list from file
let stockList = [];
try {
    const stockData = fs.readFileSync(path.join(__dirname, 'data', 'stocks.json'), 'utf8');
    stockList = JSON.parse(stockData);
    console.log(`✅ ${stockList.length}개 종목 로드 완료`);
} catch (error) {
    console.error('❌ 종목 리스트 로드 실패:', error.message);
    // Fallback to basic list
    stockList = [
        { code: '005930', name: '삼성전자' },
        { code: '000660', name: 'SK하이닉스' },
        { code: '035420', name: 'NAVER' }
    ];
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// 한국투자증권 API Routes
// 주식 시세 조회
app.get('/api/stock/quote/:stockCode', async (req, res) => {
    try {
        const { stockCode } = req.params;

        console.log(`📊 주식 시세 조회: ${stockCode}`);

        // 실제 한국투자증권 API 호출
        const stockData = await kisApiService.getStockQuote(stockCode);

        console.log(`✅ 주식 시세 조회 성공: ${stockData.name}`);
        res.json(stockData);

    } catch (error) {
        console.error('❌ 주식 시세 조회 실패:', error.message);

        // 토큰 에러인 경우 명확한 메시지 반환
        if (error.message && error.message.includes('토큰')) {
            return res.status(401).json({
                error: 'Token required',
                message: '토큰이 필요합니다. 먼저 토큰을 발급받아주세요.',
                needToken: true
            });
        }

        res.status(500).json({
            error: 'Failed to fetch stock quote',
            message: error.message || '주식 시세를 불러오는데 실패했습니다.'
        });
    }
});

// 토큰 상태 확인 API
app.get('/api/token/status', (req, res) => {
    try {
        const status = kisApiService.getTokenStatus();
        res.json(status);
    } catch (error) {
        console.error('❌ 토큰 상태 확인 실패:', error);
        res.status(500).json({ error: 'Failed to check token status' });
    }
});

// 토큰 수동 발급 API
app.post('/api/token/issue', async (req, res) => {
    try {
        console.log('🔄 토큰 수동 발급 요청...');
        const result = await kisApiService.issueNewToken();
        res.json(result);
    } catch (error) {
        console.error('❌ 토큰 발급 실패:', error.message);
        res.status(500).json({
            error: 'Failed to issue token',
            message: error.message
        });
    }
});

// 종목 검색 API
app.get('/api/stock/search', async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim().length === 0) {
            return res.json([]);
        }

        const searchTerm = query.trim().toLowerCase();

        // 종목 코드 또는 종목명으로 검색
        const results = stockList.filter(stock =>
            stock.code.includes(searchTerm) ||
            stock.name.toLowerCase().includes(searchTerm) ||
            stock.name.includes(query.trim())
        ).slice(0, 10); // 최대 10개 결과만 반환

        res.json(results);
    } catch (error) {
        console.error('Stock search error:', error);
        res.status(500).json({ error: 'Failed to search stocks' });
    }
});

// 계좌 잔고 조회 API
app.get('/api/account/balance', async (req, res) => {
    try {
        // 게스트 모드인 경우 query parameter로 전달된 계좌번호 사용
        const accountNumber = req.query.accountNumber || process.env.KIS_ACCOUNT_NUMBER;

        if (!accountNumber) {
            console.error('❌ KIS_ACCOUNT_NUMBER가 설정되지 않았습니다.');
            return res.status(400).json({
                error: 'Account number not configured',
                message: '계좌번호가 설정되지 않았습니다. backend/.env 파일에 KIS_ACCOUNT_NUMBER를 설정해주세요.'
            });
        }

        console.log('✅ 계좌 잔고 조회 요청:', accountNumber);
        const balanceData = await kisApi.getAccountBalance(accountNumber);
        console.log('✅ 계좌 잔고 조회 성공');
        res.json(balanceData);
    } catch (error) {
        console.error('❌ 계좌 잔고 조회 실패:', error.message);
        console.error('상세 에러:', error.response?.data || error);
        res.status(500).json({
            error: 'Failed to fetch account balance',
            message: error.message,
            details: error.response?.data?.msg || '한국투자증권 API 호출 실패'
        });
    }
});

// 거래내역 조회 API
app.get('/api/account/transactions', async (req, res) => {
    try {
        // 게스트 모드인 경우 query parameter로 전달된 계좌번호 사용
        const accountNumber = req.query.accountNumber || process.env.KIS_ACCOUNT_NUMBER;
        const { startDate, endDate } = req.query;

        if (!accountNumber) {
            console.error('❌ KIS_ACCOUNT_NUMBER가 설정되지 않았습니다.');
            return res.status(400).json({
                error: 'Account number not configured',
                message: '계좌번호가 설정되지 않았습니다. backend/.env 파일에 KIS_ACCOUNT_NUMBER를 설정해주세요.'
            });
        }

        // 기본값: 최근 30일
        const end = endDate || new Date().toISOString().split('T')[0].replace(/-/g, '');
        const start = startDate || (() => {
            const date = new Date();
            date.setDate(date.getDate() - 30);
            return date.toISOString().split('T')[0].replace(/-/g, '');
        })();

        console.log(`✅ 거래내역 조회 요청: ${start} ~ ${end}`);
        const transactionData = await kisApi.getTransactionHistory(accountNumber, start, end);
        console.log('✅ 거래내역 조회 성공');

        // 데이터 샘플 로그 (디버깅용)
        if (transactionData.output1 && transactionData.output1.length > 0) {
            console.log('거래내역 샘플:', JSON.stringify(transactionData.output1[0], null, 2));
            console.log(`총 ${transactionData.output1.length}건의 거래내역`);
        }

        res.json(transactionData);
    } catch (error) {
        console.error('❌ 거래내역 조회 실패:', error.message);
        console.error('상세 에러:', error.response?.data || error);
        res.status(500).json({
            error: 'Failed to fetch transaction history',
            message: error.message,
            details: error.response?.data?.msg || '한국투자증권 API 호출 실패'
        });
    }
});

// 매수가능금액 조회 API
app.get('/api/account/buying-power', async (req, res) => {
    try {
        const accountNumber = process.env.KIS_ACCOUNT_NUMBER;
        const { stockCode, price } = req.query;

        if (!accountNumber) {
            return res.status(400).json({
                error: 'Account number not configured',
                message: '계좌번호가 설정되지 않았습니다. .env 파일에 KIS_ACCOUNT_NUMBER를 설정해주세요.'
            });
        }

        if (!stockCode || !price) {
            return res.status(400).json({
                error: 'Missing parameters',
                message: '종목코드와 가격을 입력해주세요.'
            });
        }

        const buyingPowerData = await kisApi.getBuyingPower(accountNumber, stockCode, parseInt(price));
        res.json(buyingPowerData);
    } catch (error) {
        console.error('Buying power error:', error);
        res.status(500).json({
            error: 'Failed to fetch buying power',
            message: error.message
        });
    }
});

// 주식 차트 데이터 조회 API
app.get('/api/stock/chart/:stockCode', async (req, res) => {
    try {
        const { stockCode } = req.params;
        const { period, loadAll } = req.query;

        console.log(`📊 차트 데이터 조회: ${stockCode}, 기간: ${period}, 전체로드: ${loadAll}`);

        // loadAll이 'true'로 전달되면 전체 데이터 로드
        const shouldLoadAll = loadAll === 'true';
        const chartData = await kisApiService.getStockChartData(stockCode, period || 'D', shouldLoadAll);

        console.log(`✅ 차트 데이터 조회 성공: ${chartData.length}개`);

        // output2 형식으로 래핑하여 반환 (프론트엔드 호환성)
        res.json({
            output2: chartData.map(item => ({
                stck_bsop_date: item.date.replace(/-/g, ''), // YYYY-MM-DD -> YYYYMMDD
                stck_oprc: item.open.toString(),
                stck_hgpr: item.high.toString(),
                stck_lwpr: item.low.toString(),
                stck_clpr: item.close.toString(),
                acml_vol: item.volume.toString()
            }))
        });
    } catch (error) {
        console.error('❌ 차트 데이터 조회 실패:', error.message);
        console.error('전체 오류:', error);
        res.status(500).json({
            error: 'Failed to fetch chart data',
            message: error.message
        });
    }
});

// Serve frontend HTML files
// Note: Root path (/) automatically serves index.html via express.static

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public', 'login.html'));
});

app.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public', 'account.html'));
});

app.get('/chart', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public', 'chart.html'));
});

app.get('/history', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public', 'history.html'));
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// 서버 종료 처리
process.on('SIGINT', () => {
    console.log('\n서버 종료 중...');
    server.close(() => {
        console.log('서버가 종료되었습니다.');
        process.exit(0);
    });
});

module.exports = app;
