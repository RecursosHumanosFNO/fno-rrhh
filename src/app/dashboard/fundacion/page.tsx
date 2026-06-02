'use client'

import {
  Heart, Eye, Star, BookOpen, Leaf, Sparkles,
  MapPin, GraduationCap, Trophy, Users, Navigation,
  Dumbbell, Scale, Building2, School, Monitor,
} from 'lucide-react'
import Image from 'next/image'

const VALORES = [
  { icon: Heart, title: 'Compromiso', desc: 'Nos comprometemos con cada persona, familia y comunidad que acompañamos, poniendo el corazón en cada acción.' },
  { icon: Users, title: 'Comunidad', desc: 'Creemos en la fuerza colectiva y en construir lazos sólidos que transformen la realidad de nuestro barrio y ciudad.' },
  { icon: GraduationCap, title: 'Educación', desc: 'La educación es el motor de cambio. Apostamos por el aprendizaje como herramienta de inclusión y transformación social.' },
  { icon: Leaf, title: 'Sustentabilidad', desc: 'Impulsamos prácticas sustentables que cuidan el ambiente y generan oportunidades productivas para nuestros jóvenes.' },
  { icon: Trophy, title: 'Excelencia', desc: 'Buscamos la calidad en todo lo que hacemos, desde la gestión institucional hasta el acompañamiento diario a nuestros estudiantes.' },
  { icon: Star, title: 'Inclusión', desc: 'Ninguna barrera debe impedir el acceso al conocimiento. Trabajamos para que todos tengan las mismas oportunidades.' },
]

const HITOS = [
  {
    year: '1986',
    title: 'El sueño',
    desc: 'El 15 de abril de 1986 nace en Neuquén el sueño de la Fundación: acompañar a la comunidad del oeste a través del deporte, la educación y los valores.',
    icon: Sparkles,
  },
  {
    year: '1991',
    title: 'El Gimnasio',
    desc: 'Se inaugura el gimnasio, primer gran espacio propio para el desarrollo de actividades físicas y deportivas con la comunidad.',
    icon: Dumbbell,
  },
  {
    year: '1992',
    title: 'Personería Jurídica',
    desc: 'La Fundación obtiene el otorgamiento de la Personería Jurídica, consolidándose formalmente como institución.',
    icon: Scale,
  },
  {
    year: '1994',
    title: 'El Tinglado Parabólico',
    desc: 'Se construye el emblemático tinglado parabólico, ampliando la capacidad para actividades deportivas y comunitarias.',
    icon: Building2,
  },
  {
    year: '2005',
    title: 'Colegio para Adultos',
    desc: 'Abre el Colegio para Adultos, brindando una nueva oportunidad educativa a quienes no pudieron completar sus estudios.',
    icon: BookOpen,
  },
  {
    year: '2010',
    title: 'Escuela Primaria y Jardín de Infantes',
    desc: 'Se abren la Escuela Primaria y el Jardín de Infantes, extendiendo la propuesta educativa a las primeras infancias.',
    icon: School,
  },
  {
    year: '2017',
    title: 'Instituto de Estudios Interdisciplinarios (ISEI)',
    desc: 'Se crea el ISEI, Instituto Superior de Estudios Interdisciplinarios, sumando educación de nivel terciario a la institución.',
    icon: GraduationCap,
  },
  {
    year: '2022',
    title: 'Colegio Secundario',
    desc: 'Abre el Colegio Secundario, completando la trayectoria educativa de la Fundación desde el jardín hasta el nivel superior.',
    icon: Trophy,
  },
  {
    year: '2024',
    title: 'Tecnicatura en Deporte Social',
    desc: 'Comienza la Tecnicatura en Deporte Social, formando profesionales que entienden el deporte como herramienta de transformación comunitaria.',
    icon: Users,
  },
  {
    year: '2026',
    title: 'Portal de RRHH',
    desc: 'Se abre el Portal de Recursos Humanos, digitalizando la gestión interna y modernizando los procesos para todo el personal de la Fundación.',
    icon: Monitor,
  },
]

export default function FundacionPage() {
  return (
    <div className="page-container">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-brand-700 dark:bg-brand-900 min-h-[220px] flex items-end">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25"
          style={{ backgroundImage: "url('/sede.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-900/90 via-brand-800/60 to-transparent" />
        <div className="relative z-10 p-8 flex items-end gap-5">
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 bg-white flex items-center justify-center shrink-0 shadow-xl">
            <Image
              src="/logo.png"
              alt="Logo FNO"
              width={80}
              height={80}
              className="object-contain"
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                const t = e.target as HTMLImageElement
                t.style.display = 'none'
              }}
            />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Conocé nuestra historia</p>
            <h1 className="text-3xl font-bold text-white leading-tight">Fundación Neuquén Oeste</h1>
            <div className="flex items-center gap-1.5 mt-2 text-blue-200 text-sm">
              <MapPin className="w-3.5 h-3.5" />
              <span>Neuquén Capital, Patagonia Argentina</span>
            </div>
          </div>
        </div>
      </div>

      {/* Misión & Visión */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center">
              <Heart className="w-5 h-5 text-brand-700 dark:text-brand-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nuestra Misión</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Somos una organización de la sociedad civil comprometida con el desarrollo integral de niños, jóvenes y adultos del oeste de la ciudad de Neuquén. Trabajamos desde la educación, el deporte y la cultura para generar oportunidades reales de inclusión, empleo y ciudadanía activa, apostando al crecimiento personal y colectivo de nuestra comunidad.
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nuestra Visión</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Ser referentes en la Patagonia en educación con impacto social, construyendo una comunidad donde cada persona tenga acceso a herramientas que le permitan transformar su vida y la de quienes la rodean. Soñamos con un territorio más justo, más educado y más sustentable, donde el origen no determine el destino.
          </p>
        </div>
      </div>

      {/* Valores */}
      <div className="card p-6">
        <div className="mb-6">
          <h2 className="section-title text-lg">Nuestros Valores</h2>
          <p className="section-subtitle">Los principios que guían cada uno de nuestros pasos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {VALORES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-slate-100 dark:border-slate-800 p-4 hover:border-brand-200 dark:hover:border-brand-700 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center mb-3 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 transition-colors">
                <Icon className="w-5 h-5 text-brand-700 dark:text-brand-400" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1.5">{title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Historia — timeline */}
      <div className="card p-6">
        <div className="mb-6">
          <h2 className="section-title text-lg">Nuestra Historia</h2>
          <p className="section-subtitle">Cuatro décadas de trabajo, crecimiento y transformación comunitaria</p>
        </div>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="space-y-6">
            {HITOS.map(({ year, title, desc, icon: Icon }, i) => (
              <div key={year} className="flex gap-4 sm:gap-6 items-start">
                {/* Circle */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 relative z-10 ${
                  i === HITOS.length - 1
                    ? 'bg-brand-700 dark:bg-brand-600 text-white'
                    : 'bg-white dark:bg-slate-900 border-2 border-brand-300 dark:border-brand-600 text-brand-700 dark:text-brand-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      i === HITOS.length - 1
                        ? 'bg-brand-700 text-white dark:bg-brand-600'
                        : 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                    }`}>
                      {year}
                    </span>
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nuestra Sede — mapa/foto */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-sky-100 dark:border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
            <Navigation className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Nuestra Sede</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> Barrio Unión de Mayo · Neuquén Capital
            </p>
          </div>
        </div>
        <div className="relative">
          <img
            src="/sede.jpg"
            alt="Sede Fundación Neuquén Oeste"
            className="w-full object-cover max-h-[480px]"
          />
          <a
            href="https://maps.google.com/?q=Fundacion+Neuquen+Oeste"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-4 right-4 btn-primary text-sm py-2 shadow-lg"
          >
            <MapPin className="w-4 h-4" /> Ver en Google Maps
          </a>
        </div>
      </div>

      {/* Zona Restaurativa */}
      <div className="card p-6 border-l-4 border-emerald-400 dark:border-emerald-500">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">Zona Restaurativa</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
              La Zona Restaurativa es un espacio institucional de escucha, contención y reparación de vínculos dentro de nuestra comunidad educativa. Inspirada en la justicia restaurativa, busca resolver conflictos desde el diálogo, la empatía y la responsabilidad compartida, en lugar de la punición.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              En este espacio, estudiantes, docentes y familias pueden participar de círculos de conversación, mediaciones y procesos de acompañamiento que fortalecen el tejido comunitario y promueven una cultura de paz y respeto mutuo. Es uno de los pilares que distingue nuestra propuesta educativa a nivel regional.
            </p>
          </div>
        </div>
      </div>

      {/* Nuestro Sueño */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-yellow-300" />
            <h2 className="text-lg font-bold text-white">Nuestro Sueño</h2>
          </div>
          <p className="text-blue-100 leading-relaxed mb-4 text-lg font-light italic">
            "Soñamos con un barrio donde ningún chico deje la escuela, donde cada joven encuentre en la Fundación una oportunidad real de futuro, y donde nuestra comunidad sea un ejemplo de cómo la educación transforma vidas."
          </p>
          <p className="text-blue-200 leading-relaxed text-sm">
            Ese sueño nos moviliza cada día: ampliar nuestras instalaciones, llegar a más familias, consolidar nuestros proyectos productivos y ser el puente entre el barrio y un mundo lleno de posibilidades. Con el compromiso de nuestro equipo de más de 160 personas, sabemos que es posible.
          </p>
          <div className="flex items-center gap-4 mt-6 pt-5 border-t border-white/20">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">+160</p>
              <p className="text-blue-200 text-xs">Colaboradores</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">+40</p>
              <p className="text-blue-200 text-xs">Años de historia</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white">+1000</p>
              <p className="text-blue-200 text-xs">Estudiantes anuales</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
