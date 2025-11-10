// Chart Page JavaScript
let chart = null;
let currentStock = null;
let selectedPeriod = 'D'; // D: 일봉, W: 주봉, M: 월봉, Y: 년봉
let selectedDays = 365; // 기본 1년
let accountBalance = null;

// 종목별 가격 레벨 저장 (stockCode를 키로 사용)
let priceLevels = {}; // { stockCode: { stopLoss: number, takeProfit: number } }

// 현재 선택된 종목의 가격 레벨 (하위 호환성을 위해 유지)
let stopLossPrice = null;
let takeProfitPrice = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupMobileMenu();
    setupEventListeners();
    initializeChart();
    loadAccountBalance();
    loadPriceLevelsCards();
});

// Setup Mobile Menu
function setupMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

// Setup Event Listeners
function setupEventListeners() {
    const searchInput = document.getElementById('stockSearch');
    const periodButtons = document.querySelectorAll('.period-btn');
    const rangeButtons = document.querySelectorAll('.range-btn');
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
            periodButtons.forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('bg-gray-200', 'hover:bg-gray-300');
            });

            e.target.classList.remove('bg-gray-200', 'hover:bg-gray-300');
            e.target.classList.add('bg-blue-600', 'text-white');

            selectedPeriod = e.target.dataset.period;
            if (currentStock) {
                loadChartData(currentStock.code, currentStock.name);
            }
        });
    });

    // Range selection
    rangeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            rangeButtons.forEach(b => {
                b.classList.remove('bg-blue-600', 'text-white');
                b.classList.add('bg-gray-200', 'hover:bg-gray-300');
            });

            e.target.classList.remove('bg-gray-200', 'hover:bg-gray-300');
            e.target.classList.add('bg-blue-600', 'text-white');

            selectedDays = e.target.dataset.days;
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

// Load Account Balance
async function loadAccountBalance() {
    try {
        const response = await fetch('/api/account/balance');
        if (response.ok) {
            accountBalance = await response.json();
            console.log('✅ 계좌 잔고 로드 완료');
        }
    } catch (error) {
        console.error('❌ 계좌 잔고 로드 실패:', error);
    }
}

// Initialize Chart
function initializeChart() {
    const ctx = document.getElementById('stockChart').getContext('2d');

    // Check if candlestick chart type is registered
    console.log('📊 Chart.js 버전:', Chart.version);
    console.log('📊 Chart.registry:', Chart.registry);
    console.log('📊 Chart.controllers:', Chart.controllers);

    // Wait a bit for plugins to load
    const tryInit = () => {
        // Check multiple ways to verify candlestick is registered
        const hasCandlestick =
            (Chart.registry && Chart.registry.controllers && Chart.registry.controllers.candlestick) ||
            (Chart.controllers && Chart.controllers.candlestick);

        if (!hasCandlestick) {
            console.error('❌ candlestick 차트 타입이 등록되지 않았습니다!');
            console.log('💡 다시 시도 중...');
            return false;
        }

        console.log('✅ candlestick 차트 타입 등록 확인됨');
        return true;
    };

    if (!tryInit()) {
        // Try again after a short delay
        setTimeout(() => {
            if (!tryInit()) {
                console.error('❌ 차트 플러그인 로드 실패');
                return;
            }
            createChart();
        }, 100);
        return;
    }

    createChart();

    function createChart() {
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
                mode: 'index',
                intersect: false
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    callbacks: {
                        title: function(context) {
                            const date = new Date(context[0].parsed.x);
                            return date.toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                            });
                        },
                        label: function(context) {
                            const data = context.raw;
                            const open = data.o;
                            const high = data.h;
                            const low = data.l;
                            const close = data.c;

                            const change = close - open;
                            const changePercent = ((change / open) * 100).toFixed(2);
                            const changeSign = change >= 0 ? '+' : '';

                            return [
                                `시가: ${open.toLocaleString()}원`,
                                `고가: ${high.toLocaleString()}원`,
                                `저가: ${low.toLocaleString()}원`,
                                `종가: ${close.toLocaleString()}원`,
                                `변동: ${changeSign}${change.toLocaleString()}원 (${changeSign}${changePercent}%)`
                            ];
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#444',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false
                },
                legend: {
                    display: false
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
                },
                annotation: {
                    annotations: {}
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'day',
                        displayFormats: {
                            day: 'MM/dd'
                        }
                    },
                    title: {
                        display: false
                    }
                },
                y: {
                    position: 'right',
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
}

// Search Stocks
async function searchStocks(query) {
    if (!query || query.trim().length === 0) {
        document.getElementById('searchResults').classList.add('hidden');
        return;
    }

    try {
        const response = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
        const stocks = await response.json();

        const searchResults = document.getElementById('searchResults');

        if (stocks.length === 0) {
            searchResults.innerHTML = '<div class="p-4 text-gray-500">검색 결과가 없습니다</div>';
        } else {
            searchResults.innerHTML = stocks.slice(0, 10).map(stock =>
                `<div class="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center search-result"
                      data-code="${stock.code}" data-name="${stock.name}">
                    <span class="font-medium">${stock.name}</span>
                    <span class="text-sm text-gray-500">${stock.code}</span>
                </div>`
            ).join('');

            // Add click event to search results
            document.querySelectorAll('.search-result').forEach(item => {
                item.addEventListener('click', () => {
                    const code = item.dataset.code;
                    const name = item.dataset.name;
                    selectStock(code, name);
                    searchResults.classList.add('hidden');
                    document.getElementById('stockSearch').value = name;
                });
            });
        }

        searchResults.classList.remove('hidden');
    } catch (error) {
        console.error('검색 실패:', error);
    }
}

// Select Stock
async function selectStock(code, name) {
    console.log('🎯 selectStock 호출:', code, name);
    currentStock = { code, name };

    // API에서 저장된 가격 레벨 먼저 불러오기
    console.log('⏳ loadPriceLevelsFromAPI 호출 전...');
    const savedLevels = await loadPriceLevelsFromAPI(code);
    console.log('✅ loadPriceLevelsFromAPI 호출 완료:', savedLevels);

    if (savedLevels) {
        // 종목별 저장소에 저장
        priceLevels[code] = {
            stopLoss: savedLevels.stopLoss,
            takeProfit: savedLevels.takeProfit
        };

        // 현재 종목의 가격 레벨 설정
        stopLossPrice = savedLevels.stopLoss;
        takeProfitPrice = savedLevels.takeProfit;
        console.log('📥 저장된 가격 레벨 로드:', savedLevels);
    } else {
        // 종목별 저장소에서 확인
        if (priceLevels[code]) {
            stopLossPrice = priceLevels[code].stopLoss;
            takeProfitPrice = priceLevels[code].takeProfit;
            console.log('💾 로컬 캐시에서 가격 레벨 로드:', priceLevels[code]);
        } else {
            stopLossPrice = null;
            takeProfitPrice = null;
        }
    }

    // 차트 데이터 로드 (가격 레벨 로드 후)
    await loadChartData(code, name);

    // 차트 로드 완료 후 가격선 업데이트
    if (chart && chart.data.datasets[0].data.length > 0) {
        updatePriceLines();
        chart.update();

        // UI 업데이트
        const holdings = getStockHoldings(currentStock.code);
        const currentPrice = parseFloat(chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1].c);
        updatePriceLevelsUI(holdings, currentPrice);

        console.log('📍 가격선 업데이트 완료 - 손절가:', stopLossPrice, '익절가:', takeProfitPrice);
    }
}

// Select Stock from Card (카드를 클릭했을 때)
window.selectStockFromCard = async function(code, name) {
    console.log('📊 카드에서 종목 선택:', code, name);

    // Hide search results if shown
    document.getElementById('searchResults').classList.add('hidden');

    // Select the stock (same as clicking from search)
    await selectStock(code, name);

    // Scroll to top to show the main chart
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Load Chart Data
async function loadChartData(stockCode, stockName) {
    try {
        document.getElementById('chartTitle').textContent = `${stockName} (${stockCode})`;

        // 차트 데이터 가져오기 (loadAll=true로 모든 데이터 가져오기)
        const chartResponse = await fetch(`/api/stock/chart/${stockCode}?period=${selectedPeriod}&loadAll=true`);
        const chartData = await chartResponse.json();

        if (!chartData.output2 || chartData.output2.length === 0) {
            console.error('차트 데이터가 없습니다');
            return;
        }

        // 주식 시세 정보 가져오기 (현재가)
        const quoteResponse = await fetch(`/api/stock/quote/${stockCode}`);
        const quoteData = await quoteResponse.json();

        // 날짜 범위 필터링 - 제거하여 모든 데이터 표시
        let filteredData = chartData.output2;
        if (selectedDays !== 'all') {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - parseInt(selectedDays));
            filteredData = chartData.output2.filter(item => {
                const itemDate = parseDate(item.stck_bsop_date);
                return itemDate >= cutoffDate;
            });
        }

        console.log(`📊 차트 데이터: 전체 ${chartData.output2.length}개, 필터링 후 ${filteredData.length}개`);

        // 차트 데이터 변환
        const candlestickData = filteredData.map(item => ({
            x: parseDate(item.stck_bsop_date).getTime(),  // Date를 밀리초로 변환
            o: parseFloat(item.stck_oprc),  // 시가
            h: parseFloat(item.stck_hgpr),  // 고가
            l: parseFloat(item.stck_lwpr),  // 저가
            c: parseFloat(item.stck_clpr)   // 종가
        }));

        console.log('📊 캔들스틱 데이터 샘플:', candlestickData.slice(0, 3));
        console.log('📊 차트 객체:', chart);
        console.log('📊 차트 타입:', chart.config.type);

        chart.data.datasets[0].data = candlestickData;

        // 차트 데이터만 업데이트 (가격선은 selectStock에서 업데이트)
        chart.update();

        console.log('✅ 차트 업데이트 완료');

        // 매매 정보 업데이트
        if (quoteData && quoteData.currentPrice) {
            updateTradingInfo(stockCode, stockName, quoteData);
        } else {
            console.error('❌ 주식 시세 데이터가 없습니다:', quoteData);
        }

    } catch (error) {
        console.error('차트 데이터 로딩 실패:', error);
    }
}

// Update Price Lines (평단가, 손절가, 익절가)
function updatePriceLines() {
    if (!chart || !currentStock) {
        console.log('⚠️ updatePriceLines 스킵: chart =', !!chart, 'currentStock =', !!currentStock);
        return;
    }

    const annotations = {};

    // 평단가 가져오기
    const avgPrice = getAveragePurchasePrice(currentStock.code);

    console.log('📐 가격선 업데이트:', {
        avgPrice,
        stopLossPrice,
        takeProfitPrice,
        stockCode: currentStock.code
    });

    if (avgPrice) {
        annotations.avgPrice = {
            type: 'line',
            yMin: avgPrice,
            yMax: avgPrice,
            borderColor: 'rgb(255, 206, 86)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                content: `평단가: ${avgPrice.toLocaleString()}원`,
                enabled: true,
                position: 'end',
                backgroundColor: 'rgb(255, 206, 86)'
            }
        };
    }

    if (stopLossPrice) {
        annotations.stopLoss = {
            type: 'line',
            yMin: stopLossPrice,
            yMax: stopLossPrice,
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                content: `손절가: ${stopLossPrice.toLocaleString()}원`,
                enabled: true,
                position: 'end',
                backgroundColor: 'rgb(59, 130, 246)'
            }
        };
    }

    if (takeProfitPrice) {
        annotations.takeProfit = {
            type: 'line',
            yMin: takeProfitPrice,
            yMax: takeProfitPrice,
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
                content: `익절가: ${takeProfitPrice.toLocaleString()}원`,
                enabled: true,
                position: 'end',
                backgroundColor: 'rgb(239, 68, 68)'
            }
        };
    }

    chart.options.plugins.annotation.annotations = annotations;
    console.log('✅ 가격선 어노테이션 설정 완료:', Object.keys(annotations));
}

// Get Average Purchase Price from Account Balance
function getAveragePurchasePrice(stockCode) {
    if (!accountBalance || !accountBalance.output1) return null;

    const stock = accountBalance.output1.find(s => s.pdno === stockCode);
    if (stock && stock.hldg_qty && parseInt(stock.hldg_qty) > 0) {
        return parseFloat(stock.pchs_avg_pric);
    }

    return null;
}

// Get Stock Holdings Info (보유 수량 및 총 매수금액)
function getStockHoldings(stockCode) {
    if (!accountBalance || !accountBalance.output1) return null;

    const stock = accountBalance.output1.find(s => s.pdno === stockCode);
    if (stock && stock.hldg_qty && parseInt(stock.hldg_qty) > 0) {
        const avgPrice = parseFloat(stock.pchs_avg_pric);
        const quantity = parseInt(stock.hldg_qty);
        const totalPurchaseAmount = avgPrice * quantity;

        return {
            avgPrice,
            quantity,
            totalPurchaseAmount
        };
    }

    return null;
}

// Update Trading Info
function updateTradingInfo(stockCode, stockName, quoteData) {
    console.log('📊 매매 정보 업데이트:', { stockCode, stockName, quoteData });

    const holdings = getStockHoldings(stockCode);
    const currentPrice = quoteData.currentPrice || parseFloat(quoteData.stck_prpr || 0);

    console.log('💰 보유 정보:', holdings);

    let tradingInfoHTML = `
        <div class="space-y-3">
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span class="text-gray-600">현재가</span>
                <span class="text-xl font-bold">${currentPrice.toLocaleString()}원</span>
            </div>
    `;

    if (holdings) {
        const { avgPrice, quantity, totalPurchaseAmount } = holdings;
        const profitLoss = currentPrice - avgPrice;
        const profitLossPercent = ((profitLoss / avgPrice) * 100).toFixed(2);
        const profitLossColor = profitLoss >= 0 ? 'text-red-600' : 'text-blue-600';

        // 총 손익 (보유 수량 포함)
        const totalProfitLoss = profitLoss * quantity;
        const totalProfitLossPercent = profitLossPercent;

        tradingInfoHTML += `
            <div class="flex justify-between items-center p-3 bg-yellow-50 rounded">
                <span class="text-gray-600">평균 매수가</span>
                <span class="text-lg font-semibold">${avgPrice.toLocaleString()}원</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-yellow-100 rounded border border-yellow-300">
                <span class="text-gray-600 font-medium">총 매수금액 (${quantity}주)</span>
                <span class="text-lg font-bold text-yellow-700">${totalPurchaseAmount.toLocaleString()}원</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span class="text-gray-600">평가손익</span>
                <span class="text-lg font-bold ${profitLossColor}">
                    ${totalProfitLoss >= 0 ? '+' : ''}${totalProfitLoss.toLocaleString()}원 (${totalProfitLoss >= 0 ? '+' : ''}${totalProfitLossPercent}%)
                </span>
            </div>
        `;
    } else {
        tradingInfoHTML += `
            <div class="text-center text-gray-500 py-4">
                보유하지 않은 종목입니다
            </div>
        `;
    }

    tradingInfoHTML += '</div>';
    document.getElementById('tradingInfo').innerHTML = tradingInfoHTML;

    // 가격 설정 UI 업데이트
    updatePriceLevelsUI(holdings, currentPrice);
}

// Update Price Levels UI
function updatePriceLevelsUI(holdings, currentPrice) {
    const stopLossValue = stopLossPrice || '';
    const takeProfitValue = takeProfitPrice || '';

    console.log('🎨 가격 레벨 UI 업데이트:', {
        stopLossPrice,
        takeProfitPrice,
        stopLossValue,
        takeProfitValue,
        holdings
    });

    let html = `<div class="space-y-3">`;

    // 평단가와 총 매수금액 표시
    if (holdings) {
        const { avgPrice, quantity, totalPurchaseAmount } = holdings;

        html += `
            <div class="flex justify-between items-center p-3 bg-yellow-50 rounded">
                <span class="text-gray-600">평단가</span>
                <span class="text-lg font-semibold text-yellow-700">${avgPrice.toLocaleString()}원</span>
            </div>
            <div class="flex justify-between items-center p-3 bg-yellow-100 rounded border border-yellow-300">
                <span class="text-gray-600 text-sm">총 매수금액 (${quantity}주)</span>
                <span class="text-md font-bold text-yellow-700">${totalPurchaseAmount.toLocaleString()}원</span>
            </div>
        `;
    }

    // 손절가 설정
    html += `
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">손절가 설정</label>
            <div class="flex space-x-2 mb-2">
                <input type="number" id="stopLossInput" value="${stopLossValue}"
                       placeholder="손절가 입력"
                       oninput="updateStopLossPreview()"
                       class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                <button onclick="setStopLoss()" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    설정
                </button>
            </div>
            <div id="stopLossPreview" class="text-sm text-gray-600"></div>
        </div>
    `;

    // 손절가 설정 시 손익 표시
    if (stopLossPrice && holdings) {
        const { avgPrice, quantity } = holdings;
        const loss = stopLossPrice - avgPrice;
        const totalLoss = loss * quantity;
        const lossPercent = ((loss / avgPrice) * 100).toFixed(2);
        const lossColor = loss >= 0 ? 'text-red-600' : 'text-blue-600';

        html += `
            <div class="p-3 bg-blue-50 rounded border border-blue-200">
                <div class="text-xs text-gray-600 mb-1">손절 시 총 손익</div>
                <div class="font-semibold ${lossColor}">
                    ${totalLoss >= 0 ? '+' : ''}${totalLoss.toLocaleString()}원 (${loss >= 0 ? '+' : ''}${lossPercent}%)
                </div>
                <div class="text-xs text-gray-500 mt-1">주당 ${loss >= 0 ? '+' : ''}${loss.toLocaleString()}원 × ${quantity}주</div>
            </div>
        `;
    }

    // 익절가 설정
    html += `
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">익절가 설정</label>
            <div class="flex space-x-2 mb-2">
                <input type="number" id="takeProfitInput" value="${takeProfitValue}"
                       placeholder="익절가 입력"
                       oninput="updateTakeProfitPreview()"
                       class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                <button onclick="setTakeProfit()" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                    설정
                </button>
            </div>
            <div id="takeProfitPreview" class="text-sm text-gray-600"></div>
        </div>
    `;

    // 익절가 설정 시 수익 표시
    if (takeProfitPrice && holdings) {
        const { avgPrice, quantity } = holdings;
        const profit = takeProfitPrice - avgPrice;
        const totalProfit = profit * quantity;
        const profitPercent = ((profit / avgPrice) * 100).toFixed(2);
        const profitColor = profit >= 0 ? 'text-red-600' : 'text-blue-600';

        html += `
            <div class="p-3 bg-red-50 rounded border border-red-200">
                <div class="text-xs text-gray-600 mb-1">익절 시 총 수익</div>
                <div class="font-semibold ${profitColor}">
                    ${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()}원 (${profit >= 0 ? '+' : ''}${profitPercent}%)
                </div>
                <div class="text-xs text-gray-500 mt-1">주당 ${profit >= 0 ? '+' : ''}${profit.toLocaleString()}원 × ${quantity}주</div>
            </div>
        `;
    }

    // 초기화 버튼
    if (stopLossPrice || takeProfitPrice) {
        html += `
            <button onclick="clearPriceLevels()" class="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
                가격선 초기화
            </button>
        `;
    }

    html += '</div>';
    document.getElementById('priceLevels').innerHTML = html;
}

// Preview Stop Loss
window.updateStopLossPreview = function() {
    if (!currentStock) return;

    const holdings = getStockHoldings(currentStock.code);
    if (!holdings) return;

    const { avgPrice, quantity } = holdings;
    const value = parseFloat(document.getElementById('stopLossInput').value);
    const previewEl = document.getElementById('stopLossPreview');

    if (value && !isNaN(value)) {
        const loss = value - avgPrice;
        const totalLoss = loss * quantity;
        const lossPercent = ((loss / avgPrice) * 100).toFixed(2);
        const lossColor = loss >= 0 ? 'text-red-600' : 'text-blue-600';

        previewEl.innerHTML = `<span class="${lossColor}">총 ${totalLoss >= 0 ? '+' : ''}${totalLoss.toLocaleString()}원 (${loss >= 0 ? '+' : ''}${lossPercent}%)</span>`;
    } else {
        previewEl.innerHTML = '';
    }
}

// Preview Take Profit
window.updateTakeProfitPreview = function() {
    if (!currentStock) return;

    const holdings = getStockHoldings(currentStock.code);
    if (!holdings) return;

    const { avgPrice, quantity } = holdings;
    const value = parseFloat(document.getElementById('takeProfitInput').value);
    const previewEl = document.getElementById('takeProfitPreview');

    if (value && !isNaN(value)) {
        const profit = value - avgPrice;
        const totalProfit = profit * quantity;
        const profitPercent = ((profit / avgPrice) * 100).toFixed(2);
        const profitColor = profit >= 0 ? 'text-red-600' : 'text-blue-600';

        previewEl.innerHTML = `<span class="${profitColor}">총 ${totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString()}원 (${profit >= 0 ? '+' : ''}${profitPercent}%)</span>`;
    } else {
        previewEl.innerHTML = '';
    }
}

// Set Stop Loss
window.setStopLoss = function() {
    const value = parseFloat(document.getElementById('stopLossInput').value);
    if (value && !isNaN(value)) {
        stopLossPrice = value;

        // 종목별 저장소에 저장
        if (currentStock) {
            if (!priceLevels[currentStock.code]) {
                priceLevels[currentStock.code] = {};
            }
            priceLevels[currentStock.code].stopLoss = value;
            priceLevels[currentStock.code].takeProfit = takeProfitPrice;
        }

        updatePriceLines();
        chart.update();
        console.log('✅ 손절가 설정:', stopLossPrice, '종목:', currentStock?.code);

        // API에 저장
        if (currentStock) {
            savePriceLevelsToAPI(currentStock.code, currentStock.name, stopLossPrice, takeProfitPrice);

            const holdings = getStockHoldings(currentStock.code);
            const currentPrice = parseFloat(chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1].c);
            updatePriceLevelsUI(holdings, currentPrice);

            // Reload price level cards
            loadPriceLevelsCards();
        }
    }
}

// Set Take Profit
window.setTakeProfit = function() {
    const value = parseFloat(document.getElementById('takeProfitInput').value);
    if (value && !isNaN(value)) {
        takeProfitPrice = value;

        // 종목별 저장소에 저장
        if (currentStock) {
            if (!priceLevels[currentStock.code]) {
                priceLevels[currentStock.code] = {};
            }
            priceLevels[currentStock.code].stopLoss = stopLossPrice;
            priceLevels[currentStock.code].takeProfit = value;
        }

        updatePriceLines();
        chart.update();
        console.log('✅ 익절가 설정:', takeProfitPrice, '종목:', currentStock?.code);

        // API에 저장
        if (currentStock) {
            savePriceLevelsToAPI(currentStock.code, currentStock.name, stopLossPrice, takeProfitPrice);

            const holdings = getStockHoldings(currentStock.code);
            const currentPrice = parseFloat(chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1].c);
            updatePriceLevelsUI(holdings, currentPrice);

            // Reload price level cards
            loadPriceLevelsCards();
        }
    }
}

// Clear Price Levels
window.clearPriceLevels = function() {
    stopLossPrice = null;
    takeProfitPrice = null;

    // 종목별 저장소에서도 삭제
    if (currentStock && priceLevels[currentStock.code]) {
        delete priceLevels[currentStock.code];
    }

    updatePriceLines();
    chart.update();

    // API에서 삭제
    if (currentStock) {
        savePriceLevelsToAPI(currentStock.code, currentStock.name, null, null);

        const holdings = getStockHoldings(currentStock.code);
        const currentPrice = parseFloat(chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1].c);
        updatePriceLevelsUI(holdings, currentPrice);

        // Reload price level cards
        loadPriceLevelsCards();
    }
    console.log('✅ 가격선 초기화');
}

// Save Price Levels to API
async function savePriceLevelsToAPI(stockCode, stockName, stopLoss, takeProfit) {
    try {
        console.log('💾 가격 레벨 저장 API 호출:', stockCode, { stopLoss, takeProfit });

        if (stopLoss === null && takeProfit === null) {
            // 삭제
            const response = await fetch(`/api/stock/price-levels/${stockCode}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('가격 레벨 삭제 실패');
            }

            console.log('✅ 가격 레벨 삭제 성공');
        } else {
            // 저장/업데이트
            const response = await fetch('/api/stock/price-levels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    stockCode,
                    stockName,
                    stopLoss,
                    takeProfit
                })
            });

            if (!response.ok) {
                throw new Error('가격 레벨 저장 실패');
            }

            console.log('✅ 가격 레벨 저장 성공');
        }
    } catch (error) {
        console.error('❌ 가격 레벨 저장 실패:', error);
    }
}

// Load Price Levels from API
async function loadPriceLevelsFromAPI(stockCode) {
    try {
        console.log('🔍 가격 레벨 API 호출:', stockCode);
        const response = await fetch(`/api/stock/price-levels/${stockCode}`);

        console.log('📡 API 응답 상태:', response.status, response.ok);

        if (!response.ok) {
            console.log('⚠️ API 응답 실패:', response.status);
            return null;
        }

        const data = await response.json();
        console.log('📦 API 응답 데이터:', data);

        if (!data) {
            console.log('⚠️ 데이터 없음');
            return null;
        }

        const result = {
            stopLoss: data.stop_loss_price,
            takeProfit: data.take_profit_price
        };

        console.log('✅ 가격 레벨 파싱 결과:', result);
        return result;
    } catch (error) {
        console.error('❌ 가격 레벨 로드 실패:', error);
        return null;
    }
}

// Parse Date Helper
function parseDate(dateStr) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
}

// ============================================
// Price Levels Cards Functions
// ============================================

// Load all price levels and display as cards
async function loadPriceLevelsCards() {
    try {
        console.log('📊 가격 레벨 카드 로드 시작...');

        // Fetch all price levels from API
        const response = await fetch('/api/stock/price-levels');

        if (!response.ok) {
            throw new Error('Failed to fetch price levels');
        }

        const apiPriceLevels = await response.json();
        console.log('✅ 가격 레벨 로드 완료:', apiPriceLevels.length, '개');

        // 전역 priceLevels 객체에 저장 (종목별로)
        apiPriceLevels.forEach(level => {
            priceLevels[level.stock_code] = {
                stopLoss: level.stop_loss_price,
                takeProfit: level.take_profit_price
            };
        });

        console.log('💾 전역 priceLevels 저장 완료:', priceLevels);

        // Display cards
        displayPriceLevelsCards(apiPriceLevels);

    } catch (error) {
        console.error('❌ 가격 레벨 카드 로드 실패:', error);
        const container = document.getElementById('priceLevelsCardsContainer');
        if (container) {
            container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">가격 레벨을 불러오는데 실패했습니다.</div>';
        }
    }
}

// Display price levels as cards with mini charts
async function displayPriceLevelsCards(priceLevels) {
    const container = document.getElementById('priceLevelsCardsContainer');

    if (!container) return;

    if (!priceLevels || priceLevels.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-gray-500 py-8">설정된 손절가/익절가가 없습니다.</div>';
        return;
    }

    // Clear container
    container.innerHTML = '';

    // Create a card for each stock with price levels
    for (const level of priceLevels) {
        try {
            // Fetch current stock quote
            const quoteResponse = await fetch(`/api/stock/quote/${level.stock_code}`);
            const stockData = await quoteResponse.json();

            // Get holdings for this stock
            const holdings = getStockHoldings(level.stock_code);

            // Create card
            const card = createPriceLevelCard(level, stockData, holdings);
            container.appendChild(card);

        } catch (error) {
            console.error(`❌ ${level.stock_code} 카드 생성 실패:`, error);
        }
    }
}

// Create a single price level card
function createPriceLevelCard(level, stockData, holdings) {
    const card = document.createElement('div');
    card.className = 'bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow';

    // Current price
    const currentPrice = stockData.currentPrice || 0;
    const changeRate = stockData.changeRate || 0;
    const priceColor = changeRate >= 0 ? 'text-red-600' : 'text-blue-600';
    const changeSymbol = changeRate > 0 ? '+' : '';

    // Average price (if holdings exist)
    const avgPrice = holdings ? holdings.avgPrice : 0;
    const quantity = holdings ? holdings.quantity : 0;

    // Stop loss and take profit
    const stopLoss = level.stop_loss_price || 0;
    const takeProfit = level.take_profit_price || 0;

    // Entry reason and theme
    const entryReason = level.entry_reason || '';
    const theme = level.theme || '';

    // Calculate profit/loss percentages and amounts
    let stopLossPercent = 0;
    let takeProfitPercent = 0;
    let currentProfitPercent = 0;
    let stopLossAmount = 0;
    let takeProfitAmount = 0;

    if (avgPrice > 0) {
        if (stopLoss > 0) {
            stopLossPercent = ((stopLoss - avgPrice) / avgPrice * 100).toFixed(2);
            stopLossAmount = quantity > 0 ? (stopLoss - avgPrice) * quantity : 0;
        }
        if (takeProfit > 0) {
            takeProfitPercent = ((takeProfit - avgPrice) / avgPrice * 100).toFixed(2);
            takeProfitAmount = quantity > 0 ? (takeProfit - avgPrice) * quantity : 0;
        }
        currentProfitPercent = ((currentPrice - avgPrice) / avgPrice * 100).toFixed(2);
    }

    // Build card HTML - clickable card without mini chart
    card.innerHTML = `
        <div class="p-4 cursor-pointer hover:bg-gray-50 transition-colors" onclick="selectStockFromCard('${level.stock_code}', '${level.stock_name}')">
            <!-- Header Section -->
            <div class="mb-3">
                <h3 class="text-lg font-bold text-gray-900">${level.stock_name || level.stock_code}</h3>
                <span class="text-xs text-gray-500">${level.stock_code}</span>
            </div>

            <!-- Info Section -->
            <div>
                <!-- Header with current price -->
                <div class="mb-3">
                    <div class="text-sm text-gray-600 mb-1">현재가</div>
                    <div>
                        <span class="text-2xl font-bold ${priceColor}">${currentPrice.toLocaleString()}</span>
                        <span class="text-sm ${priceColor} ml-2">${changeSymbol}${changeRate}%</span>
                    </div>
                </div>

                <!-- Price levels info -->
                <div class="space-y-2 mb-3">
                    ${avgPrice > 0 ? `
                    <div class="flex justify-between items-center py-1 border-b border-gray-100">
                        <span class="text-sm text-gray-600">평단가</span>
                        <span class="text-sm font-semibold">${avgPrice.toLocaleString()}원</span>
                    </div>
                    ` : ''}

                    ${stopLoss > 0 ? `
                    <div class="flex justify-between items-center py-1 border-b border-gray-100">
                        <span class="text-sm text-blue-600">손절가</span>
                        <div class="text-right">
                            <div class="text-sm font-semibold text-blue-700">${stopLoss.toLocaleString()}원</div>
                            ${avgPrice > 0 ? `<div class="text-xs text-blue-600">${stopLossPercent >= 0 ? '+' : ''}${stopLossPercent}%</div>` : ''}
                            ${quantity > 0 && avgPrice > 0 ? `<div class="text-xs ${stopLossAmount >= 0 ? 'text-red-600' : 'text-blue-600'} mt-0.5">${stopLossAmount >= 0 ? '+' : ''}${stopLossAmount.toLocaleString()}원 (${quantity}주)</div>` : ''}
                        </div>
                    </div>
                    ` : ''}

                    ${takeProfit > 0 ? `
                    <div class="flex justify-between items-center py-1 border-b border-gray-100">
                        <span class="text-sm text-red-600">익절가</span>
                        <div class="text-right">
                            <div class="text-sm font-semibold text-red-700">${takeProfit.toLocaleString()}원</div>
                            ${avgPrice > 0 ? `<div class="text-xs text-red-600">${takeProfitPercent >= 0 ? '+' : ''}${takeProfitPercent}%</div>` : ''}
                            ${quantity > 0 && avgPrice > 0 ? `<div class="text-xs ${takeProfitAmount >= 0 ? 'text-red-600' : 'text-blue-600'} mt-0.5">${takeProfitAmount >= 0 ? '+' : ''}${takeProfitAmount.toLocaleString()}원 (${quantity}주)</div>` : ''}
                        </div>
                    </div>
                    ` : ''}
                </div>

                <!-- Entry reason -->
                <div class="mb-2">
                    <label class="text-xs text-gray-600 block mb-1">진입근거</label>
                    <textarea
                        id="entryReason_${level.stock_code}"
                        placeholder="진입 이유를 입력하세요..."
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        rows="4"
                        onclick="event.stopPropagation()"
                        onchange="updateEntryReasonAndTheme('${level.stock_code}')"
                    >${entryReason}</textarea>
                </div>

                <!-- Theme -->
                <div class="mb-3">
                    <label class="text-xs text-gray-600 block mb-1">테마</label>
                    <input
                        type="text"
                        id="theme_${level.stock_code}"
                        placeholder="테마를 입력하세요..."
                        value="${theme}"
                        class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        onclick="event.stopPropagation()"
                        onchange="updateEntryReasonAndTheme('${level.stock_code}')"
                    />
                </div>

                <!-- Buttons -->
                <div class="flex justify-end">
                    <button onclick="event.stopPropagation(); removePriceLevelCard('${level.stock_code}')"
                            class="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors">
                        삭제
                    </button>
                </div>
            </div>
        </div>
    `;

    return card;
}

// Draw mini chart showing price levels
function drawMiniChart(stockCode, currentPrice, avgPrice, stopLoss, takeProfit) {
    const canvas = document.getElementById(`miniChart_${stockCode}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Determine price range
    const prices = [currentPrice, avgPrice, stopLoss, takeProfit].filter(p => p > 0);
    if (prices.length === 0) return;

    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const priceRange = maxPrice - minPrice;

    // Chart configuration
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['', '', ''],
            datasets: [{
                label: '현재가',
                data: [currentPrice, currentPrice, currentPrice],
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                annotation: {
                    annotations: {
                        ...(avgPrice > 0 && {
                            avgPrice: {
                                type: 'line',
                                yMin: avgPrice,
                                yMax: avgPrice,
                                borderColor: 'rgb(156, 163, 175)',
                                borderWidth: 2,
                                borderDash: [5, 5],
                                label: {
                                    content: `평단: ${avgPrice.toLocaleString()}`,
                                    enabled: true,
                                    position: 'start',
                                    backgroundColor: 'rgb(156, 163, 175)',
                                    font: { size: 10 }
                                }
                            }
                        }),
                        ...(stopLoss > 0 && {
                            stopLoss: {
                                type: 'line',
                                yMin: stopLoss,
                                yMax: stopLoss,
                                borderColor: 'rgb(59, 130, 246)',
                                borderWidth: 2,
                                borderDash: [3, 3],
                                label: {
                                    content: `손절: ${stopLoss.toLocaleString()}`,
                                    enabled: true,
                                    position: 'end',
                                    backgroundColor: 'rgb(59, 130, 246)',
                                    font: { size: 10 }
                                }
                            }
                        }),
                        ...(takeProfit > 0 && {
                            takeProfit: {
                                type: 'line',
                                yMin: takeProfit,
                                yMax: takeProfit,
                                borderColor: 'rgb(239, 68, 68)',
                                borderWidth: 2,
                                borderDash: [3, 3],
                                label: {
                                    content: `익절: ${takeProfit.toLocaleString()}`,
                                    enabled: true,
                                    position: 'end',
                                    backgroundColor: 'rgb(239, 68, 68)',
                                    font: { size: 10 }
                                }
                            }
                        })
                    }
                }
            },
            scales: {
                x: { display: false },
                y: {
                    display: true,
                    min: minPrice,
                    max: maxPrice,
                    ticks: {
                        font: { size: 10 },
                        callback: (value) => value.toLocaleString()
                    }
                }
            }
        }
    });
}

// Note: selectStockFromCard is defined earlier in the file (around line 347-359)
// This duplicate definition has been removed to avoid overriding the async version

// Remove price level card
window.removePriceLevelCard = async function(stockCode) {
    if (!confirm('이 종목의 손절가/익절가 설정을 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/stock/price-levels/${stockCode}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            console.log('✅ 가격 레벨 삭제 완료:', stockCode);

            // Reload cards
            await loadPriceLevelsCards();

            // If currently viewing this stock, clear price lines
            if (currentStock && currentStock.code === stockCode) {
                stopLossPrice = null;
                takeProfitPrice = null;
                updatePriceLines();
                if (chart) {
                    chart.update();
                }

                const holdings = getStockHoldings(currentStock.code);
                const currentPrice = parseFloat(chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1].c);
                updatePriceLevelsUI(holdings, currentPrice);
            }
        } else {
            throw new Error('Failed to delete price level');
        }
    } catch (error) {
        console.error('❌ 가격 레벨 삭제 실패:', error);
        alert('가격 레벨 삭제에 실패했습니다.');
    }
};

// Update entry reason and theme
window.updateEntryReasonAndTheme = async function(stockCode) {
    try {
        const entryReason = document.getElementById(`entryReason_${stockCode}`).value;
        const theme = document.getElementById(`theme_${stockCode}`).value;

        console.log('💾 진입근거/테마 업데이트:', stockCode, { entryReason, theme });

        // Get current price levels
        const levelResponse = await fetch(`/api/stock/price-levels/${stockCode}`);
        if (!levelResponse.ok) {
            throw new Error('Failed to fetch current price levels');
        }

        const currentLevel = await levelResponse.json();

        // Update with new entry reason and theme
        const response = await fetch('/api/stock/price-levels', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                stockCode: stockCode,
                stockName: currentLevel.stock_name,
                stopLoss: currentLevel.stop_loss_price,
                takeProfit: currentLevel.take_profit_price,
                entryReason: entryReason,
                theme: theme
            })
        });

        if (response.ok) {
            console.log('✅ 진입근거/테마 저장 완료');
        } else {
            throw new Error('Failed to save entry reason and theme');
        }

    } catch (error) {
        console.error('❌ 진입근거/테마 저장 실패:', error);
    }
};
