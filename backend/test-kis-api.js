const kisApiService = require('./src/services/kisApiService');

async function testKISAPI() {
    console.log('🔍 KIS API 테스트 시작...');

    const testCodes = ['005930', '000660', '112610']; // 삼성전자, SK하이닉스, 이오테크닉스

    for (const code of testCodes) {
        try {
            console.log(`\n📊 ${code} 조회 중...`);
            const quote = await kisApiService.getStockQuote(code);

            console.log('✅ 응답 데이터:');
            console.log(JSON.stringify(quote, null, 2));

            if (quote) {
                console.log(`\n종목명: ${quote.name}`);
                console.log(`현재가: ${quote.currentPrice}원`);
                console.log(`등락률: ${quote.changeRate}%`);
                console.log(`거래량: ${quote.volume}`);
                console.log(`시가총액: ${quote.marketCap}`);
            }
        } catch (error) {
            console.error(`❌ ${code} 조회 실패:`, error.message);
            console.error('Error stack:', error.stack);
        }
    }
}

testKISAPI().catch(console.error);
