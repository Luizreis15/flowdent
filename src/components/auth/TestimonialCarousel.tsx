import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    name: "Dr. Carlos Mendes",
    role: "Ortodontista",
    clinic: "Clínica Sorrir Bem",
    text: "O Flowdent transformou completamente a gestão da minha clínica. Reduzi o tempo administrativo em 70% e posso focar no que realmente importa: meus pacientes.",
    rating: 5,
  },
  {
    name: "Dra. Ana Paula Silva",
    role: "Dentista Geral",
    clinic: "Odonto Center",
    text: "Nunca imaginei que gerenciar uma clínica pudesse ser tão simples. A agenda inteligente acabou com os problemas de faltas e o prontuário digital é perfeito.",
    rating: 5,
  },
  {
    name: "Dr. Ricardo Oliveira",
    role: "Implantodontista",
    clinic: "Clínica Excellence",
    text: "Tudo integrado em um só lugar! Desde o agendamento até o financeiro, consigo ter controle total. A melhor decisão que tomei para minha clínica.",
    rating: 5,
  },
  {
    name: "Dra. Juliana Costa",
    role: "Periodontista",
    clinic: "Dental Prime",
    text: "O suporte é excepcional e a plataforma é muito intuitiva. Minha equipe se adaptou em poucos dias e os resultados foram imediatos.",
    rating: 5,
  },
];

export default function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex((prev) => {
      if (newDirection === 1) {
        return (prev + 1) % testimonials.length;
      } else {
        return prev === 0 ? testimonials.length - 1 : prev - 1;
      }
    });
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center p-12">
      <div className="max-w-2xl w-full">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
            }}
            className="absolute inset-0 flex items-center justify-center p-12"
          >
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl">
              <div className="flex gap-1 mb-6">
                {Array.from({ length: testimonials[currentIndex].rating }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-white text-xl mb-8 leading-relaxed">
                "{testimonials[currentIndex].text}"
              </p>
              
              <div className="border-t border-white/20 pt-6">
                <p className="text-white font-semibold text-lg">
                  {testimonials[currentIndex].name}
                </p>
                <p className="text-white/80">
                  {testimonials[currentIndex].role}
                </p>
                <p className="text-white/60 text-sm mt-1">
                  {testimonials[currentIndex].clinic}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button
          onClick={() => paginate(-1)}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        
        <div className="flex items-center gap-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`h-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'w-8 bg-white'
                  : 'w-2 bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to testimonial ${index + 1}`}
            />
          ))}
        </div>
        
        <button
          onClick={() => paginate(1)}
          className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
          aria-label="Next testimonial"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
