// Returns Page JavaScript
let currentPeriod = 'daily'; // daily, weekly, monthly
let currentRange = 1; // months
let returnsChart = null;
let allTransactions = [];
const BASE_CAPITAL = 4000000; // Fixed Base Capital: 4,000,000 KRW
let currentTotalAssets = 0; // Will be fetched from API

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadReturnsData();
});

// Setup Event Listeners
function setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Period buttons
    document.getElementById('dailyBtn').addEventListener('click', () => {
        switchPeriod('daily');
    });
    document.getElementById('weeklyBtn').addEventListener('click', () => {
        switchPeriod('weekly');
    });
    document.getElementById('monthlyBtn').addEventListener('click', () => {
        switchPeriod('monthly');
    });

    // Range buttons
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const range = parseInt(e.target.dataset.range);
            switchRange(range);
        });
    });
}

// Switch Period
function switchPeriod(period) {
    currentPeriod = period;

    // Update button styles
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-brand-blue', 'text-dark-bg', 'shadow-lg');
        btn.classList.add('text-text-sub', 'hover:text-text-main');
    });

    const activeBtn = document.getElementById(`${period}Btn`);
    activeBtn.classList.remove('text-text-sub', 'hover:text-text-main');
    activeBtn.classList.add('active', 'bg-brand-blue', 'text-dark-bg', 'shadow-lg');

    // Update titles
    const periodText = period === 'daily' ? '일별' : period === 'weekly' ? '주간별' : '월별';
    document.getElementById('tableTitle').textContent = `${periodText} 상세 내역`;
    document.getElementById('chartTitle').textContent = `${periodText} 자본 추이 그래프`;

    // Update data display
    updateDisplay();
}

// Switch Range
function switchRange(range) {
    currentRange = range;

    // Update button styles
    document.querySelectorAll('.range-btn').forEach(btn => {
        btn.classList.remove('active', 'bg-brand-gold', 'text-dark-bg');
        btn.classList.add('bg-dark-bg', 'border', 'border-gray-700', 'text-text-sub', 'hover:border-gray-500');
    });

    event.target.classList.remove('bg-dark-bg', 'border', 'border-gray-700', 'text-text-sub', 'hover:border-gray-500');
    event.target.classList.add('active', 'bg-brand-gold', 'text-dark-bg');

    // Update data display
    updateDisplay();
}

// Load Returns Data
async function loadReturnsData() {
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const tableContainer = document.getElementById('tableContainer');

    loadingState.classList.remove('hidden');
    emptyState.classList.add('hidden');
    tableContainer.classList.add('hidden');

    try {
        // 1. Fetch Current Balance to get Total Assets
        const balanceResponse = await fetch('/api/account/balance');
        if (!balanceResponse.ok) {
            throw new Error('Failed to fetch account balance');
        }
        const balanceData = await balanceResponse.json();

        if (balanceData.output2 && balanceData.output2.length > 0) {
            currentTotalAssets = parseFloat(balanceData.output2[0].tot_evlu_amt);
            console.log(`💰 현재 총 자산: ${currentTotalAssets.toLocaleString()}원`);
        } else {
            console.warn('⚠️ 자산 정보를 찾을 수 없습니다.');
            currentTotalAssets = BASE_CAPITAL; // Fallback
        }

        // 2. Get transaction history for the past 1 year
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);

        const startDateStr = formatDateForAPI(startDate);
        const endDateStr = formatDateForAPI(endDate);

        console.log(`📊 수익률 데이터 조회: ${startDateStr} ~ ${endDateStr}`);

        const response = await fetch(`/api/account/transactions?startDate=${startDateStr}&endDate=${endDateStr}`);

        if (!response.ok) {
            throw new Error('Failed to fetch transaction data');
        }

        const data = await response.json();

        loadingState.classList.add('hidden');

        if (data.output1 && data.output1.length > 0) {
            allTransactions = processTransactions(data.output1);
            console.log('Processed transactions:', allTransactions);

            updateDisplay();

            tableContainer.classList.remove('hidden');
        } else {
            emptyState.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Returns data loading error:', error);
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');

        // Show error message
        document.getElementById('emptyState').innerHTML = `
            <div class="text-6xl mb-4">❌</div>
            <p class="text-xl text-red-600">데이터를 불러오는데 실패했습니다</p>
            <p class="text-gray-600 mt-2">${error.message}</p>
        `;
    }
}

// Process Transactions
function processTransactions(rawTransactions) {
    // Group transactions by date first
    const groupedByDate = {};

    rawTransactions.forEach(tx => {
        const date = tx.trad_dt;
        const sellAmount = parseFloat(tx.sll_amt || 0);
        const buyAmount = parseFloat(tx.buy_amt || 0);
        const profitLoss = parseFloat(tx.rlzt_pfls || 0);

        if (!groupedByDate[date]) {
            groupedByDate[date] = {
                date: date,
                totalBuyAmount: 0,
                totalSellAmount: 0,
                totalProfit: 0,
                hasSell: false
            };
        }

        // Accumulate data for the date
        groupedByDate[date].totalBuyAmount += buyAmount;
        groupedByDate[date].totalSellAmount += sellAmount;
        groupedByDate[date].totalProfit += profitLoss;

        if (sellAmount > 0) {
            groupedByDate[date].hasSell = true;
        }
    });

    // Convert to array and filter
    const processedTransactions = Object.values(groupedByDate)
        .filter(item => item.hasSell) // Only include dates with actual sells
        .map(item => ({
            date: item.date,
            buyAmount: item.totalBuyAmount,
            sellAmount: item.totalSellAmount,
            profitLoss: item.totalProfit,
            profitLossRate: item.totalBuyAmount > 0 ? (item.totalProfit / item.totalBuyAmount) * 100 : 0,
            isProfit: item.totalProfit >= 0
        }));

    // Sort by date ascending
    return processedTransactions.sort((a, b) => a.date.localeCompare(b.date));
}

// Update Display
function updateDisplay() {
    if (allTransactions.length === 0) return;

    // Filter transactions by range
    const filteredTransactions = filterTransactionsByRange(allTransactions, currentRange);
    console.log(`📊 Filtered ${filteredTransactions.length} transactions for ${currentRange} months`);

    // Group by period
    const periodData = groupDataByPeriod(filteredTransactions, currentPeriod);
    console.log(`📊 Grouped into ${periodData.length} ${currentPeriod} periods`);

    // Calculate cumulative data
    const dataWithCumulative = calculateCumulativeData(periodData);

    // Update table
    updateTable(dataWithCumulative);

    // Update chart
    updateChart(dataWithCumulative);
}

// Filter Transactions by Range
function filterTransactionsByRange(transactions, months) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const startDateStr = formatDateForAPI(startDate);
    const endDateStr = formatDateForAPI(endDate);

    return transactions.filter(tx => {
        return tx.date >= startDateStr && tx.date <= endDateStr;
    });
}

// Group Data by Period
function groupDataByPeriod(transactions, period) {
    const grouped = {};

    transactions.forEach(tx => {
        let key;
        const date = tx.date; // YYYYMMDD

        if (period === 'daily') {
            key = date; // YYYYMMDD
        } else if (period === 'weekly') {
            // Group by week (Monday as start of week)
            const dateObj = parseDate(date);
            const weekStart = getWeekStart(dateObj);
            key = formatDateForAPI(weekStart);
        } else if (period === 'monthly') {
            key = date.substring(0, 6); // YYYYMM
        }

        if (!grouped[key]) {
            grouped[key] = {
                period: key,
                transactions: [],
                totalProfit: 0,
                totalBuyAmount: 0,
                profitTrades: 0,
                totalTrades: 0
            };
        }

        grouped[key].transactions.push(tx);
        grouped[key].totalProfit += tx.profitLoss;
        grouped[key].totalBuyAmount += tx.buyAmount;
        grouped[key].totalTrades++;
        if (tx.isProfit) {
            grouped[key].profitTrades++;
        }
    });

    // Convert to array and calculate return rate
    return Object.values(grouped).map(item => {
        item.returnRate = item.totalBuyAmount > 0 ? (item.totalProfit / item.totalBuyAmount) * 100 : 0;
        item.winRate = item.totalTrades > 0 ? (item.profitTrades / item.totalTrades) * 100 : 0;
        return item;
    }).sort((a, b) => a.period.localeCompare(b.period));
}

// Get Week Start (Monday)
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
}

// Calculate Cumulative Data
function calculateCumulativeData(periodData) {
    // 1. Calculate total profit over the entire displayed period
    const totalProfitInPeriod = periodData.reduce((sum, item) => sum + item.totalProfit, 0);

    // 2. Determine Start Capital
    // Start Capital = Current Total Assets - Total Profit in Period
    // This ensures the graph ends at the Current Total Assets
    let startCapital = currentTotalAssets - totalProfitInPeriod;

    // Safety check
    if (startCapital <= 0) {
        console.warn('⚠️ Calculated start capital is <= 0, using fallback.');
        startCapital = BASE_CAPITAL;
    }

    console.log(`💰 Capital Calculation: Current=${currentTotalAssets}, Profit=${totalProfitInPeriod}, Start=${startCapital}`);

    let cumulativeProfit = 0;

    return periodData.map(item => {
        cumulativeProfit += item.totalProfit;

        // Total Capital at this point (Historical)
        const totalCapital = startCapital + cumulativeProfit;

        // Cumulative Return Rate based on Fixed Base Capital (4,000,000 KRW)
        // Formula: (Current Capital - Base Capital) / Base Capital * 100
        const cumulativeReturnRate = ((totalCapital - BASE_CAPITAL) / BASE_CAPITAL) * 100;

        return {
            ...item,
            cumulativeProfit: cumulativeProfit,
            cumulativeReturnRate: cumulativeReturnRate,
            totalCapital: totalCapital
        };
    });
}

// Update Chart
function updateChart(periodData) {
    const ctx = document.getElementById('returnsChart').getContext('2d');

    // Destroy previous chart if exists
    if (returnsChart) {
        returnsChart.destroy();
    }

    // Prepare data
    const labels = periodData.map(item => formatPeriodLabel(item.period, currentPeriod));
    const capitalData = periodData.map(item => item.totalCapital);

    // Find min and max for better scaling
    const minCapital = Math.min(...capitalData, BASE_CAPITAL);
    const maxCapital = Math.max(...capitalData, BASE_CAPITAL);
    const padding = (maxCapital - minCapital) * 0.1;

    // Create capital growth chart
    returnsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '총 자본 (원)',
                    data: capitalData,
                    borderColor: '#66FCF1', // brand-blue
                    backgroundColor: 'rgba(102, 252, 241, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#0B0C10', // dark-bg
                    pointBorderColor: '#66FCF1',
                    pointBorderWidth: 2
                },
                {
                    label: `기준 자본 (${BASE_CAPITAL.toLocaleString()}원)`,
                    data: new Array(capitalData.length).fill(BASE_CAPITAL),
                    borderColor: 'rgba(176, 176, 176, 0.3)', // text-sub with opacity
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#B0B0B0', // text-sub
                        font: {
                            family: 'Inter',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: '#1F2833', // dark-card
                    titleColor: '#FFFFFF',
                    bodyColor: '#B0B0B0',
                    borderColor: '#333',
                    borderWidth: 1,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label = label.split('(')[0].trim() + ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString() + '원';

                                // For capital line, also show profit/loss from base
                                if (context.datasetIndex === 0) {
                                    const profit = context.parsed.y - BASE_CAPITAL;
                                    label += ` (${profit >= 0 ? '+' : ''}${profit.toLocaleString()}원)`;
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: false
                    },
                    min: minCapital - padding,
                    max: maxCapital + padding,
                    ticks: {
                        color: '#B0B0B0', // text-sub
                        callback: function (value) {
                            return (value / 10000).toLocaleString() + '만';
                        },
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#B0B0B0', // text-sub
                        font: {
                            family: 'Inter',
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

// Update Table
function updateTable(periodData) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    if (periodData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-8 py-12 text-center text-text-sub text-base">
                    데이터가 없습니다
                </td>
            </tr>
        `;
        return;
    }

    // Sort by period descending (most recent first)
    const sortedData = [...periodData].sort((a, b) => b.period.localeCompare(a.period));

    sortedData.forEach(item => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-800 transition-colors border-b border-gray-800';

        const returnClass = item.returnRate >= 0 ? 'text-neon-up' : 'text-neon-down';
        const profitClass = item.totalProfit >= 0 ? 'text-neon-up' : 'text-neon-down';
        const cumulativeProfitClass = item.cumulativeProfit >= 0 ? 'text-neon-up' : 'text-neon-down';
        const cumulativeReturnClass = item.cumulativeReturnRate >= 0 ? 'text-neon-up' : 'text-neon-down';

        row.innerHTML = `
            <td class="py-4 text-xs font-medium text-text-main">
                ${formatPeriodLabel(item.period, currentPeriod)}
            </td>
            <td class="py-4 text-xs font-bold ${returnClass} text-right">
                ${item.returnRate >= 0 ? '+' : ''}${item.returnRate.toFixed(2)}%
            </td>
            <td class="py-4 text-xs font-bold ${profitClass} text-right">
                ${item.totalProfit >= 0 ? '+' : ''}${item.totalProfit.toLocaleString()}
            </td>
            <td class="py-4 text-xs font-bold ${cumulativeProfitClass} text-right">
                ${item.cumulativeProfit >= 0 ? '+' : ''}${item.cumulativeProfit.toLocaleString()}
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// Format Period Label
function formatPeriodLabel(period, periodType) {
    if (periodType === 'daily') {
        // YYYYMMDD -> YYYY.MM.DD
        return `${period.substring(0, 4)}.${period.substring(4, 6)}.${period.substring(6, 8)}`;
    } else if (periodType === 'weekly') {
        // YYYYMMDD -> YYYY.MM.DD 주
        const endDate = new Date(parseDate(period));
        endDate.setDate(endDate.getDate() + 6);
        const endDateStr = formatDateForAPI(endDate);
        return `${period.substring(0, 4)}.${period.substring(4, 6)}.${period.substring(6, 8)} ~ ${endDateStr.substring(4, 6)}.${endDateStr.substring(6, 8)}`;
    } else if (periodType === 'monthly') {
        // YYYYMM -> YYYY년 MM월
        return `${period.substring(0, 4)}년 ${period.substring(4, 6)}월`;
    }
    return period;
}

// Parse Date from YYYYMMDD string
function parseDate(dateStr) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
}

// Format Date for API (YYYYMMDD)
function formatDateForAPI(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}
