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

      // Reglas del React Compiler que trae la config de Next 16. Eran 11
      // avisos; quedan 9, y quedan a propósito. No son bugs:
      //
      //  · 8 son "setState sincrónico dentro de un efecto" en el mismo caso:
      //    leer al montar algo que sólo existe en el navegador —el tema
      //    guardado, si ya se vio la bienvenida, el permiso de notificaciones,
      //    la sesión de Supabase—. En una app con render en el servidor ese ES
      //    el patrón correcto: leerlo durante el render daría una marca
      //    distinta en el servidor y en el cliente, y React tiraría un error de
      //    hidratación. Sacarlos pide useSyncExternalStore, que es un cambio
      //    real (uno de ellos vive en AuthContext) a cambio de nada visible.
      //
      //  · 1 es el exportador de .xlsx de estadísticas: los helpers mutan la
      //    hoja, pero todo pasa dentro del handler del click, no durante el
      //    render. Se saca moviendo 260 líneas fuera del componente; el día que
      //    haya que tocar ese informe, conviene hacerlo ahí.
      //
      // Los dos que sí valía la pena arreglar ya se arreglaron (FotoRegistro y
      // la ficha del empleado): eran estado que se podía derivar.
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
