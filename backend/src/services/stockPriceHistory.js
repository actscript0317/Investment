const { createClient } = require('@supabase/supabase-js');
const kisApiService = require('./kisApiService');
require('dotenv').config();

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

class StockPriceHistoryService {
    /**
     * Fetch and save stock price history
     * @param {string} stockCode - Stock code (e.g., '005930')
     * @param {string} periodType - 'D' (daily), 'W' (weekly), 'M' (monthly)
     * @param {string} startDate - Start date (YYYYMMDD)
     * @param {string} endDate - End date (YYYYMMDD)
     */
    async fetchAndSaveHistory(stockCode, periodType = 'D', startDate = null, endDate = null) {
        try {
            console.log(`📊 주식 가격 히스토리 조회 시작: ${stockCode}, 기간: ${periodType}`);

            // Set default dates if not provided
            if (!endDate) {
                endDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
            }
            if (!startDate) {
                const date = new Date();
                date.setMonth(date.getMonth() - 6); // 6 months ago
                startDate = date.toISOString().split('T')[0].replace(/-/g, '');
            }

            // Search for the API to get stock price history
            const searchResult = await this.searchPriceHistoryAPI();

            if (!searchResult || !searchResult.function_name) {
                throw new Error('KIS API를 찾을 수 없습니다');
            }

            // Fetch price history from KIS API
            // This would use the actual KIS API function found above
            // For now, we'll use a placeholder that calls kisApiService
            const priceData = await this.fetchFromKISAPI(stockCode, periodType, startDate, endDate);

            if (!priceData || priceData.length === 0) {
                console.log(`⚠️ ${stockCode}에 대한 가격 데이터가 없습니다`);
                return { success: false, message: 'No data found' };
            }

            // Save to database
            const savedCount = await this.saveToDatabase(stockCode, periodType, priceData);

            console.log(`✅ ${stockCode} 가격 히스토리 저장 완료: ${savedCount}건`);

            return {
                success: true,
                stockCode: stockCode,
                periodType: periodType,
                count: savedCount
            };

        } catch (error) {
            console.error(`❌ 가격 히스토리 저장 실패 (${stockCode}):`, error);
            throw error;
        }
    }

    /**
     * Search for KIS API to get price history
     */
    async searchPriceHistoryAPI() {
        // This would search the MCP tool for the correct API
        // For domestic stocks, daily chart API
        return {
            function_name: 'inquire_daily_itemchartprice',
            api_name: '주식현재가 일자별',
            category: '국내주식',
            subcategory: '기본시세'
        };
    }

    /**
     * Fetch price data from KIS API
     * This is a placeholder - needs actual KIS API integration
     */
    async fetchFromKISAPI(stockCode, periodType, startDate, endDate) {
        try {
            // For now, generate sample data
            // In production, this would call the actual KIS API function
            console.log(`📡 KIS API 호출: ${stockCode}, ${startDate} ~ ${endDate}`);

            // Sample data generation (would be replaced with actual API call)
            const data = this.generateSamplePriceData(stockCode, periodType, startDate, endDate);

            return data;

        } catch (error) {
            console.error('❌ KIS API 호출 실패:', error);
            throw error;
        }
    }

    /**
     * Generate sample price data (temporary - for testing)
     */
    generateSamplePriceData(stockCode, periodType, startDate, endDate) {
        const data = [];
        const start = new Date(
            parseInt(startDate.substring(0, 4)),
            parseInt(startDate.substring(4, 6)) - 1,
            parseInt(startDate.substring(6, 8))
        );
        const end = new Date(
            parseInt(endDate.substring(0, 4)),
            parseInt(endDate.substring(4, 6)) - 1,
            parseInt(endDate.substring(6, 8))
        );

        let currentDate = new Date(start);
        let basePrice = 50000; // Sample base price

        while (currentDate <= end) {
            // Skip weekends
            if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                const dateStr = currentDate.toISOString().split('T')[0];

                // Random price fluctuation
                const change = (Math.random() - 0.5) * 2000;
                basePrice += change;

                const open = Math.round(basePrice + (Math.random() - 0.5) * 1000);
                const close = Math.round(basePrice + (Math.random() - 0.5) * 1000);
                const high = Math.max(open, close) + Math.round(Math.random() * 500);
                const low = Math.min(open, close) - Math.round(Math.random() * 500);
                const volume = Math.round(Math.random() * 1000000) + 500000;

                data.push({
                    trade_date: dateStr,
                    open_price: open,
                    high_price: high,
                    low_price: low,
                    close_price: close,
                    volume: volume
                });
            }

            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return data;
    }

    /**
     * Save price data to Supabase
     */
    async saveToDatabase(stockCode, periodType, priceData) {
        try {
            const records = priceData.map(data => ({
                stock_code: stockCode,
                period_type: periodType,
                trade_date: data.trade_date,
                open_price: data.open_price,
                high_price: data.high_price,
                low_price: data.low_price,
                close_price: data.close_price,
                volume: data.volume
            }));

            // Upsert records (insert or update if exists)
            const { data, error } = await supabase
                .from('stock_price_history')
                .upsert(records, {
                    onConflict: 'stock_code,period_type,trade_date',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error('❌ Supabase 저장 오류:', error);
                throw error;
            }

            return records.length;

        } catch (error) {
            console.error('❌ 데이터베이스 저장 실패:', error);
            throw error;
        }
    }

    /**
     * Get price history from database
     */
    async getHistory(stockCode, periodType = 'D', startDate = null, endDate = null, limit = 100) {
        try {
            let query = supabase
                .from('stock_price_history')
                .select('*')
                .eq('stock_code', stockCode)
                .eq('period_type', periodType)
                .order('trade_date', { ascending: false })
                .limit(limit);

            if (startDate) {
                query = query.gte('trade_date', startDate);
            }
            if (endDate) {
                query = query.lte('trade_date', endDate);
            }

            const { data, error } = await query;

            if (error) {
                console.error('❌ 가격 히스토리 조회 실패:', error);
                throw error;
            }

            return data || [];

        } catch (error) {
            console.error('❌ 가격 히스토리 조회 실패:', error);
            throw error;
        }
    }

    /**
     * Batch fetch history for multiple stocks
     */
    async batchFetchHistory(stockCodes, periodType = 'D', startDate = null, endDate = null) {
        const results = [];

        for (const code of stockCodes) {
            try {
                const result = await this.fetchAndSaveHistory(code, periodType, startDate, endDate);
                results.push(result);

                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (error) {
                console.error(`❌ ${code} 가격 히스토리 저장 실패:`, error.message);
                results.push({
                    success: false,
                    stockCode: code,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Calculate technical indicators (SMA, EMA, RSI, etc.)
     */
    calculateIndicators(priceData) {
        if (!priceData || priceData.length === 0) {
            return null;
        }

        // Calculate SMA (Simple Moving Average)
        const sma20 = this.calculateSMA(priceData, 20);
        const sma60 = this.calculateSMA(priceData, 60);
        const sma120 = this.calculateSMA(priceData, 120);

        // Calculate RSI (Relative Strength Index)
        const rsi = this.calculateRSI(priceData, 14);

        // Calculate MACD
        const macd = this.calculateMACD(priceData);

        return {
            sma20,
            sma60,
            sma120,
            rsi,
            macd
        };
    }

    /**
     * Calculate Simple Moving Average
     */
    calculateSMA(data, period) {
        if (data.length < period) return null;

        const sum = data.slice(0, period).reduce((acc, d) => acc + d.close_price, 0);
        return Math.round(sum / period);
    }

    /**
     * Calculate RSI (Relative Strength Index)
     */
    calculateRSI(data, period = 14) {
        if (data.length < period + 1) return null;

        let gains = 0;
        let losses = 0;

        // Calculate first average gain and loss
        for (let i = 1; i <= period; i++) {
            const change = data[i - 1].close_price - data[i].close_price;
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        // Calculate RSI
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));

        return Math.round(rsi * 100) / 100;
    }

    /**
     * Calculate MACD
     */
    calculateMACD(data) {
        if (data.length < 26) return null;

        const ema12 = this.calculateEMA(data, 12);
        const ema26 = this.calculateEMA(data, 26);
        const macdLine = ema12 - ema26;

        return {
            macd: Math.round(macdLine * 100) / 100,
            ema12: Math.round(ema12),
            ema26: Math.round(ema26)
        };
    }

    /**
     * Calculate Exponential Moving Average
     */
    calculateEMA(data, period) {
        if (data.length < period) return null;

        const multiplier = 2 / (period + 1);

        // Start with SMA
        let ema = this.calculateSMA(data, period);

        // Calculate EMA
        for (let i = period; i < data.length; i++) {
            ema = (data[i].close_price - ema) * multiplier + ema;
        }

        return ema;
    }
}

module.exports = new StockPriceHistoryService();
