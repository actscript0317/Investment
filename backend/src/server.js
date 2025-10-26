const express = require('express');
const path = require('path');
const cors = require('cors');
const kisApiService = require('./services/kisApiService');
const kisApi = require('./services/kisApi');
require('dotenv').config();

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

// 주식 차트 데이터 조회
app.get('/api/stock/chart/:stockCode', async (req, res) => {
    try {
        const { stockCode } = req.params;
        const { period = 'D', loadAll } = req.query;
        const shouldLoadAll = loadAll === 'true';

        console.log(`📈 차트 데이터 조회: ${stockCode}, 기간: ${period}, 전체로드: ${shouldLoadAll}`);

        // 실제 한국투자증권 API 호출
        const chartData = await kisApiService.getStockChartData(stockCode, period, shouldLoadAll);

        console.log(`✅ 차트 데이터 조회 성공: ${chartData.length}개 데이터`);
        res.json(chartData);

    } catch (error) {
        console.error('❌ 차트 데이터 조회 실패:', error.message);

        // 토큰 에러인 경우 명확한 메시지 반환
        if (error.message && error.message.includes('토큰')) {
            return res.status(401).json({
                error: 'Token required',
                message: '토큰이 필요합니다. 먼저 토큰을 발급받아주세요.',
                needToken: true
            });
        }

        res.status(500).json({
            error: 'Failed to fetch stock chart',
            message: error.message || '차트 데이터를 불러오는데 실패했습니다.'
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

        // 한국 주요 종목 리스트 (실제로는 DB나 외부 API에서 가져와야 함)
        const allStocks = [
            { code: '005930', name: '삼성전자' },
            { code: '000660', name: 'SK하이닉스' },
            { code: '035420', name: 'NAVER' },
            { code: '035720', name: '카카오' },
            { code: '207940', name: '삼성바이오로직스' },
            { code: '373220', name: 'LG에너지솔루션' },
            { code: '005380', name: '현대차' },
            { code: '006400', name: '삼성SDI' },
            { code: '051910', name: 'LG화학' },
            { code: '005490', name: 'POSCO홀딩스' },
            { code: '068270', name: '셀트리온' },
            { code: '028260', name: '삼성물산' },
            { code: '012330', name: '현대모비스' },
            { code: '066570', name: 'LG전자' },
            { code: '096770', name: 'SK이노베이션' },
            { code: '003550', name: 'LG' },
            { code: '017670', name: 'SK텔레콤' },
            { code: '034020', name: '두산에너빌리티' },
            { code: '018260', name: '삼성에스디에스' },
            { code: '009150', name: '삼성전기' },
            { code: '032830', name: '삼성생명' },
            { code: '003670', name: '포스코퓨처엠' },
            { code: '011200', name: 'HMM' },
            { code: '086790', name: '하나금융지주' },
            { code: '105560', name: 'KB금융' },
            { code: '055550', name: '신한지주' },
            { code: '000270', name: '기아' },
            { code: '024110', name: '기업은행' },
            { code: '316140', name: '우리금융지주' },
            { code: '010130', name: '고려아연' },
            { code: '259960', name: '크래프톤' },
            { code: '036570', name: '엔씨소프트' },
            { code: '352820', name: '하이브' },
            { code: '251270', name: '넷마블' },
            { code: '326030', name: 'SK바이오팜' },
            { code: '302440', name: 'SK바이오사이언스' },
            { code: '328130', name: '루닛' },
            { code: '086520', name: '에코프로' },
            { code: '247540', name: '에코프로비엠' },
            { code: '091990', name: '셀트리온헬스케어' }
        ];

        // 종목 코드 또는 종목명으로 검색
        const results = allStocks.filter(stock =>
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
        const accountNumber = process.env.KIS_ACCOUNT_NUMBER;

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
        const accountNumber = process.env.KIS_ACCOUNT_NUMBER;
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

// Serve frontend HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public', 'index.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public', 'login.html'));
});

app.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public', 'account.html'));
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
