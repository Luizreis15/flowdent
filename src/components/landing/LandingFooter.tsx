import { Facebook, Instagram, Linkedin, Youtube } from 'lucide-react';
import { Logo } from "@/components/brand/Logo";

export default function LandingFooter() {
  return (
    <footer className="bg-white border-t border-gray-200">
      {/* Seção Superior */}
      <div className="bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Logo e Descrição */}
            <div className="flex-1">
              <Logo className="h-8 mb-2" />
              <p className="text-sm text-gray-600">
                Desenvolvido pela Hera Digital em Santo André - São Paulo.<br />
                Gestão inteligente para clínicas odontológicas.
              </p>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-4">
              <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Verificado por</p>
                <p className="text-sm font-semibold text-gray-700">ReclameAQUI</p>
              </div>
              <a 
                href="#app-store" 
                className="bg-black text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition"
              >
                Baixe na App Store
              </a>
              <a 
                href="#google-play" 
                className="bg-black text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-800 transition"
              >
                Baixe na Google Play
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Links */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 max-w-5xl mx-auto">
          {/* Suporte */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Suporte</h4>
            <ul className="space-y-2.5">
              <li><a href="#demo" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Pedir demonstração</a></li>
              <li><a href="#duvidas" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Tire suas dúvidas</a></li>
              <li><a href="#ajuda" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Central de ajuda</a></li>
            </ul>
          </div>

          {/* Institucional */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Institucional</h4>
            <ul className="space-y-2.5">
              <li><a href="#sobre" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Sobre nós</a></li>
              <li><a href="#blog" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Blog Flowdent</a></li>
            </ul>
          </div>

          {/* Produto */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Produto</h4>
            <ul className="space-y-2.5">
              <li><a href="#planos" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Planos e preços</a></li>
              <li><a href="#contrato" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Contrato Odontológico</a></li>
              <li><a href="#depoimentos" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Depoimentos</a></li>
              <li><a href="#clube" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Flowdent Clube</a></li>
            </ul>
          </div>

          {/* Recursos 1 */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Recursos</h4>
            <ul className="space-y-2.5">
              <li><a href="#agenda" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Agenda odontológica</a></li>
              <li><a href="#prontuario" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Prontuário digital</a></li>
              <li><a href="#anamnese" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Anamnese inteligente</a></li>
            </ul>
          </div>

          {/* Recursos 2 */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4 text-sm">Recursos</h4>
            <ul className="space-y-2.5">
              <li><a href="#receita" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Receita digital</a></li>
              <li><a href="#financeiro" className="text-sm text-gray-600 hover:text-[hsl(var(--flow-turquoise))] transition">Gestão financeira</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Barra Inferior */}
      <div className="border-t border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* Copyright e Links */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-gray-500">
              <span>© 2025 Flowdent - Todos os direitos reservados</span>
              <span className="hidden md:inline">|</span>
              <a href="/termos" className="hover:text-[hsl(var(--flow-turquoise))] transition">Termos de uso</a>
              <span className="hidden md:inline">|</span>
              <a href="/privacidade" className="hover:text-[hsl(var(--flow-turquoise))] transition">Política de Privacidade</a>
            </div>

            {/* Redes Sociais */}
            <div className="flex gap-4">
              <a 
                href="https://facebook.com/flowdent" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[hsl(var(--flow-turquoise))] transition"
                aria-label="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a 
                href="https://instagram.com/flowdent" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-[hsl(var(--flow-turquoise))] transition"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-[hsl(var(--flow-turquoise))] transition"
                aria-label="YouTube"
              >
                <Youtube size={20} />
              </a>
              <a 
                href="#" 
                className="text-gray-400 hover:text-[hsl(var(--flow-turquoise))] transition"
                aria-label="LinkedIn"
              >
                <Linkedin size={20} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
