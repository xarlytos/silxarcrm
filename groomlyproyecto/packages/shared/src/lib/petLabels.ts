import type { PetCoat, PetSex, PetSize } from '../types/api';

// Labels canónicos para mascotas. Centralizado aquí para evitar duplicación
// y mantener tildes consistentes en toda la app.

export const PET_SIZE_LABELS: Record<PetSize, string> = {
  xs: 'Mini',
  s: 'Pequeño',
  m: 'Mediano',
  l: 'Grande',
  xl: 'Gigante',
};

// Variante con rango de peso, útil en formularios.
export const PET_SIZE_LABELS_WITH_WEIGHT: Record<PetSize, string> = {
  xs: 'Mini (< 5kg)',
  s: 'Pequeño (5-10kg)',
  m: 'Mediano (10-20kg)',
  l: 'Grande (20-35kg)',
  xl: 'Gigante (> 35kg)',
};

export const PET_SEX_LABELS: Record<PetSex, string> = {
  male: 'Macho',
  female: 'Hembra',
};

export const PET_COAT_LABELS: Record<PetCoat, string> = {
  short: 'Corto',
  medium: 'Medio',
  long: 'Largo',
  curly: 'Rizado',
  wire: 'Duro',
};

export const PET_STATUS_LABELS: Record<string, string> = {
  active: 'Activa',
  archived: 'Archivada',
};

// Helper para construir options en selects.
export function sizeOptions() {
  return (Object.keys(PET_SIZE_LABELS) as PetSize[]).map((value) => ({
    value,
    label: PET_SIZE_LABELS[value],
  }));
}

export function sizeOptionsWithWeight() {
  return (Object.keys(PET_SIZE_LABELS_WITH_WEIGHT) as PetSize[]).map((value) => ({
    value,
    label: PET_SIZE_LABELS_WITH_WEIGHT[value],
  }));
}

export function coatOptions() {
  return (Object.keys(PET_COAT_LABELS) as PetCoat[]).map((value) => ({
    value,
    label: PET_COAT_LABELS[value],
  }));
}

export function sexOptions() {
  return [
    { value: '', label: 'Sin especificar' },
    { value: 'female' as const, label: PET_SEX_LABELS.female },
    { value: 'male' as const, label: PET_SEX_LABELS.male },
  ];
}
