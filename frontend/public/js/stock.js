import { supabase } from './supabase-client.js';

// Chart.js v4 - CDN 방식
const Chart = window.Chart;


// 현재 선택된 종목 코드
let currentStockCode = '';
let stockChart = null;
let currentPeriod = 'D'; // 기본값: 일봉
let searchTimeout = null;

// 페이지 로드 시 인증 확인
window.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login.html';
        return;
    }

    // Chart.js 확인
    console.log('Chart.js loaded:', !!window.Chart);
    console.log('CandlestickController loaded:', !!window.CandlestickController);

    initializeEventListeners();
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    const stockInput = document.getElementById('stockCodeInput');
    const searchResultsDiv = document.getElementById('searchResults');

    // 검색 버튼
    document.getElementById('searchBtn').addEventListener('click', searchStock);

    // 입력 시 자동완성 검색
    stockInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();

        // 이전 타이머 취소
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (query.length === 0) {
            searchResultsDiv.classList.add('hidden');
            return;
        }

        // 300ms 디바운스 적용
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`http://localhost:3000/api/stock/search?query=${encodeURIComponent(query)}`);
                const results = await response.json();

                displaySearchResults(results);
            } catch (error) {
                console.error('검색 오류:', error);
            }
        }, 300);
    });

    // 엔터키로 검색
    stockInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchResultsDiv.classList.add('hidden');
            searchStock();
        }
    });

    // 외부 클릭 시 검색 결과 숨기기
    document.addEventListener('click', (e) => {
        if (!stockInput.contains(e.target) && !searchResultsDiv.contains(e.target)) {
            searchResultsDiv.classList.add('hidden');
        }
    });

    // 로그아웃 버튼
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/login.html';
    });

    // 인기 종목 버튼들
    document.querySelectorAll('.popular-stock-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const stockCode = btn.getAttribute('data-code');
            stockInput.value = stockCode;
            searchResultsDiv.classList.add('hidden');
            searchStock();
        });
    });

    // 기간 선택 버튼들
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // 활성 버튼 스타일 변경
            document.querySelectorAll('.period-btn').forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('bg-gray-100');
            });
            btn.classList.remove('bg-gray-100');
            btn.classList.add('bg-blue-600', 'text-white');

            // 차트 업데이트
            currentPeriod = btn.getAttribute('data-period');
            if (currentStockCode) {
                loadChartData(currentStockCode, currentPeriod);
            }
        });
    });

    // 줌 초기화 버튼
    document.getElementById('resetZoomBtn').addEventListener('click', () => {
        if (stockChart) {
            stockChart.resetZoom();
        }
    });
}

// 검색 결과 표시
function displaySearchResults(results) {
    const searchResultsDiv = document.getElementById('searchResults');

    if (results.length === 0) {
        searchResultsDiv.classList.add('hidden');
        return;
    }

    searchResultsDiv.innerHTML = results.map(stock => `
        <div class="search-result-item px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0" data-code="${stock.code}">
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-semibold text-gray-900">${stock.name}</p>
                    <p class="text-sm text-gray-600">${stock.code}</p>
                </div>
            </div>
        </div>
    `).join('');

    // 검색 결과 항목 클릭 이벤트
    searchResultsDiv.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const stockCode = item.getAttribute('data-code');
            const stockName = item.querySelector('p.font-semibold').textContent;
            document.getElementById('stockCodeInput').value = `${stockName} (${stockCode})`;
            searchResultsDiv.classList.add('hidden');

            // 종목 코드만 저장하고 검색 실행
            currentStockCode = stockCode;
            loadStockData(stockCode);
        });
    });

    searchResultsDiv.classList.remove('hidden');
}

// 종목 데이터 로드
async function loadStockData(stockCode) {
    hideError();

    try {
        // 메인 컨텐츠 영역 표시
        document.getElementById('mainContent').classList.remove('hidden');

        await Promise.all([
            loadStockInfo(stockCode),
            loadChartData(stockCode, currentPeriod)
        ]);
    } catch (error) {
        showError('데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 종목 검색
async function searchStock() {
    const input = document.getElementById('stockCodeInput').value.trim();

    if (!input) {
        showError('종목명 또는 종목 코드를 입력해주세요.');
        return;
    }

    // 괄호 안에 종목 코드가 있는 경우 추출 (예: "삼성전자 (005930)")
    const codeMatch = input.match(/\((\d{6})\)/);
    let stockCode;

    if (codeMatch) {
        stockCode = codeMatch[1];
    } else if (/^\d{6}$/.test(input)) {
        stockCode = input;
    } else {
        // 종목명으로 검색 시도
        try {
            const response = await fetch(`http://localhost:3000/api/stock/search?query=${encodeURIComponent(input)}`);
            const results = await response.json();

            if (results.length > 0) {
                stockCode = results[0].code;
            } else {
                showError('종목을 찾을 수 없습니다.');
                return;
            }
        } catch (error) {
            showError('종목 검색 중 오류가 발생했습니다.');
            return;
        }
    }

    hideError();
    currentStockCode = stockCode;

    try {
        await Promise.all([
            loadStockInfo(stockCode),
            loadChartData(stockCode, currentPeriod)
        ]);
    } catch (error) {
        showError('데이터를 불러오는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 종목 정보 로드 (한국투자증권 API 사용)
async function loadStockInfo(stockCode) {
    try {
        // 백엔드 API를 통해 한국투자증권 API 호출
        const response = await fetch(`http://localhost:3000/api/stock/quote/${stockCode}`);

        const data = await response.json();

        // 토큰 에러 체크
        if (!response.ok) {
            if (data.needToken) {
                showTokenError();
                throw new Error('토큰이 필요합니다.');
            }
            throw new Error(data.message || '종목 정보를 가져올 수 없습니다.');
        }

        // 종목 정보 표시
        displayStockInfo(data);
    } catch (error) {
        console.error('종목 정보 로드 오류:', error);
        throw error;
    }
}

// 종목 정보 화면에 표시
function displayStockInfo(data) {
    // 종목명 & 코드
    document.getElementById('stockName').textContent = data.name || '-';
    document.getElementById('stockCode').textContent = data.code || '-';

    // 현재가
    document.getElementById('currentPrice').textContent = formatPrice(data.currentPrice);

    // 전일대비
    const priceChange = data.priceChange || 0;
    const priceChangeEl = document.getElementById('priceChange');
    const changeText = formatPriceChange(priceChange);
    priceChangeEl.textContent = changeText;

    // 등락률
    const changeRate = data.changeRate || 0;
    const changeRateEl = document.getElementById('changeRate');
    changeRateEl.textContent = `${changeRate > 0 ? '+' : ''}${changeRate.toFixed(2)}%`;

    // 색상 설정 (상승: 빨강, 하락: 파랑, 보합: 회색)
    if (priceChange > 0) {
        priceChangeEl.className = 'text-lg font-semibold text-red-600';
        changeRateEl.className = 'text-lg font-semibold text-red-600';
    } else if (priceChange < 0) {
        priceChangeEl.className = 'text-lg font-semibold text-blue-600';
        changeRateEl.className = 'text-lg font-semibold text-blue-600';
    } else {
        priceChangeEl.className = 'text-lg font-semibold text-gray-600';
        changeRateEl.className = 'text-lg font-semibold text-gray-600';
    }

    // 시고저
    document.getElementById('openPrice').textContent = formatPrice(data.openPrice);
    document.getElementById('highPrice').textContent = formatPrice(data.highPrice);
    document.getElementById('lowPrice').textContent = formatPrice(data.lowPrice);

    // 거래량 & 거래대금
    document.getElementById('volume').textContent = formatVolume(data.volume);
    const tradeValue = data.currentPrice * data.volume;
    document.getElementById('tradeValue').textContent = formatCurrency(tradeValue);

    // 시가총액 (현재가 x 상장주식수) - API에서 제공되면 사용, 아니면 계산
    const marketCap = data.marketCap || (data.currentPrice * (data.listedShares || 0));
    document.getElementById('marketCap').textContent = formatCurrency(marketCap);

    // 상장주식수
    document.getElementById('listedShares').textContent = data.listedShares ? formatVolume(data.listedShares) : '-';

    // 52주 최고/최저
    document.getElementById('week52High').textContent = data.week52High ? formatPrice(data.week52High) : '-';
    document.getElementById('week52Low').textContent = data.week52Low ? formatPrice(data.week52Low) : '-';
}

// 차트 데이터 로드
async function loadChartData(stockCode, period) {
    try {
        // 백엔드 API를 통해 한국투자증권 API 호출 - 항상 전체 데이터 로드
        const url = `http://localhost:3000/api/stock/chart/${stockCode}?period=${period}&loadAll=true`;
        const response = await fetch(url);

        const data = await response.json();

        // 토큰 에러 체크
        if (!response.ok) {
            if (data.needToken) {
                showTokenError();
                throw new Error('토큰이 필요합니다.');
            }
            throw new Error(data.message || '차트 데이터를 가져올 수 없습니다.');
        }

        // 데이터 검증
        if (!data || data.length === 0) {
            throw new Error('차트 데이터가 없습니다.');
        }

        // 날짜 범위 정보 업데이트
        const startDate = new Date(data[0].date).toLocaleDateString('ko-KR');
        const endDate = new Date(data[data.length - 1].date).toLocaleDateString('ko-KR');
        const dataRangeInfo = document.getElementById('dataRangeInfo');
        dataRangeInfo.textContent = `${startDate} ~ ${endDate} (${data.length}개)`;

        // 차트 그리기
        drawChart(data);
    } catch (error) {
        console.error('차트 데이터 로드 오류:', error);
        throw error;
    }
}

// 차트 그리기 (캔들스틱 차트)
function drawChart(chartData) {
    // 데이터가 없으면 에러 처리
    if (!chartData || chartData.length === 0) {
        console.error('차트 데이터가 없습니다.');
        return;
    }

    // Chart.js가 로드되었는지 확인
    if (!window.Chart) {
        console.error('❌ Chart.js가 로드되지 않았습니다.');
        return;
    }

    // Financial 플러그인 확인 - 간단한 체크로 변경
    console.log('Available in window:', {
        Chart: !!window.Chart,
        CandlestickController: !!window.CandlestickController,
        CandlestickElement: !!window.CandlestickElement
    });

    // 기존 차트가 있으면 완전히 제거
    if (stockChart) {
        stockChart.destroy();
        stockChart = null;
    }

    const canvas = document.getElementById('stockChart');
    const ctx = canvas.getContext('2d');

    // 년봉일 경우 월봉 데이터를 연도별로 그룹화
    let processedData = chartData;
    if (currentPeriod === 'Y') {
        const yearlyData = {};
        chartData.forEach(item => {
            const year = new Date(item.date).getFullYear();
            if (!yearlyData[year]) {
                yearlyData[year] = {
                    year: year,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    firstDate: item.date
                };
            } else {
                // 같은 연도의 데이터 병합
                yearlyData[year].high = Math.max(yearlyData[year].high, item.high);
                yearlyData[year].low = Math.min(yearlyData[year].low, item.low);
                yearlyData[year].close = item.close; // 마지막 종가 사용
            }
        });

        processedData = Object.values(yearlyData).map(item => ({
            date: `${item.year}-12-31`, // 연말로 표시
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
        }));
    }

    // 캔들스틱 차트용 데이터 변환
    const candlestickData = processedData.map(item => ({
        x: new Date(item.date).getTime(), // 밀리초로 변환
        o: item.open,   // 시가
        h: item.high,   // 고가
        l: item.low,    // 저가
        c: item.close   // 종가
    }));

    // 봉 타입 이름
    const bongNames = {
        'D': '일봉',
        'W': '주봉',
        'M': '월봉',
        'Y': '년봉'
    };
    const bongName = bongNames[currentPeriod] || '일봉';

    console.log(`📊 Creating ${bongName} chart with`, candlestickData.length, 'data points');

    try {
        stockChart = new Chart(ctx, {
            type: 'candlestick',
            data: {
                datasets: [{
                    label: bongName,
                    data: candlestickData,
                    color: {
                        up: '#ef4444',      // 상승: 빨강
                        down: '#3b82f6',    // 하락: 파랑
                        unchanged: '#6b7280' // 보합: 회색
                    },
                    borderColor: {
                        up: '#dc2626',
                        down: '#2563eb',
                        unchanged: '#4b5563'
                    }
                }]
            },
        options: {
            parsing: false, // 데이터가 이미 올바른 형식이므로 파싱 불필요
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            if (context[0] && context[0].raw) {
                                const date = new Date(context[0].raw.x);
                                return date.toLocaleDateString('ko-KR');
                            }
                            return '';
                        },
                        label: function(context) {
                            const data = context.raw;
                            if (!data) return '';

                            const open = formatPrice(data.o);
                            const high = formatPrice(data.h);
                            const low = formatPrice(data.l);
                            const close = formatPrice(data.c);
                            const change = data.c - data.o;
                            const changePercent = ((change / data.o) * 100).toFixed(2);
                            const changeText = change > 0 ? `+${formatPrice(change)}` : formatPrice(change);

                            return [
                                `시가: ${open}원`,
                                `고가: ${high}원`,
                                `저가: ${low}원`,
                                `종가: ${close}원`,
                                `등락: ${changeText}원 (${changePercent > 0 ? '+' : ''}${changePercent}%)`
                            ];
                        }
                    }
                },
                zoom: {
                    limits: {
                        x: {
                            min: 'original',
                            max: 'original'
                        }
                    },
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x'
                    }
                }
            },
            scales: {
                x: {
                    type: 'timeseries', // Chart.js v4에서는 timeseries 사용 권장
                    time: {
                        unit: currentPeriod === 'D' ? 'day' :
                              currentPeriod === 'W' ? 'week' :
                              currentPeriod === 'M' ? 'month' : 'year',
                        displayFormats: {
                            day: 'MM/dd',
                            week: 'MM/dd',
                            month: 'yyyy-MM',
                            year: 'yyyy'
                        },
                        tooltipFormat: currentPeriod === 'D' ? 'yyyy-MM-dd' :
                                      currentPeriod === 'W' ? 'yyyy년 MM월 dd일' :
                                      currentPeriod === 'M' ? 'yyyy년 MM월' : 'yyyy년'
                    },
                    display: true,
                    title: {
                        display: true,
                        text: '날짜'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        autoSkip: true,
                        maxTicksLimit: 20
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '가격 (원)'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatPrice(value);
                        }
                    }
                }
            }
        }
        });

        console.log('✅ Candlestick chart created successfully');
    } catch (error) {
        console.error('❌ Chart creation error:', error);
        console.error('Error details:', error.message, error.stack);
        throw error;
    }
}

// 가격 포맷팅
function formatPrice(price) {
    if (!price && price !== 0) return '-';
    return Math.round(price).toLocaleString('ko-KR');
}

// 가격 변동 포맷팅
function formatPriceChange(change) {
    if (!change && change !== 0) return '-';
    const formatted = Math.abs(change).toLocaleString('ko-KR');
    if (change > 0) return `+${formatted}`;
    if (change < 0) return `-${formatted}`;
    return formatted;
}

// 거래량 포맷팅
function formatVolume(volume) {
    if (!volume && volume !== 0) return '-';
    if (volume >= 100000000) {
        return `${(volume / 100000000).toFixed(1)}억`;
    } else if (volume >= 10000) {
        return `${(volume / 10000).toFixed(1)}만`;
    }
    return volume.toLocaleString('ko-KR');
}

// 금액 포맷팅 (억/조 단위)
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '-';
    if (amount >= 1000000000000) {
        return `${(amount / 1000000000000).toFixed(1)}조원`;
    } else if (amount >= 100000000) {
        return `${(amount / 100000000).toFixed(1)}억원`;
    } else if (amount >= 10000) {
        return `${(amount / 10000).toFixed(0)}만원`;
    }
    return amount.toLocaleString('ko-KR') + '원';
}

// 에러 메시지 표시
function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

// 에러 메시지 숨기기
function hideError() {
    const errorEl = document.getElementById('errorMessage');
    errorEl.classList.add('hidden');
}

// 토큰 에러 메시지 표시
function showTokenError() {
    const message = `
⚠️ API 토큰이 필요합니다!

주식 데이터를 조회하려면 먼저 한국투자증권 API 토큰을 발급받아야 합니다.

서버 터미널에서 다음 명령어를 실행하세요:
curl -X POST http://localhost:3000/api/token/issue

또는 브라우저 콘솔(F12)에서:
fetch('http://localhost:3000/api/token/issue', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
    `.trim();

    alert(message);

    showError('⚠️ API 토큰이 필요합니다. 먼저 토큰을 발급받아주세요.');
}
