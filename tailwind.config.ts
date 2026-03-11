import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['var(--font-inter)',    'system-ui', 'sans-serif'],
        serif: ['var(--font-dm-serif)', 'Georgia', 'serif'],
        logo:  ['var(--font-abril)',    'Georgia', 'serif'],  // Abril Fatface — logo only
      },
      colors: {
        // Barabula brand palette — warm orange + cool navy complementary scheme
        navy:  { DEFAULT: '#285185', light: '#3a6aab' },  // deep navy — primary
        coral: { DEFAULT: '#D67940', light: '#e8915e' },  // warm orange — accent/CTAs
        umber: { DEFAULT: '#6F4849', light: '#8c5e60' },  // warm brown — depth
        sky:   { DEFAULT: '#CCD9E2', dark:  '#a8bfce' },  // light sky blue — subtle
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
