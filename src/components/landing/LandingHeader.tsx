import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Logo } from "@/components/brand/Logo";

export default function LandingHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-md py-4' : 'bg-transparent py-6'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Logo className="h-8 md:h-9" />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button 
              onClick={() => scrollToSection('home')}
              className="text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition"
            >
              Home
            </button>
            
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] bg-transparent">
                    Recursos
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[400px] p-4 bg-white">
                      <Link 
                        to="/recursos/agenda" 
                        className="block p-3 hover:bg-[hsl(var(--cloud-white))] rounded-md transition"
                      >
                        <h4 className="font-semibold text-[hsl(var(--flowdent-blue))] mb-1">Agenda Inteligente</h4>
                        <p className="text-sm text-[hsl(var(--slate-gray))]">Organize seus atendimentos com eficiência</p>
                      </Link>
                      <Link 
                        to="/recursos/prontuario" 
                        className="block p-3 hover:bg-[hsl(var(--cloud-white))] rounded-md transition"
                      >
                        <h4 className="font-semibold text-[hsl(var(--flowdent-blue))] mb-1">Prontuário Digital</h4>
                        <p className="text-sm text-[hsl(var(--slate-gray))]">Histórico completo e seguro dos pacientes</p>
                      </Link>
                      <Link 
                        to="/recursos/documentos" 
                        className="block p-3 hover:bg-[hsl(var(--cloud-white))] rounded-md transition"
                      >
                        <h4 className="font-semibold text-[hsl(var(--flowdent-blue))] mb-1">Gestão de Documentos</h4>
                        <p className="text-sm text-[hsl(var(--slate-gray))]">Receitas, atestados e contratos automatizados</p>
                      </Link>
                      <Link 
                        to="/recursos/financeiro" 
                        className="block p-3 hover:bg-[hsl(var(--cloud-white))] rounded-md transition"
                      >
                        <h4 className="font-semibold text-[hsl(var(--flowdent-blue))] mb-1">Controle Financeiro</h4>
                        <p className="text-sm text-[hsl(var(--slate-gray))]">Gerencie pagamentos e faturamento</p>
                      </Link>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            <Link 
              to="/precos"
              className="text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition"
            >
              Preços
            </Link>

            <button 
              onClick={() => scrollToSection('depoimentos')}
              className="text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition"
            >
              Depoimentos
            </button>

            <button 
              onClick={() => scrollToSection('contato')}
              className="text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition"
            >
              Contato
            </button>
          </nav>

          {/* CTAs Desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <a 
              href="https://app.flowdent.com.br/auth" 
              className="text-[hsl(var(--flowdent-blue))] hover:text-[hsl(var(--flow-turquoise))] transition font-semibold"
            >
              Entrar
            </a>
            <Button 
              asChild
              className="bg-[hsl(var(--flowdent-blue))] text-white hover:bg-[hsl(var(--flow-turquoise))] transition-colors"
            >
              <a href="https://app.flowdent.com.br/cadastro">Inicie de Graça</a>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-[hsl(var(--slate-gray))]"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="md:hidden mt-4 bg-white rounded-lg shadow-lg border border-gray-100 relative z-50"
            >
              <nav className="flex flex-col space-y-4 py-4">
                <button 
                  onClick={() => scrollToSection('home')}
                  className="text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition text-left"
                >
                  Home
                </button>
                
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-[hsl(var(--slate-gray))] mb-2">Recursos</p>
                  <Link 
                    to="/recursos/agenda"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block pl-4 text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition text-left"
                  >
                    Agenda Inteligente
                  </Link>
                  <Link 
                    to="/recursos/prontuario"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block pl-4 text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition text-left"
                  >
                    Prontuário Digital
                  </Link>
                  <Link 
                    to="/recursos/documentos"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block pl-4 text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition text-left"
                  >
                    Gestão de Documentos
                  </Link>
                  <Link 
                    to="/recursos/financeiro"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block pl-4 text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition text-left"
                  >
                    Controle Financeiro
                  </Link>
                </div>

                <Link 
                  to="/precos"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition text-left"
                >
                  Preços
                </Link>
                
                <button 
                  onClick={() => scrollToSection('depoimentos')}
                  className="text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition text-left"
                >
                  Depoimentos
                </button>
                <button 
                  onClick={() => scrollToSection('contato')}
                  className="text-[hsl(var(--slate-gray))] hover:text-[hsl(var(--flowdent-blue))] transition text-left"
                >
                  Contato
                </button>
                <hr className="border-[hsl(var(--cloud-white))]" />
                <a href="https://app.flowdent.com.br/auth" className="text-[hsl(var(--flowdent-blue))] font-semibold">
                  Entrar
                </a>
                <Button asChild className="bg-[hsl(var(--flowdent-blue))] text-white w-full">
                  <a href="https://app.flowdent.com.br/cadastro">Inicie de Graça</a>
                </Button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
