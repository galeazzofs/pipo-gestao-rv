export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
] as const;

// Gera lista de anos: 2024 até ano atual + 2
export const ANOS = Array.from({ length: new Date().getFullYear() - 2024 + 3 }, (_, i) => String(2024 + i));
