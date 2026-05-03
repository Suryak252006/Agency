/**
 * CSS Module declaration for side-effect imports.
 * Allows TypeScript strict mode to accept CSS imports without @ts-expect-error.
 * These imports are processed by Next.js/Tailwind and have no runtime value;
 * they exist purely for side effects (styles loaded into the page).
 */
declare module '*.css' {
  const content: Record<string, never>;
  export default content;
}
