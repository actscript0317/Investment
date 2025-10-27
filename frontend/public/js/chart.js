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
                data: []
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    callbacks: {
                        label: function(context) {
                            const data = context.raw;
                            return [
                                `시가: ${data.o.toLocaleString()}원`,
                                `고가: ${data.h.toLocaleString()}원`,
                                `저가: ${data.l.toLocaleString()}원`,
                                `종가: ${data.c.toLocaleString()}원`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MM/dd',
                            week: 'MM/dd',
                            month: 'YYYY/MM',
                            year: 'YYYY'
                        }
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + '원';
                        }
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
        // Calculate date range based on selected period
        const endDate = new Date();
        const startDate = new Date();

        // 기간별로 조회 기간 설정
        switch(selectedPeriod) {
            case 'D': // 일봉 - 최근 100일
                startDate.setDate(startDate.getDate() - 100);
                break;
            case 'W': // 주봉 - 최근 2년
                startDate.setFullYear(startDate.getFullYear() - 2);
                break;
            case 'M': // 월봉 - 최근 5년
                startDate.setFullYear(startDate.getFullYear() - 5);
                break;
            case 'Y': // 년봉 - 최근 10년
                startDate.setFullYear(startDate.getFullYear() - 10);
                break;
        }

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        };

        const response = await fetch(
            `/api/stock/chart/${stockCode}?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}&period=${selectedPeriod}`
        );

        if (!response.ok) {
            throw new Error('Failed to fetch chart data');
        }

        const data = await response.json();

        if (data.output2 && data.output2.length > 0) {
            // Reverse data to show oldest to newest
            const chartData = data.output2.reverse();

            // Convert to candlestick format
            const candlestickData = chartData.map(item => ({
                x: item.stck_bsop_date, // 날짜
                o: parseInt(item.stck_oprc), // 시가
                h: parseInt(item.stck_hgpr), // 고가
                l: parseInt(item.stck_lwpr), // 저가
                c: parseInt(item.stck_clpr)  // 종가
            }));

            chart.data.datasets[0].data = candlestickData;
            chart.data.datasets[0].label = `${stockName} (${getPeriodName(selectedPeriod)})`;

            // x축 시간 단위 업데이트
            updateTimeUnit(selectedPeriod);

            chart.update();
        }
    } catch (error) {
        console.error('Chart data loading error:', error);
        alert('차트 데이터를 불러오는데 실패했습니다.');
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

// x축 시간 단위 업데이트
function updateTimeUnit(period) {
    const units = {
        'D': 'day',
        'W': 'week',
        'M': 'month',
        'Y': 'year'
    };
    chart.options.scales.x.time.unit = units[period] || 'day';
}

// Load Stock Info
async function loadStockInfo(stockCode) {
    try {
        const response = await fetch(`/api/stock/quote/${stockCode}`);

        if (!response.ok) {
            throw new Error('Failed to fetch stock info');
        }

        const data = await response.json();

        // Update stock info section
        const stockInfo = document.getElementById('stockInfo');
        const priceChange = parseInt(data.prdy_vrss);
        const priceChangeRate = parseFloat(data.prdy_ctrt);
        const isPositive = priceChange >= 0;

        stockInfo.innerHTML = `
            <div class="text-center">
                <div class="text-4xl font-bold mb-2">
                    ${parseInt(data.stck_prpr).toLocaleString()}
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
                    <span class="font-semibold">${parseInt(data.stck_oprc).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">고가</span>
                    <span class="font-semibold text-red-600">${parseInt(data.stck_hgpr).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">저가</span>
                    <span class="font-semibold text-blue-600">${parseInt(data.stck_lwpr).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">거래량</span>
                    <span class="font-semibold">${parseInt(data.acml_vol).toLocaleString()}주</span>
                </div>
            </div>
        `;

        // Update price details section
        const priceDetails = document.getElementById('priceDetails');
        priceDetails.innerHTML = `
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-600">전일종가</span>
                    <span class="font-semibold">${parseInt(data.stck_sdpr).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">52주 최고</span>
                    <span class="font-semibold">${parseInt(data.w52_hgpr).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">52주 최저</span>
                    <span class="font-semibold">${parseInt(data.w52_lwpr).toLocaleString()}원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">시가총액</span>
                    <span class="font-semibold">${(parseInt(data.hts_avls) / 100000000).toFixed(0)}억원</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">PER</span>
                    <span class="font-semibold">${parseFloat(data.per).toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-600">PBR</span>
                    <span class="font-semibold">${parseFloat(data.pbr).toFixed(2)}</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Stock info loading error:', error);
        document.getElementById('stockInfo').innerHTML = `
            <div class="text-center text-red-500 py-8">
                정보를 불러오는데 실패했습니다
            </div>
        `;
    }
}
