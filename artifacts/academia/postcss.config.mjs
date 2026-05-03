import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  plugins: {
    [path.resolve(__dirname, '../../node_modules/@tailwindcss/postcss/dist/index.cjs')]: {},
  },
};