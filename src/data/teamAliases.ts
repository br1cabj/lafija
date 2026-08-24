/**
 * Alias de equipos para el matching difuso con la API de deportes.
 * Clave y valor se normalizan antes de comparar (minúsculas, sin acentos).
 * Agregar entradas a medida que aparezcan casos: es un diccionario vivo.
 */
export const TEAM_ALIASES: Record<string, string> = {
  // Inglaterra
  mancity: 'manchester city',
  manutd: 'manchester united',
  spurs: 'tottenham',
  tottenhamhotspur: 'tottenham hotspur',
  newcastleunited: 'newcastle',
  wolverhampton: 'wolves',
  brightonhovealbion: 'brighton',
  // España
  atleticomadrid: 'atletico madrid',
  atleticobilbao: 'athletic bilbao',
  athleticclub: 'athletic bilbao',
  realbetis: 'betis',
  celtavigo: 'celta vigo',
  rayovallecano: 'rayo vallecano',
  laspalmas: 'palmas',
  // Italia
  inter: 'inter milan',
  internazionale: 'inter milan',
  napoli: 'napoles',
  juventus: 'juve',
  // Alemania
  bayernmunich: 'bayern munich',
  bayernmunchen: 'bayern munich',
  borussiadortmund: 'dortmund',
  bayerleverkusen: 'leverkusen',
  rbleipzig: 'leipzig',
  // Francia
  psg: 'paris saint germain',
  parissaintgermain: 'psg',
  parissg: 'paris saint germain',
  // Argentina / Sudamérica
  riverplate: 'river',
  bocajuniors: 'boca',
  racingclub: 'racing',
  independientedelsud: 'independiente',
  // Países Bajos / Portugal
  psv: 'psv eindhoven',
  sportingcp: 'sporting lisboa',
  // Otros
  intersouthampton: 'southampton',
};

/** Expande un nombre normalizado a su(s) forma(s) canónica(s). */
export function expandAlias(normalized: string): string[] {
  const alias = TEAM_ALIASES[normalized];
  if (!alias) return [normalized];
  const canonical = alias
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return canonical === normalized ? [normalized] : [normalized, canonical];
}
