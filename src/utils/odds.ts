export type OddsFormat = 'decimal' | 'american' | 'fractional' | 'implied';

/** Abreviaturas de formato reutilizadas en Header, BetCard, etc. */
export const ODDS_FORMAT_SHORT: Record<OddsFormat, string> = {
  decimal: 'DEC',
  american: 'AME',
  fractional: 'FRA',
  implied: 'IMP',
};

// Greatest Common Divisor helper for fractional odds
function gcd(a: number, b: number): number {
  return b < 0.00001 ? a : gcd(b, Math.floor(a % b));
}

export function decimalToFractional(decimal: number): string {
  // Infinity pasaria como numerador infinito -> "NaN/NaN"
  if (!Number.isFinite(decimal) || decimal <= 1) return '0/1';
  const net = decimal - 1;

  // Common standard fractions map for betting accuracy
  const commonFractions: { [key: string]: string } = {
    '0.1': '1/10',
    '0.2': '1/5',
    '0.25': '1/4',
    '0.33': '1/3',
    '0.4': '2/5',
    '0.5': '1/2',
    '0.57': '4/7',
    '0.6': '3/5',
    '0.67': '2/3',
    '0.73': '8/11',
    '0.75': '3/4',
    '0.8': '4/5',
    '0.83': '5/6',
    '0.91': '10/11',
    '1.0': '1/1',
    '1.1': '11/10',
    '1.2': '6/5',
    '1.25': '5/4',
    '1.38': '11/8',
    '1.5': '3/2',
    '1.62': '13/8',
    '1.75': '7/4',
    '1.88': '15/8',
    '2.0': '2/1',
    '2.25': '9/4',
    '2.5': '5/2',
    '2.75': '11/4',
    '3.0': '3/1',
    '3.5': '7/2',
    '4.0': '4/1',
    '4.5': '9/2',
    '5.0': '5/1',
    '6.0': '6/1',
    '7.0': '7/1',
    '8.0': '8/1',
    '9.0': '9/1',
    '10.0': '10/1',
  };

  const roundedNet = (Math.round(net * 100) / 100).toFixed(2);
  if (commonFractions[roundedNet]) {
    return commonFractions[roundedNet];
  }

  const precision = 1000;
  const numerator = Math.round(net * precision);
  const denominator = precision;
  const d = gcd(numerator, denominator);
  return `${Math.round(numerator / d)}/${Math.round(denominator / d)}`;
}

export function decimalToAmerican(decimal: number): string {
  if (!Number.isFinite(decimal) || isNaN(decimal) || decimal <= 1.01) return '+100';
  if (decimal >= 2.0) {
    const american = Math.round((decimal - 1) * 100);
    return `+${american}`;
  } else {
    const diff = decimal - 1;
    if (diff <= 0.001) return '+100';
    const american = Math.round(-100 / diff);
    return `${american}`;
  }
}

export function decimalToImpliedProbability(decimal: number): string {
  if (decimal <= 0) return '0%';
  const prob = (1 / decimal) * 100;
  return `${prob.toFixed(1)}%`;
}

export function formatOdds(
  decimalOdds: number,
  format: OddsFormat = 'decimal',
): string {
  // Infinity/-Infinity/NaN pasan el check clasico de isNaN: se exige finito
  if (!Number.isFinite(decimalOdds)) return '1.00';

  switch (format) {
    case 'american':
      return decimalToAmerican(decimalOdds);
    case 'fractional':
      return decimalToFractional(decimalOdds);
    case 'implied':
      return decimalToImpliedProbability(decimalOdds);
    case 'decimal':
    default:
      return Math.max(1, decimalOdds).toFixed(2);
  }
}

/**
 * Parsea el input del usuario a cuota decimal.
 * Devuelve `null` si la entrada es inválida para que la UI pueda avisar
 * en lugar de convertir silenciosamente a 1.00.
 */
export function parseInputToDecimal(
  input: string,
  format: OddsFormat,
): number | null {
  if (!input || input.trim() === '') return null;

  const cleaned = input.trim();

  if (format === 'decimal') {
    const val = parseFloat(cleaned.replace(',', '.'));
    return isNaN(val) || val < 1 ? null : val;
  }

  if (format === 'american') {
    const num = parseInt(cleaned.replace('+', ''), 10);
    if (isNaN(num)) return null;
    if (num > 0) {
      return parseFloat((num / 100 + 1).toFixed(3));
    } else if (num < 0) {
      return parseFloat((100 / Math.abs(num) + 1).toFixed(3));
    }
    return null;
  }

  if (format === 'fractional') {
    if (cleaned.includes('/')) {
      const [numStr, denStr] = cleaned.split('/');
      const num = parseFloat(numStr);
      const den = parseFloat(denStr);
      if (Number.isFinite(num) && Number.isFinite(den) && num > 0 && den > 0) {
        return parseFloat((num / den + 1).toFixed(3));
      }
      return null;
    }
    const val = parseFloat(cleaned);
    // Sin "/" es decimal suelto: debe ser cuota valida >= 1
    return Number.isFinite(val) && val >= 1 ? val : null;
  }

  if (format === 'implied') {
    const cleanProb = parseFloat(cleaned.replace('%', ''));
    if (!isNaN(cleanProb) && cleanProb > 0 && cleanProb <= 100) {
      return parseFloat((100 / cleanProb).toFixed(3));
    }
    return null;
  }

  return null;
}

export function convertOddsInput(
  currentValue: string,
  fromFormat: OddsFormat,
  toFormat: OddsFormat,
): string {
  const decimal = parseInputToDecimal(currentValue, fromFormat);
  if (decimal === null) return '';
  return formatOdds(decimal, toFormat);
}
