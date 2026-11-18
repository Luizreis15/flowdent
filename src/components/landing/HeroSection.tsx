import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/flowdent-hero.jpg';

export default function HeroSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="home" className="relative isolate overflow-hidden bg-gradient-to-br from-slate-50 via-white to-teal-50 pt-28 pb-16 lg:pt-36 lg:pb-24">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 top-0 -z-10 size-[36rem] rounded-full bg-sky-200/50 blur-3xl" />
      <div className="container mx-auto grid items-center gap-10 px-4 lg:grid-cols-[.83fr_1.17fr] xl:gap-16">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="space-y-5"
        >
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">Gestão para clínicas odontológicas</p>
          <h1 className="text-balance text-5xl font-extrabold leading-[1.02] tracking-tight text-slate-900 sm:text-6xl xl:text-7xl">
            A clínica flui.<br /><span className="text-[hsl(var(--flowdent-blue))]">Você cuida.</span>
          </h1>
          <p className="max-w-md text-lg leading-relaxed text-slate-700">
            Da consulta marcada ao pagamento registrado, conecte agenda, prontuário e financeiro em um só sistema. Feito por um cirurgião-dentista que vive a rotina da clínica.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 bg-[hsl(var(--flowdent-blue))] text-white hover:bg-blue-900">
              <a href="https://app.flowdent.com.br/cadastro">Testar grátis por 7 dias <ArrowRight className="ml-2 size-4" /></a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 border-slate-300 bg-white text-slate-800">
              <a href="#agenda">Ver como funciona <ArrowDown className="ml-2 size-4" /></a>
            </Button>
          </div>
        </motion.div>

        <motion.figure
          initial={reduceMotion ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: reduceMotion ? 0 : 0.12 }}
          className="relative m-0"
        >
          <div className="rounded-3xl border border-white/70 bg-gradient-to-br from-blue-800 via-blue-700 to-teal-500 p-3 shadow-2xl shadow-blue-900/20 sm:p-5">
            <img src={heroImage} alt="Mockup da interface de gestão do Flowdent" fetchPriority="high" className="block h-auto w-full rounded-xl" />
          </div>
          <motion.div
            initial={false}
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: 2, ease: 'easeInOut' }}
            className="absolute bottom-8 left-5 flex items-center gap-2 rounded-xl border border-teal-100 bg-white px-3 py-2 shadow-lg sm:-left-3 sm:bottom-9 sm:gap-3 sm:p-3"
          >
            <span className="rounded-lg bg-teal-100 p-2 text-teal-800"><MessageCircle className="size-4" /></span>
            <div><p className="text-xs font-semibold text-slate-900 sm:text-sm">Lembrete da consulta</p><p className="text-xs text-slate-600">Enviado pelo WhatsApp</p></div>
          </motion.div>
          <figcaption className="mt-3 text-right text-xs text-slate-600">Interface ilustrativa</figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
