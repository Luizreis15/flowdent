import {
  CalendarDays,
  CreditCard,
  FileCheck2,
  MessageCircle,
  Stethoscope,
} from "lucide-react";
import styles from "@/pages/Landing.module.css";

export function AgendaPreview() {
  return (
    <figure className={styles.figure}>
      <div className={styles.agenda}>
        <div className={styles.panelHead}>
          <CalendarDays size={18} aria-hidden="true" /> Agenda da clínica{" "}
          <span>Quarta, 18 nov.</span>
        </div>
        <div className={styles.panelBody}>
          <p className={styles.eyebrow}>Consulta do dia</p>
          <div className={styles.appointment}>
            <time>09:30</time>
            <div>
              <strong>Marina Alves</strong>
              <small>Avaliação clínica</small>
            </div>
            <span className={styles.paid}>Confirmada</span>
          </div>
          <div className={styles.activity}>
            <MessageCircle size={18} aria-hidden="true" />
            <div>
              <strong>Lembrete por WhatsApp</strong>
              <small>Enviado à paciente</small>
            </div>
          </div>
          <div className={styles.activity}>
            <CreditCard size={18} aria-hidden="true" />
            <div>
              <strong>Primeira parcela registrada</strong>
              <small>R$ 240,00</small>
            </div>
            <span className={styles.paid}>Pago</span>
          </div>
        </div>
      </div>
      <figcaption>Ilustração · dados fictícios</figcaption>
    </figure>
  );
}

const upper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const lower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export function Odontogram() {
  return (
    <figure className={styles.figure + " " + styles.odontogram}>
      <div className={styles.panelHead}>
        <Stethoscope size={18} aria-hidden="true" /> Odontograma{" "}
        <span>Marina Alves</span>
      </div>
      <div className={styles.teeth}>
        {[upper, lower].map((row) => (
          <div className={styles.toothRow} key={row[0]}>
            {row.map((tooth) => (
              <div
                key={tooth}
                className={tooth === 16 ? styles.selected : undefined}
              >
                <span>{tooth}</span>
                <svg viewBox="0 0 26 30" aria-hidden="true">
                  <path
                    d={
                      tooth % 10 >= 6
                        ? "M4 7C4 2 9 2 13 4c4-2 9-2 9 3v10c0 5-2 8-5 9l-4-3-4 3c-3-1-5-4-5-9Z"
                        : "M6 9c0-4 3-6 7-6s7 2 7 6v9c0 4-3 8-7 8s-7-4-7-8Z"
                    }
                  />
                </svg>
              </div>
            ))}
          </div>
        ))}
      </div>
      <figcaption>Dente 16 em avaliação · dados fictícios</figcaption>
    </figure>
  );
}

export function FinancePreview() {
  return (
    <figure className={styles.figure}>
      <div className={styles.finance}>
        <div className={styles.panelHead}>
          <FileCheck2 size={18} aria-hidden="true" /> Orçamento de Marina Alves
        </div>
        <div className={styles.balance}>
          <div>
            <small>Plano de tratamento</small>
            <strong>R$ 480,00</strong>
          </div>
          <span className={styles.paid}>Aprovado</span>
        </div>
        <div className={styles.installment}>
          <span>Parcela 01</span>
          <strong>R$ 240,00</strong>
          <span className={styles.paid}>Pago</span>
        </div>
        <div className={styles.installment}>
          <span>Parcela 02</span>
          <strong>R$ 240,00</strong>
          <span className={styles.pending}>A vencer</span>
        </div>
      </div>
      <figcaption>Ilustração · dados fictícios</figcaption>
    </figure>
  );
}
