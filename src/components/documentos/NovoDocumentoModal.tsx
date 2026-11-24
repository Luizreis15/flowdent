import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Trash2, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NovoDocumentoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  documentType: string | null;
}

const documentTitles: Record<string, string> = {
  contrato: "Contrato",
  termo_consentimento: "Termo de Consentimento",
  receituario: "Receituário",
  atestado: "Atestado",
  personalizado: "Documento Personalizado",
};

// Banco de procedimentos odontológicos com seus termos de consentimento
const procedimentos: Record<string, { nome: string; categoria: string; termo: string }> = {
  raspagem: {
    nome: "Raspagem",
    categoria: "Prevenção",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o procedimento de RASPAGEM E POLIMENTO DENTAL, seus objetivos, benefícios, riscos e possíveis complicações.

**OBJETIVO DO PROCEDIMENTO:**
A raspagem dental visa remover placa bacteriana, tártaro e manchas superficiais dos dentes, promovendo saúde bucal e prevenindo doenças periodontais.

**BENEFÍCIOS ESPERADOS:**
- Remoção de tártaro e placa bacteriana
- Prevenção de gengivite e periodontite
- Melhora da saúde gengival
- Redução de mau hálito

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Sensibilidade temporária nos dentes
- Pequeno sangramento gengival
- Desconforto leve durante o procedimento

**CONSENTIMENTO:**
Declaro que tive a oportunidade de fazer todas as perguntas necessárias e que todas foram respondidas de forma satisfatória. Autorizo a realização do procedimento acima descrito.`
  },
  restauracao: {
    nome: "Restauração",
    categoria: "Restauradora",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o procedimento de RESTAURAÇÃO DENTAL.

**OBJETIVO DO PROCEDIMENTO:**
Restaurar a estrutura, função e estética do dente afetado por cárie ou fratura, utilizando materiais restauradores adequados.

**BENEFÍCIOS ESPERADOS:**
- Eliminação da cárie
- Recuperação da função mastigatória
- Restauração da estética dental
- Prevenção de complicações futuras

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Sensibilidade pós-operatória (temporária ou permanente)
- Necessidade de tratamento de canal em casos de cáries profundas
- Possível necessidade de substituição da restauração no futuro
- Fratura do dente ou da restauração

**CONSENTIMENTO:**
Estou ciente de que o sucesso do tratamento depende também dos meus cuidados de higiene bucal e comparecimento às consultas de manutenção. Autorizo a realização do procedimento.`
  },
  extracao: {
    nome: "Extração dentária",
    categoria: "Cirurgia",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o procedimento de EXTRAÇÃO DENTÁRIA.

**OBJETIVO DO PROCEDIMENTO:**
Remoção do elemento dental quando não há possibilidade de tratamento conservador, visando eliminar focos de infecção e dor.

**BENEFÍCIOS ESPERADOS:**
- Eliminação de dor e infecção
- Prevenção de complicações sistêmicas
- Preparação para reabilitação protética

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Dor e edema pós-operatórios
- Sangramento
- Infecção pós-operatória
- Lesão de estruturas adjacentes
- Comunicação buco-sinusal (em extrações superiores)
- Parestesia (perda temporária ou permanente de sensibilidade)
- Fratura radicular ou óssea
- Alveolite (inflamação do alvéolo)

**CUIDADOS PÓS-OPERATÓRIOS:**
Fui orientado(a) sobre os cuidados necessários após a extração e comprometo-me a seguí-los rigorosamente.

**CONSENTIMENTO:**
Autorizo a realização do procedimento cirúrgico de extração dentária, estando ciente de todos os riscos envolvidos.`
  },
  implante: {
    nome: "Implantes dentários",
    categoria: "Implantodontia",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o tratamento com IMPLANTES DENTÁRIOS.

**OBJETIVO DO PROCEDIMENTO:**
Instalação de implantes dentários de titânio no osso maxilar ou mandibular para posterior reabilitação protética, visando restabelecer função mastigatória e estética.

**FASES DO TRATAMENTO:**
1. Fase cirúrgica: instalação do implante
2. Período de osseointegração (3 a 6 meses)
3. Fase protética: confecção e instalação da coroa/prótese

**BENEFÍCIOS ESPERADOS:**
- Restauração da função mastigatória
- Melhora da estética facial
- Preservação do osso alveolar
- Maior conforto comparado a próteses removíveis
- Durabilidade a longo prazo

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Dor, edema e hematomas pós-operatórios
- Sangramento
- Infecção
- Lesão de estruturas anatômicas (nervos, seio maxilar)
- Parestesia temporária ou permanente
- Falha na osseointegração
- Perda do implante (5-10% dos casos)
- Complicações protéticas
- Peri-implantite

**CONTRAINDICAÇÕES:**
Algumas condições podem comprometer o sucesso do tratamento, como: tabagismo, diabetes não controlada, doenças sistêmicas graves, radioterapia prévia, uso de medicamentos como bisfosfonatos.

**CUSTOS:**
Estou ciente de que o tratamento envolve custos significativos e que, em caso de falha, novos procedimentos podem ser necessários.

**CONSENTIMENTO:**
Declaro ter compreendido todas as informações e autorizo a realização do tratamento com implantes dentários.`
  },
  clareamento: {
    nome: "Clareamento dental",
    categoria: "Estética",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o procedimento de CLAREAMENTO DENTAL.

**OBJETIVO DO PROCEDIMENTO:**
Promover o clareamento dos dentes através da aplicação de agentes químicos específicos, melhorando a estética do sorriso.

**TIPOS DE CLAREAMENTO:**
- Clareamento em consultório (maior concentração, resultados mais rápidos)
- Clareamento caseiro supervisionado (moldeiras personalizadas)
- Técnica mista (combinação das anteriores)

**BENEFÍCIOS ESPERADOS:**
- Dentes mais brancos e claros
- Melhora da aparência estética
- Aumento da autoestima

**LIMITAÇÕES:**
- Restaurações, coroas e facetas não clareiam
- Resultados variam de acordo com a causa do escurecimento
- Alguns tipos de manchas respondem melhor que outros
- O resultado não é permanente

**RISCOS E EFEITOS COLATERAIS:**
- Sensibilidade dental transitória (comum)
- Irritação gengival leve
- Dor de dente temporária
- Resultado irregular em dentes com restaurações
- Necessidade de refazer restaurações após o clareamento

**CUIDADOS E RECOMENDAÇÕES:**
- Evitar alimentos e bebidas pigmentadas durante o tratamento
- Manter boa higiene bucal
- Seguir rigorosamente as orientações do profissional
- Não exceder o tempo de aplicação recomendado

**CONSENTIMENTO:**
Estou ciente das limitações e possíveis efeitos colaterais do procedimento e autorizo sua realização.`
  },
  canal: {
    nome: "Tratamento de canal",
    categoria: "Endodontia",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o TRATAMENTO ENDODÔNTICO (CANAL).

**OBJETIVO DO PROCEDIMENTO:**
Remover o tecido pulpar inflamado ou infectado do interior do dente, limpar, desinfetar e obturar os canais radiculares, preservando o elemento dental.

**INDICAÇÕES:**
- Pulpite irreversível (inflamação severa do nervo)
- Necrose pulpar (morte do nervo)
- Abscesso periapical
- Trauma dental
- Cáries profundas

**ETAPAS DO TRATAMENTO:**
1. Anestesia local
2. Isolamento absoluto do dente
3. Acesso à câmara pulpar
4. Remoção do tecido pulpar
5. Limpeza e modelagem dos canais
6. Obturação dos canais
7. Restauração coronária

**BENEFÍCIOS ESPERADOS:**
- Eliminação da dor e infecção
- Preservação do dente natural
- Manutenção da função mastigatória
- Prevenção de complicações sistêmicas

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Dor pós-operatória (geralmente controlada com medicação)
- Inflamação e edema
- Infecção persistente ou recorrente
- Fratura de instrumentos dentro do canal
- Perfuração da raiz
- Fratura dental durante ou após o tratamento
- Necessidade de retratamento
- Insucesso do tratamento (5-15% dos casos)
- Necessidade de cirurgia periapical
- Necessidade de extração em casos de insucesso

**ALTERNATIVAS:**
A alternativa ao tratamento de canal é a extração do dente, seguida de reabilitação protética (implante, prótese fixa ou removível).

**PROGNÓSTICO:**
O sucesso do tratamento depende de diversos fatores, incluindo: anatomia do canal, extensão da infecção, qualidade da restauração final e higiene bucal do paciente.

**CONSENTIMENTO:**
Autorizo a realização do tratamento endodôntico, estando ciente de que o procedimento não garante 100% de sucesso e que complicações podem ocorrer.`
  },
  protese: {
    nome: "Próteses dentárias",
    categoria: "Prótese",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o tratamento com PRÓTESES DENTÁRIAS.

**OBJETIVO DO PROCEDIMENTO:**
Restabelecer função mastigatória, fonética e estética através da confecção de próteses dentárias (fixas, removíveis ou totais).

**TIPOS DE PRÓTESE:**
- Prótese Total (Dentadura)
- Prótese Parcial Removível
- Prótese Fixa (Coroa, Ponte)
- Prótese sobre Implantes

**FASES DO TRATAMENTO:**
1. Planejamento e moldagens
2. Preparo dos dentes (se necessário)
3. Provas e ajustes
4. Instalação da prótese
5. Manutenção periódica

**BENEFÍCIOS ESPERADOS:**
- Restauração da função mastigatória
- Melhora da fala
- Recuperação da estética facial
- Aumento da autoestima
- Distribuição adequada das forças mastigatórias

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Período de adaptação (desconforto inicial)
- Dificuldade na fala e mastigação inicialmente
- Necessidade de ajustes frequentes
- Desgaste dos dentes suporte (próteses fixas)
- Inflamação gengival
- Quebra ou fratura da prótese
- Reabsorção óssea (próteses removíveis)
- Sensibilidade dental
- Cáries nos dentes adjacentes ou pilares

**CUIDADOS E MANUTENÇÃO:**
- Higiene rigorosa da prótese e dentes remanescentes
- Consultas periódicas de manutenção
- Possível necessidade de reembasamento (próteses removíveis)
- Troca da prótese após alguns anos de uso

**PROGNÓSTICO:**
A durabilidade da prótese depende dos cuidados do paciente, higiene bucal, consultas de manutenção e qualidade da confecção.

**CONSENTIMENTO:**
Declaro estar ciente de todas as informações e autorizo a confecção e instalação da prótese dentária.`
  },
  ortodontia_fixo: {
    nome: "Ortodontia - Aparelho fixo",
    categoria: "Ortodontia",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o tratamento ORTODÔNTICO COM APARELHO FIXO.

**OBJETIVO DO TRATAMENTO:**
Corrigir o posicionamento dos dentes e maxilares, promovendo melhora funcional, estética e da saúde bucal.

**DURAÇÃO DO TRATAMENTO:**
O tempo médio varia de 18 a 36 meses, podendo ser maior ou menor dependendo da complexidade do caso.

**FASES DO TRATAMENTO:**
1. Documentação ortodôntica completa
2. Instalação do aparelho
3. Ativações mensais
4. Remoção do aparelho
5. Contenção (manutenção dos resultados)

**BENEFÍCIOS ESPERADOS:**
- Alinhamento dos dentes
- Melhora da oclusão (mordida)
- Melhora da estética do sorriso
- Facilita a higiene bucal
- Melhora da função mastigatória
- Prevenção de problemas na ATM

**RESPONSABILIDADES DO PACIENTE:**
- Manter higiene bucal rigorosa
- Comparecer às consultas mensais
- Seguir orientações sobre alimentação
- Evitar alimentos duros e pegajosos
- Usar elásticos conforme orientação
- Informar sobre qualquer desconforto ou quebra de peças

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Desconforto e dor nos primeiros dias após ativações
- Aparecimento de aftas e feridas na mucosa
- Dificuldade inicial na higiene e alimentação
- Manchas brancas no esmalte (descalcificação) por higiene inadequada
- Cáries dentárias
- Inflamação gengival
- Reabsorção radicular
- Problemas na ATM
- Quebra de bráquetes ou bandas
- Necessidade de extrações dentárias
- Resultados não corresponderem totalmente ao esperado
- Necessidade de cirurgia ortognática em casos severos
- Recidiva (retorno dos dentes à posição original após tratamento)

**FASE DE CONTENÇÃO:**
Após a remoção do aparelho, é OBRIGATÓRIO o uso de contenção (fixa e/ou removível) para manter os resultados. O não uso da contenção pode levar à recidiva do tratamento.

**CONSENTIMENTO:**
Declaro estar ciente de minhas responsabilidades e dos riscos envolvidos. Autorizo o tratamento ortodôntico.`
  },
  ortodontia_movel: {
    nome: "Ortodontia - Aparelho removível",
    categoria: "Ortodontia",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o tratamento ORTODÔNTICO COM APARELHO REMOVÍVEL.

**OBJETIVO DO TRATAMENTO:**
Corrigir pequenos desalinhamentos dentários ou problemas ortopédicos dos maxilares, principalmente em pacientes em crescimento.

**INDICAÇÕES:**
- Correções leves de posicionamento dentário
- Expansão dos maxilares
- Correção de mordidas cruzadas
- Manutenção de espaços
- Contenção ortodôntica

**BENEFÍCIOS ESPERADOS:**
- Correção de problemas ortodônticos leves a moderados
- Facilidade de higiene (aparelho removível)
- Menor impacto estético
- Possibilidade de remoção para alimentação

**RESPONSABILIDADES DO PACIENTE:**
- Usar o aparelho pelo tempo diário recomendado (geralmente 20-22h/dia)
- Remover apenas para alimentação e higiene
- Higienizar corretamente o aparelho
- Armazenar em estojo adequado quando não estiver usando
- Comparecer às consultas de acompanhamento
- Comunicar imediatamente quebras ou perdas

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Resultados dependem totalmente da colaboração do paciente
- Desconforto inicial e excesso de salivação
- Dificuldade na fala inicialmente
- Irritação da mucosa bucal
- Perda ou quebra do aparelho
- Tratamento mais prolongado em caso de não colaboração
- Resultados limitados comparados ao aparelho fixo
- Necessidade de trocar para aparelho fixo

**IMPORTÂNCIA DA COLABORAÇÃO:**
O sucesso do tratamento com aparelho removível depende INTEIRAMENTE do uso correto pelo tempo recomendado. A não colaboração resultará em insucesso do tratamento.

**CONSENTIMENTO:**
Comprometo-me a usar o aparelho conforme orientado e autorizo o tratamento ortodôntico removível.`
  },
  lentes: {
    nome: "Lentes de contato dental",
    categoria: "Estética",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o tratamento com LENTES DE CONTATO DENTAL.

**OBJETIVO DO PROCEDIMENTO:**
Melhorar a estética do sorriso através da aplicação de lâminas ultrafinas de porcelana ou resina composta sobre a face vestibular dos dentes anteriores.

**TIPOS DE LENTES:**
- Lentes de Porcelana (mais resistentes e duráveis)
- Lentes de Resina Composta (mais acessíveis, menos duráveis)

**INDICAÇÕES:**
- Dentes com alteração de cor
- Dentes com pequenas fraturas
- Dentes com espaçamento (diastemas)
- Dentes levemente desalinhados
- Dentes com formato inadequado
- Dentes pequenos

**FASES DO TRATAMENTO:**
1. Planejamento e enceramento diagnóstico (smile design)
2. Preparo dental (quando necessário)
3. Moldagem e seleção de cor
4. Prova das lentes
5. Cimentação definitiva

**BENEFÍCIOS ESPERADOS:**
- Transformação estética imediata
- Dentes brancos e uniformes
- Correção de imperfeições dentárias
- Resultado natural e duradouro
- Mínimo desgaste dental

**LIMITAÇÕES E CONTRAINDICAÇÕES:**
- Não indicado para dentes muito escurecidos ou com grande destruição
- Não recomendado para pacientes com bruxismo severo
- Necessidade de boa higiene bucal
- Alto custo do tratamento
- Procedimento irreversível (quando há desgaste dental)

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Sensibilidade dental temporária ou permanente
- Fratura ou descolamento da lente
- Infiltração e cárie dental
- Alteração da cor da gengiva
- Resultado diferente do esperado
- Necessidade de substituição ao longo dos anos
- Impossibilidade de reverter o procedimento

**CUIDADOS E MANUTENÇÃO:**
- Evitar morder objetos duros
- Manter higiene bucal rigorosa
- Consultas periódicas de manutenção
- Evitar alimentos muito pigmentados (resina)
- Usar placa de bruxismo se necessário

**DURABILIDADE:**
Lentes de porcelana: 10-20 anos
Lentes de resina: 5-7 anos

**CONSENTIMENTO:**
Declaro estar ciente de que o procedimento é irreversível quando há desgaste dental e autorizo sua realização.`
  },
  facetas: {
    nome: "Facetas cerâmicas",
    categoria: "Estética",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o tratamento com FACETAS CERÂMICAS.

**OBJETIVO DO PROCEDIMENTO:**
Reabilitação estética através da confecção de lâminas de porcelana cimentadas sobre os dentes, proporcionando novo contorno, cor e formato.

**DIFERENÇA ENTRE FACETAS E LENTES:**
As facetas requerem maior desgaste dental (0.5-1.5mm), sendo indicadas para casos com maior comprometimento estético ou estrutural.

**INDICAÇÕES:**
- Alterações severas de cor
- Dentes fraturados
- Dentes desgastados
- Fechamento de espaços grandes
- Alteração de formato dental
- Dentes com grandes restaurações antigas

**FASES DO TRATAMENTO:**
1. Planejamento digital (smile design)
2. Preparo dos dentes (desgaste controlado)
3. Moldagem de precisão
4. Provisório estético
5. Prova das facetas
6. Cimentação adesiva

**BENEFÍCIOS ESPERADOS:**
- Transformação completa do sorriso
- Alta resistência e durabilidade
- Estabilidade de cor
- Resultado natural
- Biocompatibilidade

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Sensibilidade dental pós-operatória
- Necessidade de tratamento de canal
- Fratura da cerâmica
- Descolamento da faceta
- Infiltração marginal
- Cárie dental
- Retração gengival
- Resultado estético insatisfatório
- Procedimento IRREVERSÍVEL

**CUIDADOS E MANUTENÇÃO:**
- Higiene bucal rigorosa
- Evitar morder alimentos muito duros
- Uso de placa de bruxismo (quando indicado)
- Consultas periódicas de manutenção
- Polimento profissional anual

**DURABILIDADE:**
Com cuidados adequados: 15-20 anos ou mais

**CONSENTIMENTO:**
Estou ciente de que o procedimento é IRREVERSÍVEL e que os dentes preparados sempre necessitarão de algum tipo de recobrimento. Autorizo a realização do tratamento.`
  },
  cirurgia_mucocele: {
    nome: "Cirurgia para retirada de mucocele",
    categoria: "Cirurgia",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre a CIRURGIA PARA REMOÇÃO DE MUCOCELE.

**O QUE É MUCOCELE:**
Lesão benigna resultante do rompimento de glândula salivar menor, formando um cisto com acúmulo de saliva nos tecidos moles da boca.

**OBJETIVO DO PROCEDIMENTO:**
Remover cirurgicamente o cisto e as glândulas salivares comprometidas para evitar recidiva da lesão.

**INDICAÇÕES:**
- Mucocele que não regride espontaneamente
- Lesões recorrentes
- Desconforto ou dificuldade de fala/mastigação
- Tamanho aumentado da lesão

**TÉCNICA CIRÚRGICA:**
1. Anestesia local
2. Excisão completa da lesão
3. Remoção das glândulas salivares menores adjacentes
4. Sutura

**BENEFÍCIOS ESPERADOS:**
- Eliminação da lesão
- Melhora funcional e estética
- Baixa taxa de recidiva quando bem executada

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Dor e edema pós-operatórios
- Sangramento
- Infecção
- Hematoma
- Deiscência de sutura
- Recidiva da lesão (5-10% dos casos)
- Lesão de estruturas adjacentes
- Cicatriz hipertrófica

**CUIDADOS PÓS-OPERATÓRIOS:**
- Dieta líquida/pastosa nas primeiras 24-48h
- Higiene local cuidadosa
- Evitar trauma na região
- Medicação conforme prescrito
- Retorno para remoção de pontos (7-10 dias)

**CONSENTIMENTO:**
Autorizo a realização do procedimento cirúrgico, estando ciente dos riscos e benefícios.`
  },
  bichectomia: {
    nome: "Bichectomia",
    categoria: "Cirurgia",
    termo: `Eu, [NOME_PACIENTE], portador(a) do CPF [CPF_PACIENTE], DECLARO que fui devidamente informado(a) pelo(a) Dr(a). [NOME_PROFISSIONAL], inscrito(a) no CRO sob o nº [CRO_PROFISSIONAL], sobre o procedimento de BICHECTOMIA.

**OBJETIVO DO PROCEDIMENTO:**
Remoção parcial ou total da Bola de Bichat (gordura bucal) para afinamento facial e melhora do contorno do rosto.

**INDICAÇÕES:**
- Desejo de afinamento facial
- Rosto muito arredondado
- Mordedura frequente da mucosa jugal
- Finalidade estética

**CONTRAINDICAÇÕES:**
- Menores de 18 anos
- Gestantes
- Fumantes
- Pessoas muito magras
- Expectativas irreais quanto ao resultado

**TÉCNICA CIRÚRGICA:**
1. Anestesia local
2. Incisão intraoral (2-3cm)
3. Remoção da bola de Bichat
4. Sutura interna

**CARACTERÍSTICAS DO PROCEDIMENTO:**
- Duração: 30-60 minutos
- Cicatriz não visível (interna)
- Resultado gradual (3-6 meses)
- Procedimento irreversível

**BENEFÍCIOS ESPERADOS:**
- Afinamento do terço médio da face
- Rosto com aspecto mais alongado
- Contorno facial mais definido
- Redução de mordedura da mucosa

**RISCOS E COMPLICAÇÕES POSSÍVEIS:**
- Edema significativo (2-4 semanas)
- Hematomas e equimoses
- Assimetria facial
- Sangramento
- Infecção
- Lesão do ducto parotídeo
- Lesão do nervo facial (raro)
- Parestesia temporária
- Resultado insatisfatório
- Envelhecimento facial precoce (rosto cavado)
- Procedimento IRREVERSÍVEL

**RESULTADO:**
O resultado final aparece gradualmente entre 3 a 6 meses. O efeito é permanente, mas pode ser alterado por ganho significativo de peso ou envelhecimento natural.

**CUIDADOS PÓS-OPERATÓRIOS:**
- Dieta líquida/pastosa por 7 dias
- Repouso nas primeiras 48h
- Compressas frias
- Higiene bucal rigorosa
- Medicação conforme prescrito
- Evitar exposição solar

**CONSENTIMENTO:**
Estou ciente de que o procedimento é IRREVERSÍVEL e que os resultados podem não corresponder totalmente às minhas expectativas. Autorizo a realização da bichectomia.`
  },
};

// Procedimentos organizados por categoria
const categorias = Array.from(new Set(Object.values(procedimentos).map(p => p.categoria)));

const generateConsentTerm = (
  procedimentoKey: string,
  patient: any,
  professional: any,
  clinic: any
): string => {
  const proc = procedimentos[procedimentoKey];
  if (!proc) return "";

  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  let termo = proc.termo;
  
  // Substituir placeholders
  termo = termo.replace(/\[NOME_PACIENTE\]/g, patient.full_name || "[Nome do Paciente]");
  termo = termo.replace(/\[CPF_PACIENTE\]/g, patient.cpf || "[CPF do Paciente]");
  termo = termo.replace(/\[NOME_PROFISSIONAL\]/g, professional.nome || "[Nome do Profissional]");
  termo = termo.replace(/\[CRO_PROFISSIONAL\]/g, professional.cro || "[CRO]");
  
  // Cabeçalho do documento
  const header = `TERMO DE CONSENTIMENTO INFORMADO E ESCLARECIDO

${clinic.nome || "[Nome da Clínica]"}
${clinic.cnpj ? `CNPJ: ${clinic.cnpj}` : ""}

Data: ${today}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  // Rodapé com assinaturas
  const footer = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**DECLARAÇÃO FINAL:**

Declaro que li e compreendi todas as informações contidas neste termo, tive a oportunidade de fazer perguntas que foram respondidas satisfatoriamente, e estou assinando este documento de forma livre e esclarecida.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ASSINATURAS:**

_____________________________________________
**${patient.full_name || "[Nome do Paciente]"}**
CPF: ${patient.cpf || "[CPF]"}
PACIENTE

_____________________________________________
**${professional.nome || "[Nome do Profissional]"}**
CRO: ${professional.cro || "[CRO]"}
CIRURGIÃO-DENTISTA

${patient.responsible_name ? `
_____________________________________________
**${patient.responsible_name}**
CPF: ${patient.responsible_cpf || "[CPF]"}
RESPONSÁVEL LEGAL
` : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Este documento é emitido em 2 (duas) vias de igual teor e forma.*
*Documento gerado eletronicamente via Sistema - ${today}*`;

  return header + termo + footer;
};

export const NovoDocumentoModal = ({
  open,
  onOpenChange,
  patientId,
  documentType,
}: NovoDocumentoModalProps) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [patientData, setPatientData] = useState<any>(null);
  const [professionalData, setProfessionalData] = useState<any>(null);
  const [clinicData, setClinicData] = useState<any>(null);

  useEffect(() => {
    if (open && documentType) {
      const defaultTitle = documentTitles[documentType] || "Novo Documento";
      setTitle(defaultTitle);
      setContent("");
      setSelectedProcedure(null);
      setShowPreview(false);
      setSearchTerm("");
      loadData();
    }
  }, [open, documentType]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Usuário não autenticado");
        return;
      }

      // Buscar dados do paciente
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", patientId)
        .maybeSingle();

      if (patientError) {
        console.error("Erro ao buscar paciente:", patientError);
      } else if (patient) {
        console.log("Dados do paciente carregados:", patient);
        setPatientData(patient);
      }

      // Buscar dados do profissional
      const { data: professional, error: professionalError } = await supabase
        .from("profissionais")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (professionalError) {
        console.error("Erro ao buscar profissional:", professionalError);
      } else if (professional) {
        console.log("Dados do profissional carregados:", professional);
        setProfessionalData(professional);
      }

      // Buscar dados da clínica
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Erro ao buscar profile:", profileError);
      } else if (profile?.clinic_id) {
        const { data: clinic, error: clinicError } = await supabase
          .from("clinicas")
          .select("*")
          .eq("id", profile.clinic_id)
          .maybeSingle();

        if (clinicError) {
          console.error("Erro ao buscar clínica:", clinicError);
        } else if (clinic) {
          console.log("Dados da clínica carregados:", clinic);
          setClinicData(clinic);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados para o termo de consentimento");
    }
  };

  const handleSelectProcedure = (procKey: string) => {
    setSelectedProcedure(procKey);
    setSearchTerm("");
    
    // Gerar termo automaticamente
    if (!patientData || !professionalData || !clinicData) {
      console.error("Dados faltando:", { patientData, professionalData, clinicData });
      toast.error("Dados incompletos. Aguarde o carregamento ou reabra o formulário.");
      return;
    }
    
    try {
      const termo = generateConsentTerm(procKey, patientData, professionalData, clinicData);
      setContent(termo);
      setTitle(`Termo de Consentimento - ${procedimentos[procKey].nome}`);
      console.log("Termo gerado com sucesso");
    } catch (error) {
      console.error("Erro ao gerar termo:", error);
      toast.error("Erro ao gerar termo de consentimento");
    }
  };

  const handleVisualize = () => {
    setShowPreview(!showPreview);
  };

  const handleRemoveProcedure = () => {
    setSelectedProcedure(null);
    setContent("");
    setShowPreview(false);
  };

  const filteredProcedures = Object.entries(procedimentos).filter(([key, proc]) =>
    proc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    proc.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (status: "rascunho" | "finalizado") => {
    if (documentType === "termo_consentimento" && !selectedProcedure) {
      toast.error("Selecione um procedimento para gerar o termo de consentimento");
      return;
    }

    if (!title.trim() || !content.trim()) {
      toast.error("Preencha o título e o conteúdo do documento");
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: profile } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", user.id)
        .single();

      if (!profile?.clinic_id) throw new Error("Clínica não encontrada");

      const { error } = await supabase
        .from("patient_documents")
        .insert({
          patient_id: patientId,
          clinic_id: profile.clinic_id,
          document_type: documentType || "personalizado",
          title: title.trim(),
          content: content.trim(),
          created_by: user.id,
          status,
          metadata: selectedProcedure ? { procedimento: selectedProcedure } : {},
        });

      if (error) throw error;

      toast.success(
        status === "rascunho"
          ? "Documento salvo como rascunho"
          : "Documento finalizado com sucesso"
      );

      onOpenChange(false);
      setTitle("");
      setContent("");
      setSelectedProcedure(null);
    } catch (error: any) {
      console.error("Erro ao salvar documento:", error);
      toast.error("Erro ao salvar documento");
    } finally {
      setLoading(false);
    }
  };

  // Renderização específica para termo de consentimento
  if (documentType === "termo_consentimento") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Termo de Consentimento Informado e Esclarecido</DialogTitle>
            <DialogDescription>
              Selecione o procedimento para gerar automaticamente o termo de consentimento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto max-h-[60vh] px-1">
            {!selectedProcedure ? (
              <>
                <div className="space-y-2">
                  <Label>Digite para selecionar ou cadastrar o nome do tratamento</Label>
                  <Command className="border rounded-lg">
                    <CommandInput 
                      placeholder="Digite para buscar procedimento..."
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandEmpty>Nenhum procedimento encontrado.</CommandEmpty>
                    {categorias.map((categoria) => {
                      const procsCategoria = filteredProcedures.filter(([_, p]) => p.categoria === categoria);
                      if (procsCategoria.length === 0) return null;
                      
                      return (
                        <CommandGroup key={categoria} heading={categoria}>
                          {procsCategoria.map(([key, proc]) => (
                            <CommandItem
                              key={key}
                              onSelect={() => handleSelectProcedure(key)}
                              className="cursor-pointer"
                            >
                              {proc.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      );
                    })}
                  </Command>
                </div>

                <div className="text-sm text-muted-foreground border-l-4 border-primary/50 pl-4 py-2 bg-primary/5 rounded">
                  <p className="font-medium mb-1">ℹ️ Sobre o Termo de Consentimento</p>
                  <p>
                    O modelo de termo de consentimento livre e esclarecido faz parte das funcionalidades do sistema. 
                    O uso do modelo de termo de consentimento é opcional. A disponibilização do modelo não se configura 
                    em nenhuma hipótese como uma assessoria jurídica em qualquer circunstância.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm text-muted-foreground">Termo de consentimento para:</p>
                    <p className="font-semibold text-lg">{procedimentos[selectedProcedure].nome}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVisualize}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showPreview ? "Ocultar" : "Visualizar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveProcedure}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {showPreview && (
                  <div className="border rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">{content}</pre>
                  </div>
                )}

                <div className="text-sm text-muted-foreground border-l-4 border-primary/50 pl-4 py-2 bg-primary/5 rounded">
                  <p>
                    <strong>Conta pra gente, como foi sua experiência usando este novo recurso?</strong>
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Fechar
            </Button>
            {selectedProcedure && (
              <Button onClick={() => handleSave("finalizado")} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Termo"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Renderização padrão para outros tipos de documento
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Novo {documentType ? documentTitles[documentType] : "Documento"}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para criar o documento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] px-1">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Documento</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do documento"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite o conteúdo do documento..."
              className="min-h-[300px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSave("rascunho")}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Rascunho"
            )}
          </Button>
          <Button onClick={() => handleSave("finalizado")} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              "Finalizar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
