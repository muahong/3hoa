/* Bộ kiểm tra JSON Schema tối giản (không cần thư viện ngoài), đủ cho docs/du-an-toan-2-3/spec/06-su-kien-v1.schema.json:
   type, required, properties, items, enum, const, pattern, minimum, maximum, allOf, if/then, format date-time.
   Dùng: const { validate } = require('./lib/schema-lite.js'); const loi = validate(schema, obj); // [] nếu hợp lệ */
'use strict';

function kieuCua(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function hopKieu(v, t) {
  const k = kieuCua(v);
  if (t === 'number') return k === 'number' || k === 'integer';
  return k === t;
}

function validate(schema, v, duong, loi) {
  duong = duong || '$';
  loi = loi || [];
  if (!schema || typeof schema !== 'object') return loi;
  if ('const' in schema && JSON.stringify(v) !== JSON.stringify(schema.const)) loi.push(duong + ': phải bằng ' + JSON.stringify(schema.const));
  if (schema.enum && !schema.enum.some((x) => JSON.stringify(x) === JSON.stringify(v))) loi.push(duong + ': ' + JSON.stringify(v) + ' không nằm trong enum');
  if (schema.type) {
    const ts = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!ts.some((t) => hopKieu(v, t))) { loi.push(duong + ': sai kiểu, cần ' + ts.join('|') + ', có ' + kieuCua(v)); return loi; }
  }
  if (typeof v === 'string') {
    if (schema.pattern && !new RegExp(schema.pattern).test(v)) loi.push(duong + ': "' + v + '" không khớp ' + schema.pattern);
    if (schema.format === 'date-time' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v)) loi.push(duong + ': không phải date-time');
  }
  if (typeof v === 'number') {
    if (schema.minimum != null && v < schema.minimum) loi.push(duong + ': nhỏ hơn ' + schema.minimum);
    if (schema.maximum != null && v > schema.maximum) loi.push(duong + ': lớn hơn ' + schema.maximum);
  }
  if (kieuCua(v) === 'object') {
    (schema.required || []).forEach((k) => { if (!(k in v)) loi.push(duong + ': thiếu ' + k); });
    Object.keys(schema.properties || {}).forEach((k) => { if (k in v) validate(schema.properties[k], v[k], duong + '.' + k, loi); });
  }
  if (Array.isArray(v) && schema.items) v.forEach((x, i) => validate(schema.items, x, duong + '[' + i + ']', loi));
  (schema.allOf || []).forEach((s) => validate(s, v, duong, loi));
  if (schema.if) {
    const khop = validate(schema.if, v, duong, []).length === 0;
    if (khop && schema.then) validate(schema.then, v, duong, loi);
    if (!khop && schema.else) validate(schema.else, v, duong, loi);
  }
  return loi;
}

module.exports = { validate };
