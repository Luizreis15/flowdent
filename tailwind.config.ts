import type { Config } from "tailwindcss";

/*
 * As telas usam cores cruas do Tailwind (bg-green-600, text-blue-500…) em mais de 500
 * lugares, fora da paleta fechada. Cada família é apontada para tokens que JÁ existem
 * (ementa de identidade, seção 3): nenhuma cor nova é criada.
 *   azuis e roxos → rampa tinta · teal/ciano → rampa acento · cinzas → rampa bone
 *   verdes → sinal-ok · vermelhos → sinal-alerta · âmbar/laranja/amarelo → sinal-espera
 */
const PASSOS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const token = (nome: string) => `hsl(var(--${nome}) / <alpha-value>)`;
const rampaDe = (prefixo: string, maior = 950) =>
  Object.fromEntries(PASSOS.map((p) => [p, token(`${prefixo}-${Math.min(p, maior)}`)]));
const sinal = (nome: string) =>
  Object.fromEntries(PASSOS.map((p) => [p, token(p <= 200 ? `${nome}-tenue` : nome)]));

const tinta = rampaDe("tinta");
const acento = rampaDe("acento", 900);
const bone = rampaDe("bone");
const ok = sinal("sinal-ok");
const alerta = sinal("sinal-alerta");
const espera = sinal("sinal-espera");

const coresDaPaleta = {
  blue: tinta, sky: tinta, indigo: tinta, purple: tinta, violet: tinta, fuchsia: tinta, pink: tinta,
  teal: acento, cyan: acento,
  gray: bone, slate: bone, zinc: bone, neutral: bone, stone: bone,
  green: ok, emerald: ok, lime: ok,
  red: alerta, rose: alerta,
  amber: espera, orange: espera, yellow: espera,
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
        ...coresDaPaleta,
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
        'h1': ['1.625rem', { lineHeight: '2rem', fontWeight: '700', letterSpacing: '-0.01em' }],
        'h2': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'section': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body': ['0.9375rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'table': ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'table-header': ['0.8125rem', { lineHeight: '1.125rem', fontWeight: '600', letterSpacing: '0.02em' }],
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
      // Movimento: uma curva só para o app inteiro (saída rápida, chegada suave) e 150 ms por padrão.
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.2, 0, 0, 1)",
        padrao: "cubic-bezier(0.2, 0, 0, 1)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s cubic-bezier(0.2, 0, 0, 1)",
        "accordion-up": "accordion-up 0.2s cubic-bezier(0.2, 0, 0, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
