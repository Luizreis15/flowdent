"use strict";

/*
 * Regras de design do Flowdent (ementa de identidade, paleta fechada).
 * Arquivo próprio do projeto: diferente de core-rules.cjs, pode ser editado.
 *
 * Verificam texto de classes em qualquer string ou template literal do arquivo,
 * que é onde o Tailwind lê as classes (className, cn(), cva(), mapas de variantes).
 */

// Utilitário de cor com valor arbitrário: bg-[#25D366], text-[hsl(var(--x))], border-l-[rgb(...)]
const COR_ARBITRARIA =
  /(?:^|[\s"'`:])(?:[a-z-]+:)*(?:bg|text|border(?:-[lrtbxy])?|from|to|via|ring|fill|stroke|outline|divide|shadow|decoration|placeholder|caret|accent)-\[(?:#|hsla?\(|rgba?\()/;
const DEGRADE = /(?:^|[\s"'`:])(?:[a-z-]+:)*bg-gradient-to-[a-z]+/;
const TRANSICAO_TOTAL = /(?:^|[\s"'`:])(?:[a-z-]+:)*transition-all(?=$|[\s"'`])/;

function regraDeTexto(padrao, mensagem, descricao) {
  return {
    meta: {
      type: "suggestion",
      docs: { description: descricao },
      messages: { proibido: mensagem },
      schema: [],
    },
    create(context) {
      const verificar = (node, texto) => {
        if (typeof texto === "string" && padrao.test(texto)) {
          context.report({ node, messageId: "proibido" });
        }
      };
      return {
        Literal(node) {
          verificar(node, node.value);
        },
        TemplateElement(node) {
          verificar(node, node.value && node.value.raw);
        },
      };
    },
  };
}

const noArbitraryColor = regraDeTexto(
  COR_ARBITRARIA,
  "Cor fora da paleta. Use os tokens (primary, acento-*, bone-*, sinal-*, clinico-*, acao-*), não valores arbitrários como bg-[#…] ou text-[hsl(…)].",
  "Proíbe cores arbitrárias em classes; a paleta da ementa é fechada.",
);

const noGradient = regraDeTexto(
  DEGRADE,
  "Degradê dentro do app. A ementa reserva degradê para a landing; no app use superfície do token (bg-card, bg-muted, bg-*-tenue).",
  "Aponta degradês em telas do app.",
);

const noTransitionAll = regraDeTexto(
  TRANSICAO_TOTAL,
  "transition-all anima propriedades de layout. Nomeie o que muda: transition-colors, transition-opacity, transition-transform.",
  "Aponta transition-all.",
);

module.exports = {
  rules: {
    "no-arbitrary-color": noArbitraryColor,
    "no-gradient": noGradient,
    "no-transition-all": noTransitionAll,
  },
};
