const kisApiService = require('../services/kisApiService');

/**
 * 한국투자증권 API 테스트 예제
 */
async function testKisApi() {
  try {
    console.log('=== 한국투자증권 API 테스트 시작 ===\n');

    // 1. Access Token 발급 테스트
    console.log('1. Access Token 발급 중...');
    const token = await kisApiService.getAccessToken();
    console.log('✓ Access Token 발급 성공');
    console.log(`Token: ${token.substring(0, 50)}...\n`);

    // 2. 주식 현재가 조회 테스트 (삼성전자: 005930)
    console.log('2. 주식 현재가 조회 중 (삼성전자: 005930)...');
    const stockQuote = await kisApiService.getStockQuote('005930');

    console.log('✓ 주식 현재가 조회 성공');
    console.log(`종목명: ${stockQuote.name}`);
    console.log(`현재가: ${stockQuote.currentPrice.toLocaleString()}원`);
    console.log(`전일대비: ${stockQuote.priceChange >= 0 ? '▲' : '▼'} ${Math.abs(stockQuote.priceChange).toLocaleString()}원 (${stockQuote.changeRate}%)`);
    console.log(`시가: ${stockQuote.openPrice.toLocaleString()}원`);
    console.log(`고가: ${stockQuote.highPrice.toLocaleString()}원`);
    console.log(`저가: ${stockQuote.lowPrice.toLocaleString()}원`);
    console.log(`거래량: ${stockQuote.volume.toLocaleString()}주\n`);

    // 3. 차트 데이터 조회 테스트 (최근 30일 일봉)
    console.log('3. 차트 데이터 조회 중 (삼성전자 최근 30일 일봉)...');
    const chartData = await kisApiService.getStockChartData('005930', 'D');

    console.log('✓ 차트 데이터 조회 성공');
    console.log(`데이터 개수: ${chartData.length}개\n`);

    console.log('최근 5일 데이터:');
    chartData.slice(-5).forEach((day, index) => {
      console.log(`${index + 1}. ${day.date} - 시가: ${day.open.toLocaleString()} | 고가: ${day.high.toLocaleString()} | 저가: ${day.low.toLocaleString()} | 종가: ${day.close.toLocaleString()} | 거래량: ${day.volume.toLocaleString()}`);
    });

    console.log('\n=== 테스트 완료 ===');
  } catch (error) {
    console.error('테스트 중 오류 발생:', error.message);
  }
}

/**
 * 날짜를 YYYYMMDD 형식으로 변환
 */
function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// 테스트 실행
testKisApi();
