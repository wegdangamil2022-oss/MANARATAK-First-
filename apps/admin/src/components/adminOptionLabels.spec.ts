import{expect,it}from'vitest';import{adminOptionLabel}from'./adminOptionLabels';
it('localizes enum and language labels without changing the underlying value',()=>{const value='READY_TO_REVIEW';expect(adminOptionLabel(value)).toBe('جاهز للمراجعة');expect(value).toBe('READY_TO_REVIEW');expect(adminOptionLabel('English')).toBe('الإنجليزية');expect(adminOptionLabel('GLOBAL')).toBe('عام');});
it('preserves Arabic labels, proper names, reference codes and identifiers',()=>{for(const value of['نشط','جامعة صنعاء','Saylor University','USD','owner-2'])expect(adminOptionLabel(value)).toBe(value);});
