import type { Person, PersonCategory } from '../types';

/** Danish genitive: "H.C. Andersen" → "H.C. Andersens", "Thomas" → "Thomas'". */
export function genitive(name: string): string {
  const n = name.trim();
  return /[sxz]$/i.test(n) ? `${n}'` : `${n}s`;
}

const CATEGORY_QUESTION: Record<PersonCategory, (name: string) => string> = {
  writers: (n) => `Hvilke værker er ${n} mest kendt for?`,
  art: (n) => `Hvilke værker er ${n} mest kendt for?`,
  music: (n) => `Hvilken musik er ${n} mest kendt for?`,
  science: (n) => `Hvad opdagede eller udviklede ${n}?`,
  thinkers: (n) => `Hvilke tanker er ${n} kendt for?`,
  royals: (n) => `Hvad betød ${n} for Danmark?`,
  naval: (n) => `Hvilke slag og bedrifter er ${n} kendt for?`,
  politics: (n) => `Hvad betød ${n} for Danmark?`,
  stage: (n) => `Hvad er ${n} kendt for på scenen og filmen?`,
  sports: (n) => `Hvad opnåede ${n} i sin karriere?`,
  other: (n) => `Hvad betød ${n} for sin samtid?`,
};

/** Ready-made questions shown on the person page and in the chat. */
export function suggestedQuestions(person: Person): string[] {
  const questions = [
    `Hvorfor er ${person.name} kendt?`,
    CATEGORY_QUESTION[person.category](person.name),
  ];
  if (person.era && person.era !== 'Ukendt periode') {
    const era = person.era.replace(/^(Det|Den) /, (m) => m.toLowerCase());
    questions.push(`Hvordan var hverdagen i ${era}?`);
  }
  if (person.birthYear || person.deathYear) {
    questions.push(`Hvad skete der i Danmark i ${genitive(person.name)} levetid?`);
  }
  return questions;
}
