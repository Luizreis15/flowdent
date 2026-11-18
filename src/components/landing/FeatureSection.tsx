import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight } from 'lucide-react';

interface FeatureSectionProps {
  badge: string;
  title: string;
  description: string;
  benefits: string[];
  ctaText: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition: 'left' | 'right';
  id?: string;
}

export default function FeatureSection({
  badge,
  title,
  description,
  benefits,
  ctaText,
  imageSrc,
  imageAlt,
  imagePosition,
  id,
}: FeatureSectionProps) {
  const reduceMotion = useReducedMotion();
  const isImageLeft = imagePosition === 'left';

  return (
    <section id={id} className={`relative scroll-mt-24 overflow-hidden border-t border-slate-100 py-14 lg:py-20 ${isImageLeft ? "bg-slate-50" : "bg-white"}`}>
      <div className="container mx-auto px-4">
        <div className={`grid md:grid-cols-2 gap-6 lg:gap-10 items-center ${isImageLeft ? 'md:flex-row-reverse' : ''}`}>
          {/* Content Column */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: isImageLeft ? 24 : -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className={`space-y-4 ${isImageLeft ? 'md:order-2' : ''}`}
          >
            {/* Badge */}
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: -12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Badge className="bg-[hsl(var(--flow-turquoise)/0.1)] text-teal-800 border border-[hsl(var(--flow-turquoise)/0.3)] px-4 py-2 text-sm font-semibold">
                {badge}
              </Badge>
            </motion.div>

            {/* Title */}
            <h2 className="text-4xl font-bold text-[hsl(var(--slate-gray))] leading-tight">
              {title}
            </h2>

            {/* Description */}
            <p className="text-lg text-[hsl(var(--silver-cloud))] leading-relaxed">
              {description}
            </p>

            {/* Benefits List */}
            <ul className="space-y-3">
              {benefits.map((benefit, index) => (
                <motion.li
                  key={index}
                  initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[hsl(var(--flow-turquoise)/0.1)] flex items-center justify-center mt-1">
                    <Check className="w-4 h-4 text-[hsl(var(--flow-turquoise))]" />
                  </div>
                  <span className="text-[hsl(var(--slate-gray))]">{benefit}</span>
                </motion.li>
              ))}
            </ul>

            {/* CTA */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button 
                asChild
                className="bg-[hsl(var(--flowdent-blue))] text-white hover:bg-[hsl(var(--flow-turquoise))] transition-all duration-300 shadow-lg"
                size="lg"
              >
                <a href="https://app.flowdent.com.br/cadastro">
                  {ctaText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </motion.div>
          </motion.div>

          {/* Image Column */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: isImageLeft ? -24 : 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className={isImageLeft ? 'md:order-1' : ''}
          >
            <div className="relative">
              <img
                src={imageSrc}
                alt={imageAlt}
                loading="lazy"
                decoding="async"
                className="w-full rounded-2xl shadow-2xl"
              />
              {/* Decorative Gradient */}
              <div 
                className={`absolute ${isImageLeft ? '-left-10' : '-right-10'} top-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-[hsl(var(--flow-turquoise)/0.2)] to-[hsl(var(--health-mint)/0.2)] rounded-full blur-3xl -z-10`}
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
