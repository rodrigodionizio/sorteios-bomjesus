/**
 * CSS do bloco impresso da cartela — cópia fiel do preview aprovado
 * (`documentacao/previews/bingo-cartela-impressa-v2.html`).
 *
 * Fica em CSS puro, e não em classes do Tailwind, de propósito: o bloco é
 * deliberadamente NEUTRO (preto e branco, sem token de marca), porque a
 * arte do sorteio é impressa fora do sistema. Amarrá-lo ao design system
 * do painel faria a próxima mudança de tema vazar para dentro do papel.
 *
 * Qualquer alteração aqui muda um layout já aprovado — confirme antes.
 */
export const CARTELA_CSS = `
.folha-cartela {
  width: 210mm; height: 297mm; overflow: hidden;
  margin: 0 auto 30px; background: #fff; color: #111;
  padding: 12mm; display: flex; flex-direction: column;
  font-family: var(--font-antennacond), "Arial Narrow", Arial, sans-serif;
  box-shadow: 0 18px 48px -22px rgba(0,0,0,.5);
}
.folha-cartela * { box-sizing: border-box; }

/* Espaço da arte do sorteio: some por completo na impressão. */
.area-arte {
  flex: 1 1 auto; min-height: 0;
  border: 1px dashed #cfc4b4; border-radius: 6px;
  display: grid; place-items: center; text-align: center;
  color: #b3a595; font-size: 12px; line-height: 1.5; padding: 12px;
  margin-bottom: 8mm;
}

.bloco { flex: none; border-top: 1.5px solid #111; padding-top: 5px; }
.bloco-topo { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.cartela-num { font-size: 15px; font-weight: 800; letter-spacing: .02em; }
.cartela-num b { font-size: 20px; font-weight: 900; font-variant-numeric: tabular-nums; }
.selo-topo { font-family: ui-monospace, "Courier New", monospace; font-size: 9.5px; color: #555; }

.quadros { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.quadro { border: 1.2px solid #111; padding: 5px 6px 6px; }
.quadro-topo { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.quadro-premio { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .05em; }
.quadro-cod { font-family: ui-monospace, "Courier New", monospace; font-size: 9px; color: #555; }

table.grade { width: 100%; border-collapse: collapse; table-layout: fixed; }
table.grade th {
  font-size: 15px; font-weight: 800; letter-spacing: .06em;
  padding: 2px 0 3px; border: 1px solid #111; border-bottom-width: 1.2px;
  background: none; color: #111;
}
table.grade td {
  height: 30px; text-align: center; vertical-align: middle;
  font-size: 15.5px; font-weight: 700; font-variant-numeric: tabular-nums;
  border: 1px solid #111;
}
td.centro { padding: 2px; }
.celula-logo { display: block; width: 20px; height: 20px; margin: 0 auto; }

.faixa-qr {
  grid-column: 1 / -1; border: 1.2px solid #111;
  display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center;
  padding: 6px 8px;
}
.faixa-pix { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: center; }
.faixa-carimbo { border-left: 1px solid #bbb; padding-left: 10px; display: grid; place-items: center; }
.qr { width: 22mm; height: 22mm; flex: none; }
.qr svg { display: block; width: 100%; height: 100%; }
.qr-texto .rot { font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }
.qr-texto .instrucao { font-size: 10px; margin-top: 1px; line-height: 1.35; color: #555; }
/* Pesos contidos: em corpo pequeno, negrito cheio empasta na impressão. */
.qr-texto .instrucao b { font-weight: 600; color: #111; }
.qr-texto dl { margin: 4px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 1px 6px; }
.qr-texto dt { font-size: 9.5px; font-weight: 600; }
.qr-texto dd { margin: 0; font-size: 9.5px; }
.qr-texto dd.msg { font-family: ui-monospace, "Courier New", monospace; font-weight: 600; }

.canhoto { margin-top: 6mm; border-top: 1.2px dashed #111; padding-top: 3px; }
.canhoto-aviso { font-size: 8px; text-transform: uppercase; letter-spacing: .14em; color: #888; text-align: center; margin-bottom: 5px; }
.canhoto-corpo { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: end; }
.campos { display: grid; gap: 7px; }
.campo { display: grid; grid-template-columns: auto 1fr; gap: 6px; align-items: end; font-size: 11px; }
.campo .rot { font-weight: 600; }
.campo .linha { border-bottom: 1px solid #111; height: 13px; }

.carimbo {
  border: 1.2px dashed #111; padding: 6px 10px;
  font-family: ui-monospace, "Courier New", monospace; transform: rotate(-1.2deg);
  display: grid; grid-template-columns: auto auto; gap: 9px; align-items: center;
}
.carimbo .marca { display: grid; place-items: center; border-right: 1px solid #bbb; padding-right: 9px; }
.carimbo-logo { display: block; width: 11mm; height: 11mm; }
.carimbo .dados { text-align: center; }
.carimbo .doc { font-size: 7.5px; letter-spacing: .06em; color: #555; }
.carimbo .cod { font-size: 15px; font-weight: 900; letter-spacing: .06em; }
.carimbo .cart { font-size: 9px; font-weight: 700; margin-top: 1px; }

@media print {
  @page { size: A4; margin: 0; }
  html, body { width: 210mm; margin: 0; background: #fff; padding: 0; }
  .folha-cartela {
    box-shadow: none; margin: 0; width: 210mm; height: 297mm; overflow: hidden;
    break-after: page; page-break-after: always;
  }
  .folha-cartela:last-of-type { break-after: auto; page-break-after: auto; }
  .area-arte { border: none; color: transparent; }
  .quadro, .faixa-qr, .canhoto, .carimbo { break-inside: avoid; page-break-inside: avoid; }
}
`;
