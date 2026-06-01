import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts}',          // incluye utils.ts con EVENTO_TIPO_DOT
    './src/contexts/**/*.{js,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Azul marino institucional (claro #3078ac · oscuro #23597e)
        brand: {
          50:  '#eef4f9',
          100: '#d3e3ef',
          200: '#aecbe0',
          300: '#82afcf',
          400: '#5193bd',
          500: '#3078ac',  // azul marino claro
          600: '#2a6995',
          700: '#23597e',  // azul marino oscuro — color principal
          800: '#1c4763',
          900: '#143447',
        },
        // Verde agua institucional (#49d8b7) — acento
        accent: {
          50:  '#e9faf5',
          100: '#c7f2e6',
          200: '#97e8d2',
          300: '#66ddbe',
          400: '#49d8b7',  // verde agua
          500: '#28c4a0',
          600: '#1fa183',
          700: '#1c8069',
          800: '#186653',
          900: '#145244',
        },
        sidebar: '#23597e',
        'sidebar-dark': '#143447',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-10px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
export default config
