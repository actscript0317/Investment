const kisApiService = require('../src/services/kisApiService');

// 저장할 종목 리스트
const stockList = [
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
    { code: '323410', name: '카카오뱅크' },
    { code: '030200', name: 'KT' },
    { code: '034220', name: 'LG디스플레이' },
    { code: '047810', name: '한국항공우주' },
    { code: '009540', name: 'HD한국조선해양' },
    { code: '010950', name: 'S-Oil' }
];

// 봉 차트 타입
const periods = [
    { code: 'D', name: '일봉' },
    { code: 'W', name: '주봉' },
    { code: 'M', name: '월봉' }
];

async function saveAllData() {
    console.log('================================================');
    console.log('📥 전체 종목 데이터 저장 시작');
    console.log(`종목 수: ${stockList.length}개`);
    console.log(`기간: ${periods.map(p => p.name).join(', ')}`);
    console.log('================================================\n');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < stockList.length; i++) {
        const stock = stockList[i];
        console.log(`\n[${i + 1}/${stockList.length}] ${stock.name} (${stock.code})`);
        console.log('─'.repeat(50));

        for (const period of periods) {
            try {
                console.log(`  📊 ${period.name} 데이터 로딩 중...`);

                // loadAll=true로 전체 데이터 로드 (자동으로 DB에 저장됨)
                const data = await kisApiService.getStockChartData(stock.code, period.code, true);

                if (data && data.length > 0) {
                    console.log(`  ✅ ${period.name} 저장 완료: ${data.length}개`);
                    successCount++;
                } else {
                    console.log(`  ⚠️  ${period.name} 데이터 없음`);
                }

                // API 호출 제한 방지 (1초 대기)
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`  ❌ ${period.name} 저장 실패:`, error.message);
                failCount++;
            }
        }
    }

    console.log('\n================================================');
    console.log('📊 전체 저장 완료');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${failCount}개`);
    console.log('================================================');
}

// 스크립트 실행
saveAllData()
    .then(() => {
        console.log('\n프로그램 종료');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ 오류 발생:', error);
        process.exit(1);
    });
