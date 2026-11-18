import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';

export default function CTASection() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="contato" className="relative isolate overflow-hidden bg-gradient-to-br from-blue-950 via-blue-900 to-teal-800 px-4 py-16 text-white sm:py-24">
      <div aria-hidden="true" className="absolute -bottom-48 -right-32 -z-10 size-[32rem] rounded-full bg-teal-400/20 blur-3xl" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="mx-auto max-w-3xl text-center"
      >
        <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">Experimente o Flowdent na rotina da sua clínica.</h2>
        <p className="mx-auto mt-5 max-w-lg text-lg text-blue-100">Veja como a sua equipe pode conectar agendamentos, prontuários e pagamentos ao longo de 7 dias.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="h-12 bg-white text-blue-900 hover:bg-blue-50">
            <a href="https://app.flowdent.com.br/cadastro">Testar grátis por 7 dias <ArrowRight className="ml-2 size-4" /></a>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-12 border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white">
            <a href="https://wa.me/5511915519060?text=Ol%C3%A1%2C%20gostaria%20de%20agendar%20uma%20demonstra%C3%A7%C3%A3o%20do%20Flowdent." target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 size-4" /> Agendar demonstração</a>
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
