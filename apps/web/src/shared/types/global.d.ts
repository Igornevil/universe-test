// Side-effect imports of static assets. Next.js handles these at build time
// via webpack/turbopack; the declarations below just tell TypeScript that
// `import './foo.css'` is a valid statement with no runtime exports.

declare module '*.css';
declare module '*.scss';
declare module '*.svg';
