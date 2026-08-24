export interface BookmakerInfo {
  id: string;
  name: string;
  shortName: string;
  region: 'AR' | 'GLOBAL' | 'CRYPTO';
  badgeLabel: string;
  color: string;
}

export const POPULAR_BOOKMAKERS: BookmakerInfo[] = [
  // 🇦🇷 Habilitadas en Argentina (PBA, CABA, Provincias)
  {
    id: 'betsson',
    name: 'Betsson Argentina',
    shortName: 'Betsson',
    region: 'AR',
    badgeLabel: '🇦🇷 Betsson',
    color: '#FF6B00',
  },
  {
    id: 'betano',
    name: 'Betano Argentina',
    shortName: 'Betano',
    region: 'AR',
    badgeLabel: '🇦🇷 Betano',
    color: '#E02020',
  },
  {
    id: 'bet365',
    name: 'Bet365 Argentina',
    shortName: 'Bet365',
    region: 'AR',
    badgeLabel: '🇦🇷 Bet365',
    color: '#007A3D',
  },
  {
    id: 'codere',
    name: 'Codere Argentina',
    shortName: 'Codere',
    region: 'AR',
    badgeLabel: '🇦🇷 Codere',
    color: '#68B030',
  },
  {
    id: 'bplay',
    name: 'bplay (PBA / CABA)',
    shortName: 'bplay',
    region: 'AR',
    badgeLabel: '🇦🇷 bplay',
    color: '#00E676',
  },
  {
    id: 'jugadon',
    name: 'Jugadon',
    shortName: 'Jugadon',
    region: 'AR',
    badgeLabel: '🇦🇷 Jugadon',
    color: '#FFB800',
  },
  {
    id: 'casino_ba',
    name: 'Casino Buenos Aires Online',
    shortName: 'Casino BA',
    region: 'AR',
    badgeLabel: '🇦🇷 Casino BA',
    color: '#3B82F6',
  },

  // 🌐 Internacionales / Crypto populares
  {
    id: '1xbet',
    name: '1xBet',
    shortName: '1xBet',
    region: 'GLOBAL',
    badgeLabel: '🌐 1xBet',
    color: '#1B72BA',
  },
  {
    id: 'stake',
    name: 'Stake (Crypto / Global)',
    shortName: 'Stake',
    region: 'CRYPTO',
    badgeLabel: 'Stake',
    color: '#1475E1',
  },
  {
    id: 'pinnacle',
    name: 'Pinnacle',
    shortName: 'Pinnacle',
    region: 'GLOBAL',
    badgeLabel: 'Pinnacle',
    color: '#EE5A24',
  },
  {
    id: 'betfair',
    name: 'Betfair',
    shortName: 'Betfair',
    region: 'GLOBAL',
    badgeLabel: 'Betfair',
    color: '#FFB900',
  },
  {
    id: '20bet',
    name: '20Bet',
    shortName: '20Bet',
    region: 'GLOBAL',
    badgeLabel: '🌐 20Bet',
    color: '#00B894',
  },
];
