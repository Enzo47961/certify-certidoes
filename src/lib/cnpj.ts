/** CNPJ: normalização, dígitos verificadores e formatação. */

export const soDigitos = (valor: string) => valor.replace(/\D/g, '');

export function cnpjValido(valor: string): boolean {
  const c = soDigitos(valor);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...base].reduce((s, d, i) => s + Number(d) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = dv(c.slice(0, 12));
  const d2 = dv(c.slice(0, 12) + d1);
  return c.endsWith(`${d1}${d2}`);
}

export function formatarCnpj(valor: string): string {
  const c = soDigitos(valor).padStart(14, '0').slice(0, 14);
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

/** Completa os dois dígitos verificadores de uma base de 12 dígitos (usado na demo). */
export function comDigitos(base12: string): string {
  for (let d = 0; d < 100; d++) {
    const c = base12 + String(d).padStart(2, '0');
    if (cnpjValido(c)) return c;
  }
  throw new Error('base inválida');
}
