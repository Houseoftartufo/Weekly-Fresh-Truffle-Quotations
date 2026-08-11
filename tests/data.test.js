import { describe, expect, it } from 'vitest';
import { parsePrice, parseSheetCsv } from '../src/data.js';

describe('parsePrice', () => {
  it('parses European and formatted price values', () => {
    expect(parsePrice('€ 140/kg')).toBe(140);
    expect(parsePrice('1.250,50 EUR /kg')).toBe(1250.5);
    expect(parsePrice('130')).toBe(130);
    expect(parsePrice('')).toBeNull();
  });
});

describe('parseSheetCsv', () => {
  const csv = `key,it,en,fr,nl
week-label,Settimana 33,Week 33,Semaine 33,Week 33
updated-at,2026-08-12T08:15:00+02:00,2026-08-12T08:15:00+02:00,2026-08-12T08:15:00+02:00,2026-08-12T08:15:00+02:00
t1-attivo,si,yes,oui,ja
t1-nome,Tartufo Estivo,Summer Truffle,Truffe d'été,Zomertruffel
t1-latin,Tuber aestivum,Tuber aestivum,Tuber aestivum,Tuber aestivum
t1-prima,140,140,140,140
t1-standard,120,120,120,120
t1-unit,20–80 g,20–80 g,20–80 g,20–80 g
t1-desc,Fresco questa settimana,Fresh this week,Fraîche cette semaine,Vers deze week
t2-attivo,no,no,non,nee
t2-nome,Tartufo Nero,Black Truffle,Truffe Noire,Zwarte Truffel`;

  it('normalizes the current sheet structure into typed products', () => {
    const quotation = parseSheetCsv(csv, 'en');
    expect(quotation.marketLabel).toBe('Week 33');
    expect(quotation.products).toHaveLength(1);
    expect(quotation.products[0].name).toBe('Summer Truffle');
    expect(quotation.products[0].grades[0].amount).toBe(140);
    expect(quotation.products[0].grades[1].amount).toBe(120);
  });

  it('supports more than the previous four-product hard limit', () => {
    const extraRows = Array.from({ length: 8 }, (_, index) => {
      const i = index + 1;
      return `t${i}-attivo,si,yes,oui,ja\nt${i}-nome,Prodotto ${i},Product ${i},Produit ${i},Product ${i}\nt${i}-prima,${100 + i},${100 + i},${100 + i},${100 + i}`;
    }).join('\n');
    const dynamicCsv = `key,it,en,fr,nl\n${extraRows}`;
    expect(parseSheetCsv(dynamicCsv, 'en').products).toHaveLength(8);
  });
});
