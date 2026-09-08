import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Testy integracyjne chodzą po jednej bazie — równoległe pliki wchodziłyby
    // sobie w drogę. Jest ich na tyle mało, że nie ma czego przyspieszać.
    fileParallelism: false,
    include: ['src/**/*.test.ts'],
  },
});
