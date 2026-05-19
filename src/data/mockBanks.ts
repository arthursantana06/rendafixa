// ============================================================
// MOCK DATA - Brazilian Banks for Simulation
// 
// PLACEHOLDER: Replace this with real data from:
// - BACEN IF.data API (https://www3.bcb.gov.br/ifdata/)
// - CSV file upload
// - Custom API endpoint
// ============================================================

import type { BankData } from '@/types';

/**
 * Fetches bank data from the configured data source.
 * 
 * TODO: Replace with real API integration:
 * - GET https://api.bcb.gov.br/ifdata/...
 * - Or accept a CSV File object and parse it
 * 
 * @returns Promise<BankData[]> Array of bank data
 */
export async function fetchBankData(): Promise<BankData[]> {
  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 800));
  return MOCK_BANKS;
}

/**
 * Parses a CSV file into BankData format.
 * 
 * TODO: Implement CSV parsing logic when file upload is integrated.
 * Expected CSV columns: nome, cnpj, ib, cet1, ii, icp, roe, roa, ie, lcr, rating, fgc
 */
export async function parseBankCSV(_file: File): Promise<BankData[]> {
  // Placeholder for CSV parsing
  console.warn('CSV parsing not yet implemented. Using mock data.');
  return MOCK_BANKS;
}

// ============================================================
// Mock Bank Dataset
// 3 Excellent | 3 Mixed | 2 Poor
// ============================================================

const MOCK_BANKS: BankData[] = [
  // === EXCELLENT BANKS (3) ===
  {
    id: 'itau-01',
    name: 'Itaú Unibanco',
    cnpj: '60.701.190/0001-04',
    ib: 16.2,
    cet1: 13.5,
    ii: 2.1,
    icp: 185.0,
    roe: 21.3,
    roa: 1.9,
    ie: 41.2,
    lcr: 178.0,
    rating: 'AA',
    fgc: 'coberto_250k',
  },
  {
    id: 'bradesco-01',
    name: 'Bradesco',
    cnpj: '60.746.948/0001-12',
    ib: 15.8,
    cet1: 12.9,
    ii: 2.3,
    icp: 168.0,
    roe: 18.7,
    roa: 1.7,
    ie: 43.5,
    lcr: 162.0,
    rating: 'AA-',
    fgc: 'coberto_250k',
  },
  {
    id: 'bb-01',
    name: 'Banco do Brasil',
    cnpj: '00.000.000/0001-91',
    ib: 17.4,
    cet1: 14.1,
    ii: 1.8,
    icp: 198.0,
    roe: 22.1,
    roa: 2.0,
    ie: 38.7,
    lcr: 195.0,
    rating: 'AAA',
    fgc: 'coberto_250k',
  },

  // === MIXED BANKS (3) ===
  {
    id: 'abc-01',
    name: 'Banco ABC Brasil',
    cnpj: '28.195.667/0001-06',
    ib: 14.3,
    cet1: 11.2,
    ii: 3.1,
    icp: 125.0,
    roe: 12.8,
    roa: 1.1,
    ie: 49.8,
    lcr: 135.0,
    rating: 'A',
    fgc: 'coberto_250k',
  },
  {
    id: 'daycoval-01',
    name: 'Banco Daycoval',
    cnpj: '62.232.889/0001-90',
    ib: 13.5,
    cet1: 10.8,
    ii: 3.8,
    icp: 110.0,
    roe: 14.2,
    roa: 0.9,
    ie: 52.3,
    lcr: 128.0,
    rating: 'A-',
    fgc: 'coberto_250k',
  },
  {
    id: 'banrisul-01',
    name: 'Banrisul',
    cnpj: '92.702.067/0001-96',
    ib: 13.1,
    cet1: 9.5,
    ii: 4.5,
    icp: 95.0,
    roe: 8.7,
    roa: 0.6,
    ie: 58.4,
    lcr: 115.0,
    rating: 'BBB',
    fgc: 'coberto_1m',
  },

  // === POOR BANKS (2) ===
  {
    id: 'master-01',
    name: 'Banco Master',
    cnpj: '03.569.010/0001-24',
    ib: 10.5,
    cet1: 6.8,
    ii: 7.2,
    icp: 68.0,
    roe: -2.3,
    roa: 0.15,
    ie: 75.4,
    lcr: 88.0,
    rating: 'B+',
    fgc: 'nao_coberto',
  },
  {
    id: 'pine-01',
    name: 'Banco Pine',
    cnpj: '62.144.175/0001-20',
    ib: 11.8,
    cet1: 7.5,
    ii: 5.8,
    icp: 82.0,
    roe: 3.2,
    roa: 0.25,
    ie: 68.5,
    lcr: 105.0,
    rating: 'BB-',
    fgc: 'coberto_1m',
  },
];

export default MOCK_BANKS;
