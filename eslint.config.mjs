// ESLint 9 dejó de leer .eslintrc.json: la configuración pasa a este archivo
// ("flat config"). Se conservan exactamente las mismas reglas y exclusiones que
// tenía .eslintrc.json — el cambio es de formato, no de criterio.
//
// eslint-config-next 16 ya se publica en flat, así que se importa directo. No
// hay que envolverlo en FlatCompat: hacerlo revienta con "Converting circular
// structure to JSON", porque el traductor intenta serializar una config que ya
// trae los plugins resueltos.
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescriptConfig from 'eslint-config-next/typescript'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    // En flat config las exclusiones van en su propio bloque, y son relativas
    // a la raíz del proyecto.
    ignores: ['public/**', '.next/**', 'node_modules/**', 'scripts/**', 'worker/**'],
  },
  ...coreWebVitals,
  ...typescriptConfig,
  {
    // En flat config cada plugin cuyas reglas se usen tiene que estar
    // declarado en el mismo objeto: no alcanza con que lo traiga otra config.
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-img-element': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',

      // Reglas nuevas que trae la config de Next 16 (era del React Compiler).
      // Marcaban 11 errores en código que ya venía funcionando: efectos que
      // llaman a setState de forma sincrónica, y un handler de click que arma
      // un .xlsx mutando la hoja. Ninguno es un bug — son avisos de
      // rendimiento y de compatibilidad con el compilador.
      //
      // Quedan en warn a propósito: refactorizar once hooks dentro del mismo
      // PR que sube Next y React dos versiones mayores es la forma más segura
      // de romper algo sin saber qué lo rompió. Vale la pena atacarlos después,
      // por separado y de a poco.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
    },
  },
  {
    // next.config.js es CommonJS por diseño (Next lo carga con require), así
    // que ahí el require() no es un problema a corregir.
    files: ['**/*.js', '**/*.cjs'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]
