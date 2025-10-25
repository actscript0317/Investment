const express = require('express');
const path = require('path');
const cors = require('cors');
const kisApiService = require('./services/kisApiService');

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

        try {
            // 실제 한국투자증권 API 호출
            const stockData = await kisApiService.getStockQuote(stockCode);
            res.json(stockData);
        } catch (apiError) {
            console.error('API 호출 실패, 샘플 데이터 반환:', apiError.message);

            // API 실패 시 샘플 데이터 반환
            const stockData = {
                code: stockCode,
                name: getStockName(stockCode),
                currentPrice: Math.floor(Math.random() * 100000) + 50000,
                priceChange: Math.floor(Math.random() * 5000) - 2500,
                changeRate: parseFloat((Math.random() * 10 - 5).toFixed(2)),
                openPrice: Math.floor(Math.random() * 100000) + 50000,
                highPrice: Math.floor(Math.random() * 100000) + 50000,
                lowPrice: Math.floor(Math.random() * 100000) + 50000,
                volume: Math.floor(Math.random() * 10000000)
            };
            res.json(stockData);
        }
    } catch (error) {
        console.error('Stock quote error:', error);
        res.status(500).json({ error: 'Failed to fetch stock quote' });
    }
});

// 주식 차트 데이터 조회
app.get('/api/stock/chart/:stockCode', async (req, res) => {
    try {
        const { stockCode } = req.params;
        const { period, loadAll } = req.query;
        const shouldLoadAll = loadAll === 'true';

        try {
            // 실제 한국투자증권 API 호출
            const chartData = await kisApiService.getStockChartData(stockCode, period, shouldLoadAll);
            res.json(chartData);
        } catch (apiError) {
            console.error('API 호출 실패, 샘플 데이터 반환:', apiError.message);

            // API 실패 시 샘플 데이터 반환
            const chartData = generateChartData(period);
            res.json(chartData);
        }
    } catch (error) {
        console.error('Stock chart error:', error);
        res.status(500).json({ error: 'Failed to fetch stock chart' });
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

// 헬퍼 함수: 종목명 가져오기
function getStockName(code) {
    const stockNames = {
        '005930': '삼성전자',
        '000660': 'SK하이닉스',
        '035420': 'NAVER',
        '035720': '카카오',
        '207940': '삼성바이오로직스',
        '373220': 'LG에너지솔루션'
    };
    return stockNames[code] || '알 수 없는 종목';
}

// 헬퍼 함수: 차트 데이터 생성 (폴백용)
function generateChartData(period) {
    const data = [];
    let count = 30; // 기본 30개 데이터

    // 봉 차트 타입별 데이터 개수
    switch (period) {
        case 'D':
            count = 30; // 일봉: 최근 30거래일
            break;
        case 'W':
            count = 30; // 주봉: 최근 30주
            break;
        case 'M':
            count = 30; // 월봉: 최근 30개월
            break;
        case 'Y':
            count = 30; // 년봉: 최근 30개월 (월봉 데이터 사용)
            break;
        default:
            count = 30;
    }

    const basePrice = 70000;
    for (let i = count - 1; i >= 0; i--) {
        const date = new Date();

        // 봉 타입에 따라 날짜 계산
        switch (period) {
            case 'D':
                date.setDate(date.getDate() - i);
                break;
            case 'W':
                date.setDate(date.getDate() - (i * 7));
                break;
            case 'M':
            case 'Y':
                date.setMonth(date.getMonth() - i);
                break;
        }

        const variation = (Math.random() - 0.5) * 5000;
        const price = basePrice + variation + (Math.random() * 2000);

        data.push({
            date: date.toISOString().split('T')[0],
            open: Math.floor(price + Math.random() * 1000),
            high: Math.floor(price + Math.random() * 2000),
            low: Math.floor(price - Math.random() * 2000),
            close: Math.floor(price),
            volume: Math.floor(Math.random() * 10000000)
        });
    }

    return data;
}

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
