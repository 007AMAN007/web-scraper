import { asError } from 'catch-unknown';

// Expands the library's function, so it will return a type that allows additional custom keys to the returned object (e.g. code).
export const treatAsError = (input: unknown) => {
  return asError(input) as Error & Record<string, unknown>;
};
