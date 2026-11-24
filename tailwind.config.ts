import type { Config } from "tailwindcss";

/*
 * As telas usam cores cruas do Tailwind (bg-green-600, text-blue-500…) em mais de 500
 * lugares. Em vez de trocar uma a uma, as famílias são redefinidas como rampas
 * calibradas dentro da paleta Flowdent: o significado fica (verde = ok, vermelho =
 * alerta, âmbar = espera), a matiz saturada de fora da marca sai.
 */
const LUMINOSIDADE: Record<string, number> = {
  50: 96, 100: 92, 200: 84, 300: 72, 400: 60, 500: 48, 600: 39, 700: 31, 800: 24, 900: 18, 950: 11,
};
const rampa = (matiz: number, saturacao: number) =>
  Object.fromEntries(
    Object.entries(LUMINOSIDADE).map(([passo, l]) => [passo, `hsl(${matiz} ${saturacao}% ${l}% / <alpha-value>)`]),
  );

const ok = rampa(148, 38);       // sinal-ok
const alerta = rampa(4, 56);     // sinal-alerta
const espera = rampa(38, 64);    // sinal-espera
const tinta = rampa(222, 48);    // azul da marca
const acento = rampa(187, 44);   // verde-azulado do lettering
const ameixa = rampa(286, 18);   // categorias que precisavam de uma terceira matiz, contida
const bone = rampa(38, 6);       // neutros

const coresCalibradas = {
  green: ok, emerald: ok, lime: ok,
  red: alerta, rose: alerta,
  amber: espera, orange: espera, yellow: espera,
  blue: tinta, sky: tinta, indigo: tinta,
  teal: acento, cyan: acento,
  purple: ameixa, violet: ameixa, fuchsia: ameixa, pink: ameixa,
  gray: bone, slate: bone, zinc: bone, neutral: bone, stone: bone,
};

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        ...coresCalibradas,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        tinta: { 50:"hsl(var(--tinta-50))",100:"hsl(var(--tinta-100))",200:"hsl(var(--tinta-200))",300:"hsl(var(--tinta-300))",400:"hsl(var(--tinta-400))",500:"hsl(var(--tinta-500))",600:"hsl(var(--tinta-600))",700:"hsl(var(--tinta-700))",800:"hsl(var(--tinta-800))",900:"hsl(var(--tinta-900))",950:"hsl(var(--tinta-950))" },
        acento: { 50:"hsl(var(--acento-50))",100:"hsl(var(--acento-100))",200:"hsl(var(--acento-200))",300:"hsl(var(--acento-300))",400:"hsl(var(--acento-400))",500:"hsl(var(--acento-500))",600:"hsl(var(--acento-600))",700:"hsl(var(--acento-700))",800:"hsl(var(--acento-800))",900:"hsl(var(--acento-900))" },
        bone: { 0:"hsl(var(--bone-0))",50:"hsl(var(--bone-50))",100:"hsl(var(--bone-100))",200:"hsl(var(--bone-200))",300:"hsl(var(--bone-300))",400:"hsl(var(--bone-400))",500:"hsl(var(--bone-500))",600:"hsl(var(--bone-600))",700:"hsl(var(--bone-700))",800:"hsl(var(--bone-800))",900:"hsl(var(--bone-900))",950:"hsl(var(--bone-950))" },
        superficie: { pagina:"hsl(var(--surface-pagina))", elevada:"hsl(var(--surface-elevada))", afundada:"hsl(var(--surface-afundada))" },
        texto: { primario:"hsl(var(--texto-primario))", secundario:"hsl(var(--texto-secundario))", suave:"hsl(var(--texto-suave))" },
        acao: { DEFAULT:"hsl(var(--acao))", hover:"hsl(var(--acao-hover))", sobre:"hsl(var(--acao-sobre))", tenue:"hsl(var(--acao-tenue))" },
        sinal: { ok:"hsl(var(--sinal-ok))","ok-tenue":"hsl(var(--sinal-ok-tenue))", espera:"hsl(var(--sinal-espera))","espera-tenue":"hsl(var(--sinal-espera-tenue))", alerta:"hsl(var(--sinal-alerta))","alerta-tenue":"hsl(var(--sinal-alerta-tenue))" },
        clinico: { "a-realizar":"hsl(var(--clinico-a-realizar))", executado:"hsl(var(--clinico-executado))", protese:"hsl(var(--clinico-protese))", ausente:"hsl(var(--clinico-ausente))", dente:"hsl(var(--clinico-dente))", contorno:"hsl(var(--clinico-contorno))" },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      // Hierarquia vem de tamanho e cor, não de peso. bold/extrabold/black (238 usos)
      // ficam em 600, o teto do sistema.
      fontWeight: {
        bold: "600",
        extrabold: "600",
        black: "600",
      },
      backgroundImage: {
        'gradient-hero': 'var(--gradient-hero)',
        'gradient-card': 'var(--gradient-card)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "card": "var(--radius)",
        "input": "calc(var(--radius) - 2px)",
        "btn": "calc(var(--radius) - 2px)",
        "chip": "999px",
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
      },
      height: {
        'controle-sm': '28px',
        'controle-md': '32px',
        'controle-lg': '40px',
        'controle-toque': '44px',
        'linha-compacta': '36px',
        'linha-padrao': '44px',
      },
      fontSize: {
        'h1': ['1.75rem', { lineHeight: '2.125rem', fontWeight: '500', letterSpacing: '-0.015em' }],
        'h2': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '500' }],
        'section': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        'body': ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'table': ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'table-header': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
