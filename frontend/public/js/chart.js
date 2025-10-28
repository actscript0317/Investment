// Chart Page JavaScript
let chart = null;
let currentStock = null;
let selectedPeriod = 'D'; // D: 일봉, W: 주봉, M: 월봉, Y: 년봉

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeChart();
});

// Setup Event Listeners
function setupEventListeners() {
    const searchInput = document.getElementById('stockSearch');
    const periodButtons = document.querySelectorAll('.period-btn');
    const resetZoomBtn = document.getElementById('resetZoom');

    // Stock search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => searchStocks(e.target.value), 300);
    });

    // Period selection
    periodButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            periodButtons.forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
            periodButtons.forEach(b => b.classList.add('bg-gray-200', 'hover:bg-gray-300'));

            e.target.classList.remove('bg-gray-200', 'hover:bg-gray-300');
            e.target.classList.add('bg-blue-600', 'text-white');

            selectedPeriod = e.target.dataset.period;
            if (currentStock) {
                loadChartData(currentStock.code, currentStock.name);
            }
        });
    });

    // Reset zoom button
    resetZoomBtn.addEventListener('click', () => {
        if (chart) {
            chart.resetZoom();
        }
    });

    // Click outside to close search results
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#stockSearch') && !e.target.closest('#searchResults')) {
            document.getElementById('searchResults').classList.add('hidden');
        }
    });
}

// Initialize Chart
function initializeChart() {
    const ctx = document.getElementById('stockChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'candlestick',
        data: {
            datasets: [{
                label: '주가',
                data: [],
                barPercentage: 0.5,
                categoryPercentage: 0.8,
                barThickness: 'flex',
                maxBarThickness: 8,
                color: {
                    up: '#ef4444',
                    down: '#3b82f6',
                    unchanged: '#6b7280'
                },
                borderColor: {
                    up: '#dc2626',
                    down: '#2563eb',
                    unchanged: '#4b5563'
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 300
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: 16,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        },
                        label: function(context) {
                            const data = context.raw;
                            return [
                                `시가: ${data.o.toLocaleString()}원`,
                                `고가: ${data.h.toLocaleString()}원`,
                                `저가: ${data.l.toLocaleString()}원`,
                                `종가: ${data.c.toLocaleString()}원`,
                                `등락: ${(data.c - data.o).toLocaleString()}원 (${((data.c - data.o) / data.o * 100).toFixed(2)}%)`
                            ];
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x',
                        modifierKey: 'ctrl'
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
                    type: 'time',
                    time: {
                        unit: 'day',
                        tooltipFormat: 'yyyy년 MM월 dd일',
                        displayFormats: {
                            day: 'MM/dd',
                            week: 'MM/dd',
                            month: 'yyyy/MM',
                            year: 'yyyy'
                        }
                    },
                    ticks: {
                        source: 'auto',
                        autoSkip: true,
                        autoSkipPadding: 50,
                        maxRotation: 0,
                        minRotation: 0,
                        maxTicksLimit: 20,
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        display: true,
                        drawOnChartArea: true,
                        drawTicks: true,
                        color: '#e5e7eb',
                        lineWidth: 1
                    }
                },
                y: {
                    position: 'right',
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + '원';
                        },
                        font: {
                            size: 11
                        }
                    },
                    grid: {
                        color: '#f3f4f6',
                        drawTicks: false
                    }
                }
            }
        }
    });
}

// Search Stocks
async function searchStocks(query) {
    const resultsContainer = document.getElementById('searchResults');

    if (!query || query.trim().length === 0) {
        resultsContainer.classList.add('hidden');
        return;
    }

    try {
        const response = await fetch(`/api/stock/search?query=${encodeURIComponent(query)}`);
        const stocks = await response.json();

        if (stocks.length === 0) {
            resultsContainer.innerHTML = '<div class="p-4 text-gray-500">검색 결과가 없습니다</div>';
        } else {
            resultsContainer.innerHTML = stocks.map(stock => `
                <div class="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                     onclick="selectStock('${stock.code}', '${stock.name}')">
                    <div class="font-semibold">${stock.name}</div>
                    <div class="text-sm text-gray-500">${stock.code}</div>
                </div>
            `).join('');
        }

        resultsContainer.classList.remove('hidden');
    } catch (error) {
        console.error('Stock search error:', error);
        resultsContainer.innerHTML = '<div class="p-4 text-red-500">검색 중 오류가 발생했습니다</div>';
        resultsContainer.classList.remove('hidden');
    }
}

// Select Stock
window.selectStock = async function(code, name) {
    currentStock = { code, name };
    document.getElementById('stockSearch').value = `${name} (${code})`;
    document.getElementById('searchResults').classList.add('hidden');
    document.getElementById('chartTitle').textContent = name;

    await Promise.all([
        loadChartData(code, name),
        loadStockInfo(code)
    ]);
};

// Load Chart Data
async function loadChartData(stockCode, stockName) {
    try {
        console.log(`📊 차트 데이터 로딩 시작: ${stockCode}, 기간: ${selectedPeriod}`);

        // loadAll=true로 전체 데이터 요청
        const response = await fetch(
            `/api/stock/chart/${stockCode}?period=${selectedPeriod}&loadAll=true`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch chart data');
        }

        const data = await response.json();
        console.log('📦 받은 데이터:', data);

        if (data.error) {
            console.error('❌ API 에러:', data.error, data.message);
            throw new Error(data.message || 'API 오류 발생');
        }

        if (data.output2 && data.output2.length > 0) {
            console.log(`✅ ${data.output2.length}개의 캔들 데이터 처리 시작`);

            // Reverse data to show oldest to newest
            const chartData = data.output2.reverse();

            // Convert to candlestick format with proper date parsing
            const candlestickData = chartData.map(item => {
                // Parse date string (YYYYMMDD) to Date object
                const dateStr = item.stck_bsop_date;
                const year = parseInt(dateStr.substring(0, 4));
                const month = parseInt(dateStr.substring(4, 6)) - 1; // 0-based month
                const day = parseInt(dateStr.substring(6, 8));

                // Create date at noon to avoid timezone issues
                const date = new Date(year, month, day, 12, 0, 0);

                return {
                    x: date, // Date 객체 사용
                    o: parseInt(item.stck_oprc), // 시가
                    h: parseInt(item.stck_hgpr), // 고가
                    l: parseInt(item.stck_lwpr), // 저가
                    c: parseInt(item.stck_clpr)  // 종가
                };
            });

            console.log('✅ 캔들 데이터 변환 완료');
            console.log('첫 번째 캔들:', candlestickData[0]);
            console.log('마지막 캔들:', candlestickData[candlestickData.length - 1]);
            console.log('총 캔들 수:', candlestickData.length);

            chart.data.datasets[0].data = candlestickData;
            chart.data.datasets[0].label = `${stockName} (${getPeriodName(selectedPeriod)})`;

            // x축 시간 단위 및 설정 업데이트
            updateChartTimeSettings(selectedPeriod, candlestickData);

            console.log('🔄 차트 업데이트 시작...');
            chart.update(); // 차트 업데이트
            console.log('✅ 차트 업데이트 완료');
        } else {
            console.warn('⚠️ 데이터가 없습니다:', data);
            alert('차트 데이터가 없습니다.');
        }
    } catch (error) {
        console.error('❌ Chart data loading error:', error);
        console.error('에러 스택:', error.stack);
        alert(`차트 데이터를 불러오는데 실패했습니다.\n${error.message}`);
    }
}

// 기간명 반환
function getPeriodName(period) {
    const names = {
        'D': '일봉',
        'W': '주봉',
        'M': '월봉',
        'Y': '년봉'
    };
    return names[period] || '일봉';
}

// x축 시간 단위 및 설정 업데이트
function updateChartTimeSettings(period, data) {
    const timeSettings = {
        'D': {
            unit: 'day',
            tooltipFormat: 'yyyy년 MM월 dd일',
            displayFormats: {
                day: 'MM/dd'
            },
            maxTicksLimit: 15
        },
        'W': {
            unit: 'week',
            tooltipFormat: 'yyyy년 MM월 dd일',
            displayFormats: {
                week: 'MM/dd'
            },
            maxTicksLimit: 20
        },
        'M': {
            unit: 'month',
            tooltipFormat: 'yyyy년 MM월',
            displayFormats: {
                month: 'yyyy/MM'
            },
            maxTicksLimit: 12
        },
        'Y': {
            unit: 'year',
            tooltipFormat: 'yyyy년',
            displayFormats: {
                year: 'yyyy'
            },
            maxTicksLimit: 10
        }
    };

    const settings = timeSettings[period] || timeSettings['D'];

    // x축 시간 설정 업데이트
    chart.options.scales.x.time.unit = settings.unit;
    chart.options.scales.x.time.tooltipFormat = settings.tooltipFormat;
    chart.options.scales.x.time.displayFormats = settings.displayFormats;
    chart.options.scales.x.ticks.maxTicksLimit = settings.maxTicksLimit;
}

// Load Stock Info
async function loadStockInfo(stockCode) {
    try {
        console.log(`📊 종목 정보 조회 시작: ${stockCode}`);
        const response = await fetch(`/api/stock/quote/${stockCode}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API 응답 실패 (${response.status}):`, errorText);
            throw new Error(`Failed to fetch stock info: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ 종목 정보 조회 성공:', data);

        // API 응답 데이터 구조 확인 (camelCase 형식)
        if (!data || !data.currentPrice) {
            console.error('❌ 잘못된 데이터 형식:', data);
            throw new Error('Invalid data format');
        }

        // Update stock info section
        const stockInfo = document.getElementById('stockInfo');
        const priceChange = data.priceChange || 0;
        const priceChangeRate = data.changeRate || 0;
        const isPositive = priceChange >= 0;

        stockInfo.innerHTML = `
            <div class="text-center">
                <div class="text-4xl font-bold mb-2">
                    ${data.currentPrice.toLocaleString()}
                    <span class="text-lg text-gray-500">원</span>
                </div>
                <div class="text-lg ${isPositive ? 'text-red-600' : 'text-blue-600'} font-semibold">
                    ${isPositive ? '▲' : '▼'} ${Math.abs(priceChange).toLocaleString()}원
                    (${isPositive ? '+' : ''}${priceChangeRate.toFixed(2)}%)
                </div>
            </div>

            <div class="border-t pt-4 mt-4 space-y-2">
                <div class="flex justify-between">
                    <span class="text-gray-600">시가</span>
                    <span class="font-semibold">${(data.openPrice || 0).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">고가</span>
                    <span class="font-semibold text-red-600">${(data.highPrice || 0).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">저가</span>
                    <span class="font-semibold text-blue-600">${(data.lowPrice || 0).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">거래량</span>
                    <span class="font-semibold">${(data.volume || 0).toLocaleString()}주</span>
                </div>
            </div>
        `;

        // Update price details section
        const priceDetails = document.getElementById('priceDetails');
        priceDetails.innerHTML = `
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">52주 최고</span>
                    <span class="font-semibold">${(data.week52High || 0).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">52주 최저</span>
                    <span class="font-semibold">${(data.week52Low || 0).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">시가총액</span>
                    <span class="font-semibold">${((data.marketCap || 0) / 100000000).toFixed(0)}억원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">상장주식수</span>
                    <span class="font-semibold">${((data.listedShares || 0) / 1000).toFixed(0)}천주</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">거래대금</span>
                    <span class="font-semibold">${((data.tradeValue || 0) / 100000000).toFixed(0)}억원</span>
                </div>
            </div>
        `;

        console.log('✅ 종목 정보 UI 업데이트 완료');
    } catch (error) {
        console.error('❌ Stock info loading error:', error);
        const stockInfo = document.getElementById('stockInfo');
        const priceDetails = document.getElementById('priceDetails');

        stockInfo.innerHTML = `
            <div class="text-center text-red-500 py-8">
                정보를 불러오는데 실패했습니다<br>
                <span class="text-sm">${error.message}</span>
            </div>
        `;

        priceDetails.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                데이터를 불러올 수 없습니다
            </div>
        `;
    }
}
