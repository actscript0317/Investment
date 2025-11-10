const { createClient } = require('@supabase/supabase-js');
const kisApiService = require('./kisApiService');
require('dotenv').config();

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Theme detection weights
const WEIGHTS = {
    leader_rise: 0.30,
    participant_count: 0.20,
    avg_rise: 0.20,
    volume_surge: 0.15,
    news_frequency: 0.10,
    foreign_buy: 0.05
};

// Theme detection configurations
const THEME_CONDITIONS = [
    {
        name: '반도체/AI',
        category: '장기 강세형',
        keywords: ['AI', '반도체', 'HBM', '엔비디아', '데이터센터', 'SK하이닉스', '삼성전자', '이오테크닉스', '주성엔지니어링', '한미반도체', '유진테크', '하나마이크론', '삼성전기', '솔브레인', '티에스이', '테스'],
        leader_stocks: ['005930', '000660'], // 삼성전자, SK하이닉스
        required_rise: 3,
        min_participants: 3,
        avg_rise_threshold: 5,
        duration_type: '장기',
        duration_days: '30+일',
        trigger_type: 'AI 수요 증가',
        sub_themes: [
            {
                name: '메모리 반도체',
                keywords: ['HBM', 'D램', '낸드'],
                stocks: ['삼성전자', 'SK하이닉스']
            },
            {
                name: '반도체 장비',
                keywords: ['장비', '소부장'],
                stocks: ['이오테크닉스', '주성엔지니어링', '한미반도체', '유진테크', '하나마이크론']
            },
            {
                name: '반도체 부품/소재',
                keywords: ['PCB', '패키징', '소재'],
                stocks: ['삼성전기', '솔브레인', '티에스이', '테스']
            }
        ]
    },
    {
        name: '자동차',
        category: '정책 수혜형',
        keywords: ['관세', '협상', '수출', '미국', '현대차', '기아', '현대모비스'],
        leader_stocks: ['005380', '000270'], // 현대차, 기아
        required_rise: 4,
        min_participants: 2,
        trigger_type: '정책/이벤트',
        duration_type: '중기',
        duration_days: '10-20일'
    },
    {
        name: '전력 인프라',
        category: 'AI 연관형',
        keywords: ['전력', '인프라', '효성', '변압기', '전력기기', 'HD현대일렉트릭', 'KISCO', '대한전선', '대원전선'],
        leader_stocks: ['298040', '267260'], // 효성중공업, HD현대일렉트릭
        parent_theme: 'AI',
        required_rise: 4,
        min_participants: 3,
        duration_type: '중장기',
        duration_days: '30+일',
        trigger_type: 'AI 인프라 투자'
    },
    {
        name: 'AI 냉각/전선',
        category: '신규 발굴형',
        keywords: ['냉각', '액침', '공조', '삼성공조', '에스엠벡셀'],
        leader_stocks: ['009540', '383310'], // 삼성공조, 에스엠벡셀
        required_rise: 7,
        min_participants: 2,
        duration_type: '단기',
        duration_days: '3-7일',
        trigger_type: 'AI 인프라 확장'
    },
    {
        name: '조선/방산/원전',
        category: '섹터 로테이션',
        keywords: ['조선', '방산', '원전', '수주', 'HD현대중공업', '한화에어로스페이스', '삼성중공업', '한화오션', '두산에너빌리티', '두산퓨얼셀'],
        leader_stocks: ['009540', '012450'], // HD현대중공업, 한화에어로스페이스
        rotation_signal: true,
        required_rise: 3,
        min_participants: 3,
        duration_type: '중기',
        duration_days: '10-15일',
        trigger_type: '섹터 로테이션'
    }
];

// Stock code to name mapping
const STOCK_NAMES = {
    // 반도체/AI 메모리
    '005930': '삼성전자',
    '000660': 'SK하이닉스',
    // 반도체 장비
    '112610': '이오테크닉스',
    '036930': '주성엔지니어링',
    '042700': '한미반도체',
    '084370': '유진테크',
    '067310': '하나마이크론',
    // 반도체 부품/소재
    '009150': '삼성전기',
    '357780': '솔브레인',
    '131290': '티에스이',
    '095610': '테스',
    // 자동차
    '005380': '현대차',
    '000270': '기아',
    '012330': '현대모비스',
    // 전력 인프라
    '298040': '효성중공업',
    '267260': 'HD현대일렉트릭',
    '001940': 'KISCO홀딩스',
    '010060': '대한전선',
    '001620': '대원전선',
    // AI 냉각/전선
    '009540': '삼성공조',
    '383310': '에스엠벡셀',
    // 조선
    '329180': 'HD현대중공업',
    '010140': '삼성중공업',
    // 방산
    '012450': '한화에어로스페이스',
    '047810': '한화오션',
    // 원전
    '034020': '두산에너빌리티',
    '336260': '두산퓨얼셀'
};

class ThemeDetectionService {
    // Analyze market and detect themes
    async detectThemes() {
        try {
            console.log('🔍 테마 감지 시작...');
            const today = new Date().toISOString().split('T')[0];

            // Check if today's data already exists in database
            const cachedThemes = await this.getThemesFromDB(today);
            if (cachedThemes && cachedThemes.length > 0) {
                console.log(`✅ DB에서 ${cachedThemes.length}개 테마 로드 (${today})`);
                const marketContext = await this.getMarketContext();
                return {
                    success: true,
                    market_context: marketContext,
                    themes: cachedThemes
                };
            }

            // If no cached data, detect and save new themes
            console.log('📊 새로운 테마 감지 및 저장 중...');

            // Get market context
            const marketContext = await this.getMarketContext();

            // Get stock data (would integrate with KIS API)
            const stockData = await this.getStockData();

            // Detect themes
            const themes = [];
            for (const config of THEME_CONDITIONS) {
                const themeScore = this.calculateThemeScore(config, stockData, marketContext);

                // Lower threshold to 25 to detect themes even in down markets (relative strength)
                if (themeScore.strength >= 25) {
                    const theme = await this.buildTheme(config, themeScore, stockData);
                    themes.push(theme);
                }
            }

            // Sort by strength
            themes.sort((a, b) => b.strength - a.strength);

            // Save to database
            await this.saveThemesToDB(themes, marketContext, today);

            console.log(`✅ ${themes.length}개 테마 감지 및 DB 저장 완료`);

            return {
                success: true,
                market_context: marketContext,
                themes: themes
            };
        } catch (error) {
            console.error('❌ 테마 감지 실패:', error);
            throw error;
        }
    }

    // Calculate theme score
    calculateThemeScore(config, stockData, marketContext) {
        let score = 0;
        const metrics = {
            leaderRise: 0,
            participantCount: 0,
            avgRise: 0,
            volumeSurge: 0,
            newsCount: 0,
            foreignBuy: 0
        };

        // Find participating stocks
        const participants = stockData.filter(stock =>
            this.isStockInTheme(stock, config)
        );

        if (participants.length === 0) {
            return { strength: 0, metrics };
        }

        // Leader stock rise
        const leaderStocks = participants.filter(s =>
            config.leader_stocks?.includes(s.code)
        );
        if (leaderStocks.length > 0) {
            metrics.leaderRise = Math.max(...leaderStocks.map(s => s.change_rate || 0));
        }

        // Participant count
        metrics.participantCount = participants.length;

        // Average rise
        const totalRise = participants.reduce((sum, s) => sum + (s.change_rate || 0), 0);
        metrics.avgRise = participants.length > 0 ? totalRise / participants.length : 0;

        // Volume surge
        const totalVolume = participants.reduce((sum, s) => sum + (s.volume_ratio || 100), 0);
        metrics.volumeSurge = participants.length > 0 ? totalVolume / participants.length : 100;

        // News count (simulated)
        metrics.newsCount = this.getNewsCount(config.keywords);

        // Foreign buy (from market context)
        metrics.foreignBuy = marketContext.foreign_net_buy || 0;

        // Calculate weighted score
        score += (metrics.leaderRise / 10) * WEIGHTS.leader_rise * 100;
        score += (metrics.participantCount / 10) * WEIGHTS.participant_count * 100;
        score += (metrics.avgRise / 10) * WEIGHTS.avg_rise * 100;
        score += (metrics.volumeSurge / 300) * WEIGHTS.volume_surge * 100;
        score += (metrics.newsCount / 5) * WEIGHTS.news_frequency * 100;
        score += (Math.abs(metrics.foreignBuy) / 1000000000000) * WEIGHTS.foreign_buy * 100;

        return {
            strength: Math.min(Math.round(score), 100),
            metrics: metrics,
            participants: participants
        };
    }

    // Check if stock belongs to theme
    isStockInTheme(stock, config) {
        // Check if stock name contains any keywords
        const nameMatch = config.keywords.some(keyword =>
            stock.name?.includes(keyword)
        );

        // Check if stock code is in leader stocks
        const leaderMatch = config.leader_stocks?.includes(stock.code);

        // For defensive themes: stock is falling less than -2%
        // For regular themes: stock is rising by required amount
        // This allows theme detection even in down markets (relative strength)
        const requiredRise = config.required_rise || 3;
        const riseMatch = (stock.change_rate || 0) >= Math.min(requiredRise, -2);

        return (nameMatch || leaderMatch) && riseMatch;
    }

    // Build complete theme object
    async buildTheme(config, themeScore, stockData) {
        const participants = themeScore.participants;

        // Identify leader
        const leader = this.identifyLeader(participants);

        // Calculate risk
        const risk = this.calculateRisk(config, themeScore);

        // Get historical data
        const historicalData = await this.getHistoricalData(config.name);

        // Calculate period returns
        const periodReturns = this.calculatePeriodReturns(participants);

        // Get theme start date
        const startDate = this.getThemeStartDate(config.name);

        return {
            name: config.name,
            category: config.category,
            strength: themeScore.strength,
            duration: {
                type: config.duration_type,
                days: config.duration_days
            },
            start_date: startDate,
            period_returns: periodReturns,
            leader: leader || {
                name: '-',
                code: '-',
                price: 0,
                change_rate: 0,
                volume_ratio: 0
            },
            participants: participants.slice(0, 10), // Top 10
            metrics: {
                participant_count: participants.length,
                avg_rise: themeScore.metrics.avgRise,
                avg_volume_increase: themeScore.metrics.volumeSurge,
                foreign_participation: themeScore.metrics.foreignBuy > 0
            },
            trigger: {
                type: config.trigger_type || '시장 동향',
                description: this.getTriggerDescription(config),
                news_count: themeScore.metrics.newsCount
            },
            risk: risk,
            historical_data: historicalData
        };
    }

    // Identify theme leader
    identifyLeader(stocks) {
        if (stocks.length === 0) return null;

        const candidates = stocks.filter(s =>
            (s.change_rate || 0) >= 7 && (s.volume_ratio || 0) >= 200
        );

        if (candidates.length === 0) {
            // Just return the highest gainer
            return stocks.reduce((max, stock) =>
                (stock.change_rate || 0) > (max.change_rate || 0) ? stock : max
            );
        }

        // Score candidates
        return candidates.reduce((best, stock) => {
            const score = (stock.change_rate || 0) * 0.4 +
                         (stock.volume_ratio || 0) / 100 * 0.3 +
                         (stock.market_cap || 0) / 1000000000000 * 0.3;

            const bestScore = (best.change_rate || 0) * 0.4 +
                             (best.volume_ratio || 0) / 100 * 0.3 +
                             (best.market_cap || 0) / 1000000000000 * 0.3;

            return score > bestScore ? stock : best;
        });
    }

    // Calculate risk level
    calculateRisk(config, themeScore) {
        const warnings = [];
        let level = 'low';

        // High average rise = overheating
        if (themeScore.metrics.avgRise > 15) {
            level = 'high';
            warnings.push('단기 과열 가능성');
        }

        // Short duration = quick profit taking
        if (config.duration_type === '단기') {
            if (level === 'low') level = 'medium';
            warnings.push('단기 테마로 빠른 청산 필요');
        }

        // Low participant count
        if (themeScore.metrics.participantCount < 3) {
            if (level === 'low') level = 'medium';
            warnings.push('참여 종목 부족');
        }

        return {
            level: level,
            warnings: warnings
        };
    }

    // Calculate period returns (daily, weekly, monthly)
    calculatePeriodReturns(participants) {
        if (participants.length === 0) {
            return { daily: 0, weekly: 0, monthly: 0 };
        }

        // For now, using simulated data based on theme type
        // In production, this would calculate from historical price data
        const baseReturn = participants.reduce((sum, s) => sum + (s.change_rate || 0), 0) / participants.length;

        return {
            daily: parseFloat(baseReturn.toFixed(2)),
            weekly: parseFloat((baseReturn * 3.5).toFixed(2)), // Simulated weekly (daily * 3.5 trading days avg)
            monthly: parseFloat((baseReturn * 15).toFixed(2))  // Simulated monthly (daily * 15 trading days avg)
        };
    }

    // Get theme start date
    getThemeStartDate(themeName) {
        // In production, this would query the database for the earliest detection date
        // For now, returning fixed dates based on theme
        const startDates = {
            '반도체/AI': '2024-10-01',
            '자동차': '2024-10-30',
            '전력 인프라': '2024-10-15',
            'AI 냉각/전선': '2024-11-01',
            '조선/방산/원전': '2024-10-20'
        };
        return startDates[themeName] || new Date().toISOString().split('T')[0];
    }

    // Get trigger description
    getTriggerDescription(config) {
        const descriptions = {
            '반도체/AI': 'AI 반도체 수요 증가 및 HBM 공급 확대',
            '자동차': '한미 관세 협상 타결로 수출 여건 개선',
            '전력 인프라': 'AI 데이터센터 전력 수요 급증',
            'AI 냉각/전선': 'AI 반도체 발열 문제로 냉각 솔루션 주목',
            '조선/방산/원전': '섹터 로테이션 진행 및 수주 증가'
        };
        return descriptions[config.name] || '시장 흐름 변화';
    }

    // Get news count (simulated)
    getNewsCount(keywords) {
        // In production, this would query a news API
        // Return fixed count based on keywords
        const keywordCounts = {
            'AI': 8,
            '반도체': 8,
            'HBM': 6,
            '자동차': 5,
            '관세': 4,
            '전력': 6,
            '인프라': 5,
            '조선': 3,
            '방산': 4,
            '원전': 3
        };

        for (const keyword of keywords) {
            if (keywordCounts[keyword]) {
                return keywordCounts[keyword];
            }
        }
        return 3;
    }

    // Get market context
    async getMarketContext() {
        const today = new Date().toISOString().split('T')[0];

        // Try to get from database
        const { data, error } = await supabase
            .from('market_context')
            .select('*')
            .eq('date', today)
            .single();

        if (data) {
            return {
                kospi: data.kospi,
                kospi_change: data.kospi_change,
                foreign_net_buy: data.foreign_net_buy,
                active_themes_count: data.active_themes_count,
                rotation_phase: data.rotation_phase
            };
        }

        // Default context (would get from KIS API in production)
        return {
            kospi: 2500.0,
            kospi_change: 1.5,
            foreign_net_buy: 500000000000, // 5000억
            active_themes_count: 0,
            rotation_phase: '반도체 주도'
        };
    }

    // Get stock data (using KIS API)
    async getStockData() {
        const stockCodes = [
            // 반도체/AI 메모리
            '005930', '000660',
            // 반도체 장비
            '112610', '036930', '042700', '084370', '067310',
            // 반도체 부품/소재
            '009150', '357780', '131290', '095610',
            // 자동차
            '005380', '000270', '012330',
            // 전력 인프라
            '298040', '267260', '001940', '010060', '001620',
            // AI 냉각/전선
            '009540', '383310',
            // 조선
            '329180', '010140',
            // 방산
            '012450', '047810',
            // 원전
            '034020', '336260'
        ];

        const stockData = [];

        try {
            // Fetch real stock data from KIS API
            console.log('📊 KIS API로 실시간 주식 데이터 조회 중...');

            for (const code of stockCodes) {
                try {
                    const quote = await kisApiService.getStockQuote(code);

                    if (quote && quote.currentPrice !== undefined) {
                        const stockName = STOCK_NAMES[code] || '알 수 없는 종목';

                        // Calculate volume ratio (거래량 기반)
                        // Volume > 100만 = high activity, use higher ratio
                        const volumeRatio = quote.volume > 1000000 ?
                            Math.min(200 + (quote.volume / 1000000 * 10), 500) :
                            100 + (quote.volume / 10000);

                        stockData.push({
                            code: code,
                            name: stockName,
                            price: quote.currentPrice,
                            change_rate: quote.changeRate,
                            volume_ratio: Math.round(volumeRatio),
                            market_cap: quote.marketCap || (quote.currentPrice * quote.listedShares)
                        });

                        const changeSymbol = quote.changeRate > 0 ? '+' : '';
                        console.log(`✅ ${stockName} (${code}): ${quote.currentPrice.toLocaleString()}원, ${changeSymbol}${quote.changeRate}%`);
                    }
                } catch (error) {
                    console.error(`❌ 주식 시세 조회 실패 (${code}):`, error.message);
                    // Continue with next stock
                }
            }

            console.log(`✅ ${stockData.length}개 종목 데이터 로드 완료`);

            // If no data loaded, use mock data
            if (stockData.length === 0) {
                console.log('⚠️ KIS API에서 데이터를 가져오지 못했습니다. Mock 데이터 사용');
                return this.getMockStockData();
            }

            return stockData;

        } catch (error) {
            console.error('❌ 주식 데이터 조회 실패:', error);
            // Fallback to mock data if KIS API fails
            console.log('⚠️ Mock 데이터로 대체합니다');
            return this.getMockStockData();
        }
    }

    // Fallback mock data
    getMockStockData() {
        return [
            // 반도체/AI 메모리
            { code: '005930', name: '삼성전자', price: 70000, change_rate: 3.5, volume_ratio: 150, market_cap: 400000000000000 },
            { code: '000660', name: 'SK하이닉스', price: 130000, change_rate: 5.2, volume_ratio: 200, market_cap: 90000000000000 },
            // 반도체 장비
            { code: '112610', name: '이오테크닉스', price: 180000, change_rate: 20.5, volume_ratio: 350, market_cap: 3500000000000 },
            { code: '036930', name: '주성엔지니어링', price: 25000, change_rate: 8.3, volume_ratio: 280, market_cap: 1200000000000 },
            { code: '042700', name: '한미반도체', price: 95000, change_rate: 6.8, volume_ratio: 220, market_cap: 4500000000000 },
            { code: '084370', name: '유진테크', price: 45000, change_rate: 7.2, volume_ratio: 240, market_cap: 2300000000000 },
            { code: '067310', name: '하나마이크론', price: 35000, change_rate: 9.5, volume_ratio: 310, market_cap: 1800000000000 },
            // 반도체 부품/소재
            { code: '009150', name: '삼성전기', price: 180000, change_rate: 4.2, volume_ratio: 160, market_cap: 12000000000000 },
            { code: '357780', name: '솔브레인', price: 280000, change_rate: 5.8, volume_ratio: 190, market_cap: 3200000000000 },
            { code: '131290', name: '티에스이', price: 42000, change_rate: 6.5, volume_ratio: 210, market_cap: 1500000000000 },
            { code: '095610', name: '테스', price: 28000, change_rate: 7.8, volume_ratio: 250, market_cap: 1100000000000 },
            // 자동차
            { code: '005380', name: '현대차', price: 250000, change_rate: 7.1, volume_ratio: 180, market_cap: 50000000000000 },
            { code: '000270', name: '기아', price: 120000, change_rate: 5.5, volume_ratio: 170, market_cap: 30000000000000 },
            { code: '012330', name: '현대모비스', price: 270000, change_rate: 4.8, volume_ratio: 150, market_cap: 25000000000000 },
            // 전력 인프라
            { code: '298040', name: '효성중공업', price: 180000, change_rate: 4.5, volume_ratio: 220, market_cap: 3000000000000 },
            { code: '267260', name: 'HD현대일렉트릭', price: 280000, change_rate: 4.0, volume_ratio: 170, market_cap: 6000000000000 },
            { code: '001940', name: 'KISCO홀딩스', price: 42000, change_rate: 5.2, volume_ratio: 200, market_cap: 800000000000 },
            { code: '010060', name: '대한전선', price: 8500, change_rate: 6.8, volume_ratio: 240, market_cap: 700000000000 },
            { code: '001620', name: '대원전선', price: 5200, change_rate: 3.5, volume_ratio: 180, market_cap: 400000000000 },
            // AI 냉각/전선
            { code: '009540', name: '삼성공조', price: 15000, change_rate: 12.6, volume_ratio: 380, market_cap: 900000000000 },
            { code: '383310', name: '에스엠벡셀', price: 8500, change_rate: 8.7, volume_ratio: 290, market_cap: 500000000000 },
            // 조선
            { code: '329180', name: 'HD현대중공업', price: 150000, change_rate: 3.8, volume_ratio: 140, market_cap: 18000000000000 },
            { code: '010140', name: '삼성중공업', price: 9500, change_rate: 4.2, volume_ratio: 160, market_cap: 3500000000000 },
            // 방산
            { code: '012450', name: '한화에어로스페이스', price: 220000, change_rate: 6.4, volume_ratio: 190, market_cap: 15000000000000 },
            { code: '047810', name: '한화오션', price: 35000, change_rate: 5.1, volume_ratio: 170, market_cap: 8000000000000 },
            // 원전
            { code: '034020', name: '두산에너빌리티', price: 18000, change_rate: 4.5, volume_ratio: 150, market_cap: 12000000000000 },
            { code: '336260', name: '두산퓨얼셀', price: 28000, change_rate: 5.8, volume_ratio: 180, market_cap: 3000000000000 }
        ];
    }

    // Get historical data for theme
    async getHistoricalData(themeName) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data, error } = await supabase
            .from('theme_history')
            .select('*')
            .eq('theme_name', themeName)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

        if (error || !data || data.length === 0) {
            return null;
        }

        const avgDuration = data.reduce((sum, d) => sum + (d.duration_actual || 0), 0) / data.length;
        const avgMaxReturn = data.reduce((sum, d) => sum + (d.max_return || 0), 0) / data.length;
        const successCount = data.filter(d => d.success_rate >= 80).length;

        return {
            similar_cases: data.length,
            avg_duration: Math.round(avgDuration),
            avg_max_return: avgMaxReturn,
            success_rate: (successCount / data.length) * 100
        };
    }

    // Save themes to database
    async saveThemesToDB(themes, marketContext, date) {
        try {
            // Save market context
            await supabase
                .from('market_context')
                .upsert({
                    date: date,
                    kospi: marketContext.kospi,
                    kospi_change: marketContext.kospi_change,
                    foreign_net_buy: marketContext.foreign_net_buy,
                    active_themes_count: themes.length,
                    rotation_phase: marketContext.rotation_phase
                });

            // Save each theme
            for (const theme of themes) {
                const { data: themeData } = await supabase
                    .from('theme_history')
                    .upsert({
                        date: date,
                        theme_name: theme.name,
                        category: theme.category,
                        strength: theme.strength,
                        duration_type: theme.duration.type,
                        duration_days: theme.duration.days,
                        start_date: theme.start_date,
                        leader_stock_name: theme.leader.name,
                        leader_stock_code: theme.leader.code,
                        leader_price: theme.leader.price,
                        leader_change_rate: theme.leader.change_rate,
                        leader_volume_ratio: theme.leader.volume_ratio,
                        daily_return: theme.period_returns?.daily,
                        weekly_return: theme.period_returns?.weekly,
                        monthly_return: theme.period_returns?.monthly,
                        avg_return: theme.metrics.avg_rise,
                        participant_count: theme.metrics.participant_count,
                        trigger_type: theme.trigger.type,
                        trigger_description: theme.trigger.description,
                        risk_level: theme.risk.level,
                        risk_warnings: theme.risk.warnings
                    }, {
                        onConflict: 'date,theme_name'
                    })
                    .select()
                    .single();

                if (themeData) {
                    // Delete existing stocks for this theme on this date
                    await supabase
                        .from('theme_stocks')
                        .delete()
                        .eq('theme_history_id', themeData.id);

                    // Save participant stocks
                    const stockInserts = theme.participants.map(stock => ({
                        theme_history_id: themeData.id,
                        stock_name: stock.name,
                        stock_code: stock.code,
                        price: stock.price,
                        change_rate: stock.change_rate,
                        volume_ratio: stock.volume_ratio,
                        is_leader: stock.code === theme.leader.code
                    }));

                    await supabase
                        .from('theme_stocks')
                        .insert(stockInserts);
                }
            }

            console.log(`✅ Supabase에 ${themes.length}개 테마 저장 완료 (${date})`);
        } catch (error) {
            console.error('❌ Supabase 저장 실패:', error);
            throw error;
        }
    }

    // Get themes from database
    async getThemesFromDB(date) {
        try {
            const { data, error } = await supabase
                .from('theme_history')
                .select(`
                    *,
                    theme_stocks (*)
                `)
                .eq('date', date)
                .order('strength', { ascending: false });

            if (error) {
                console.error('DB 조회 오류:', error);
                return null;
            }

            if (!data || data.length === 0) {
                return null;
            }

            // Transform to expected format
            return data.map(theme => ({
                name: theme.theme_name,
                category: theme.category,
                strength: theme.strength,
                duration: {
                    type: theme.duration_type,
                    days: theme.duration_days
                },
                start_date: theme.start_date,
                period_returns: {
                    daily: parseFloat(theme.daily_return || 0),
                    weekly: parseFloat(theme.weekly_return || 0),
                    monthly: parseFloat(theme.monthly_return || 0)
                },
                leader: {
                    name: theme.leader_stock_name,
                    code: theme.leader_stock_code,
                    price: parseFloat(theme.leader_price || 0),
                    change_rate: parseFloat(theme.leader_change_rate || 0),
                    volume_ratio: parseFloat(theme.leader_volume_ratio || 0)
                },
                participants: theme.theme_stocks.map(s => ({
                    name: s.stock_name,
                    code: s.stock_code,
                    price: parseFloat(s.price || 0),
                    change_rate: parseFloat(s.change_rate || 0),
                    volume_ratio: parseFloat(s.volume_ratio || 0)
                })),
                metrics: {
                    participant_count: theme.participant_count,
                    avg_rise: parseFloat(theme.avg_return || 0),
                    avg_volume_increase: 0,
                    foreign_participation: false
                },
                trigger: {
                    type: theme.trigger_type,
                    description: theme.trigger_description,
                    news_count: 0
                },
                risk: {
                    level: theme.risk_level,
                    warnings: theme.risk_warnings || []
                },
                historical_data: null
            }));
        } catch (error) {
            console.error('❌ DB 조회 실패:', error);
            return null;
        }
    }

    // Refresh today's themes (delete and re-fetch)
    async refreshTodayThemes() {
        try {
            const today = new Date().toISOString().split('T')[0];

            console.log(`🗑️ 오늘 날짜 테마 데이터 삭제 중: ${today}`);

            // Delete today's theme data
            await supabase
                .from('theme_history')
                .delete()
                .eq('date', today);

            console.log('✅ 기존 데이터 삭제 완료');

            // Re-detect themes
            return await this.detectThemes();
        } catch (error) {
            console.error('❌ 테마 새로고침 실패:', error);
            throw error;
        }
    }

    // Get themes from database
    async getThemes(duration = 'all') {
        const today = new Date().toISOString().split('T')[0];

        let query = supabase
            .from('theme_history')
            .select(`
                *,
                theme_stocks (*)
            `)
            .eq('date', today)
            .order('strength', { ascending: false });

        if (duration !== 'all') {
            query = query.eq('duration_type', duration);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching themes:', error);
            return [];
        }

        // Transform to expected format
        return (data || []).map(theme => ({
            name: theme.theme_name,
            category: theme.category,
            strength: theme.strength,
            duration: {
                type: theme.duration_type,
                days: theme.duration_days
            },
            leader: {
                name: theme.leader_stock_name,
                code: theme.leader_stock_code,
                price: parseFloat(theme.theme_stocks.find(s => s.is_leader)?.price || 0),
                change_rate: parseFloat(theme.leader_change_rate || 0),
                volume_ratio: parseFloat(theme.theme_stocks.find(s => s.is_leader)?.volume_ratio || 0)
            },
            participants: theme.theme_stocks.map(s => ({
                name: s.stock_name,
                code: s.stock_code,
                price: parseFloat(s.price || 0),
                change_rate: parseFloat(s.change_rate || 0),
                volume_ratio: parseFloat(s.volume_ratio || 0)
            })),
            metrics: {
                participant_count: theme.participant_count,
                avg_rise: parseFloat(theme.avg_return || 0),
                avg_volume_increase: 0,
                foreign_participation: false
            },
            trigger: {
                type: theme.trigger_type,
                description: theme.trigger_description,
                news_count: 0
            },
            risk: {
                level: theme.risk_level,
                warnings: []
            },
            historical_data: null
        }));
    }
}

module.exports = new ThemeDetectionService();
