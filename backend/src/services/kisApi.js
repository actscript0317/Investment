const axios = require('axios');
require('dotenv').config();

class KISApiClient {
  constructor() {
    this.appKey = process.env.KIS_APP_KEY;
    this.appSecret = process.env.KIS_APP_SECRET;
    this.baseUrl = process.env.KIS_BASE_URL || 'https://openapivts.koreainvestment.com:29443'; // 모의투자 기본값
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Access Token 발급
   */
  async getAccessToken() {
    // 토큰이 유효하면 재사용
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/oauth2/tokenP`, {
        grant_type: 'client_credentials',
        appkey: this.appKey,
        appsecret: this.appSecret
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      this.accessToken = response.data.access_token;
      // 토큰 유효기간 설정 (24시간 - 1시간 여유)
      this.tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000);

      return this.accessToken;
    } catch (error) {
      console.error('Access Token 발급 실패:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 웹소켓 접속키 발급
   */
  async getWebSocketApprovalKey() {
    try {
      const response = await axios.post(`${this.baseUrl}/oauth2/Approval`, {
        grant_type: 'client_credentials',
        appkey: this.appKey,
        secretkey: this.appSecret
      }, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        }
      });

      return response.data.approval_key;
    } catch (error) {
      console.error('웹소켓 접속키 발급 실패:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 주식 현재가 시세 조회
   * @param {string} stockCode - 종목코드 (ex: 005930)
   * @param {string} marketCode - 시장구분코드 (J: KRX, NX: NXT, UN: 통합)
   */
  async getStockPrice(stockCode, marketCode = 'J') {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'authorization': `Bearer ${token}`,
            'appkey': this.appKey,
            'appsecret': this.appSecret,
            'tr_id': 'FHKST01010100',
            'custtype': 'P' // P: 개인
          },
          params: {
            FID_COND_MRKT_DIV_CODE: marketCode,
            FID_INPUT_ISCD: stockCode
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('주식 현재가 조회 실패:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 국내주식 기간별 시세 조회 (차트 데이터)
   * @param {string} stockCode - 종목코드 (ex: 005930)
   * @param {string} startDate - 시작일자 (YYYYMMDD)
   * @param {string} endDate - 종료일자 (YYYYMMDD)
   * @param {string} period - 기간분류 (D: 일봉, W: 주봉, M: 월봉, Y: 년봉)
   * @param {string} priceType - 가격유형 (0: 수정주가, 1: 원주가)
   * @param {string} marketCode - 시장구분코드 (J: KRX, NX: NXT, UN: 통합)
   */
  async getStockChart(stockCode, startDate, endDate, period = 'D', priceType = '0', marketCode = 'J') {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'authorization': `Bearer ${token}`,
            'appkey': this.appKey,
            'appsecret': this.appSecret,
            'tr_id': 'FHKST03010100',
            'custtype': 'P' // P: 개인
          },
          params: {
            FID_COND_MRKT_DIV_CODE: marketCode,
            FID_INPUT_ISCD: stockCode,
            FID_INPUT_DATE_1: startDate,
            FID_INPUT_DATE_2: endDate,
            FID_PERIOD_DIV_CODE: period,
            FID_ORG_ADJ_PRC: priceType
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('차트 데이터 조회 실패:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 주식 잔고 조회
   * @param {string} accountNumber - 계좌번호 (ex: 50111234-01)
   * @returns {Object} 잔고 정보
   */
  async getAccountBalance(accountNumber) {
    try {
      const token = await this.getAccessToken();

      // 계좌번호를 앞 8자리와 뒤 2자리로 분리
      const [cano, acntPrdtCd] = accountNumber.split('-');

      // 모의투자면 VTTC8434R, 실전이면 TTTC8434R
      const trId = this.baseUrl.includes('vts') ? 'VTTC8434R' : 'TTTC8434R';

      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/trading/inquire-balance`,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'authorization': `Bearer ${token}`,
            'appkey': this.appKey,
            'appsecret': this.appSecret,
            'tr_id': trId,
            'custtype': 'P' // P: 개인
          },
          params: {
            CANO: cano,
            ACNT_PRDT_CD: acntPrdtCd,
            AFHR_FLPR_YN: 'N', // 시간외단일가여부 (N: 기본값)
            OFL_YN: '', // 오프라인여부
            INQR_DVSN: '02', // 조회구분 (01: 대출일별, 02: 종목별)
            UNPR_DVSN: '01', // 단가구분 (01: 기본값)
            FUND_STTL_ICLD_YN: 'N', // 펀드결제분포함여부
            FNCG_AMT_AUTO_RDPT_YN: 'N', // 융자금액자동상환여부
            PRCS_DVSN: '01', // 처리구분 (00: 전일, 01: 금일)
            CTX_AREA_FK100: '', // 연속조회검색조건100
            CTX_AREA_NK100: '' // 연속조회키100
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('주식 잔고 조회 실패:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 주식 일별 주문 체결 조회 (거래내역)
   * @param {string} accountNumber - 계좌번호 (ex: 50111234-01)
   * @param {string} startDate - 시작일자 (YYYYMMDD)
   * @param {string} endDate - 종료일자 (YYYYMMDD)
   * @returns {Object} 거래내역 정보
   */
  async getTransactionHistory(accountNumber, startDate, endDate) {
    try {
      const token = await this.getAccessToken();

      // 계좌번호를 앞 8자리와 뒤 2자리로 분리
      const [cano, acntPrdtCd] = accountNumber.split('-');

      // 모의투자면 VTTC8001R, 실전이면 TTTC8001R
      const trId = this.baseUrl.includes('vts') ? 'VTTC8001R' : 'TTTC8001R';

      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/trading/inquire-daily-ccld`,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'authorization': `Bearer ${token}`,
            'appkey': this.appKey,
            'appsecret': this.appSecret,
            'tr_id': trId,
            'custtype': 'P' // P: 개인
          },
          params: {
            CANO: cano,
            ACNT_PRDT_CD: acntPrdtCd,
            INQR_STRT_DT: startDate,
            INQR_END_DT: endDate,
            SLL_BUY_DVSN_CD: '00', // 매도매수구분 (00: 전체, 01: 매도, 02: 매수)
            INQR_DVSN: '00', // 조회구분 (00: 역순, 01: 정순)
            PDNO: '', // 상품번호 (종목코드)
            CCLD_DVSN: '00', // 체결구분 (00: 전체, 01: 체결, 02: 미체결)
            ORD_GNO_BRNO: '', // 주문채번지점번호
            ODNO: '', // 주문번호
            INQR_DVSN_3: '00', // 조회구분3
            INQR_DVSN_1: '', // 조회구분1
            CTX_AREA_FK100: '', // 연속조회검색조건100
            CTX_AREA_NK100: '' // 연속조회키100
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('거래내역 조회 실패:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 매수 가능 금액 조회
   * @param {string} accountNumber - 계좌번호 (ex: 50111234-01)
   * @param {string} stockCode - 종목코드
   * @param {number} price - 주문가격
   * @returns {Object} 매수가능금액 정보
   */
  async getBuyingPower(accountNumber, stockCode, price) {
    try {
      const token = await this.getAccessToken();

      // 계좌번호를 앞 8자리와 뒤 2자리로 분리
      const [cano, acntPrdtCd] = accountNumber.split('-');

      // 모의투자면 VTTC8908R, 실전이면 TTTC8908R
      const trId = this.baseUrl.includes('vts') ? 'VTTC8908R' : 'TTTC8908R';

      const response = await axios.get(
        `${this.baseUrl}/uapi/domestic-stock/v1/trading/inquire-psbl-order`,
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'authorization': `Bearer ${token}`,
            'appkey': this.appKey,
            'appsecret': this.appSecret,
            'tr_id': trId,
            'custtype': 'P' // P: 개인
          },
          params: {
            CANO: cano,
            ACNT_PRDT_CD: acntPrdtCd,
            PDNO: stockCode,
            ORD_UNPR: price.toString(),
            ORD_DVSN: '00', // 주문구분 (00: 지정가)
            CMA_EVLU_AMT_ICLD_YN: 'Y', // CMA평가금액포함여부
            OVRS_ICLD_YN: 'N' // 해외포함여부
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('매수가능금액 조회 실패:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new KISApiClient();
