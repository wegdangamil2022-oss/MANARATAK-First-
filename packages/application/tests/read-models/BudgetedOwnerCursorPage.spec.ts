import {expect,it,vi} from 'vitest';
import {budgetedOwnerCursorPage} from '../../src/read-models/BudgetedOwnerCursorPage';
it('advances the actual owner cursor to requested page',async()=>{const read=vi.fn(async(cursor?:string)=>({data:[cursor??'first'],total:3,nextCursor:cursor===undefined?'b':cursor==='b'?'c':null}));expect((await budgetedOwnerCursorPage(read,3,1)).data).toEqual(['c']);expect(read.mock.calls).toEqual([[undefined],['b'],['c']]);});
it('does not repeat last owner rows past end',async()=>{const read=vi.fn(async()=>({data:['first'],total:1,nextCursor:null}));expect((await budgetedOwnerCursorPage(read,2,1)).data).toEqual([]);expect(read).toHaveBeenCalledTimes(1);});
it('rejects repeated cursor instead of silent repetition',async()=>{const read=async()=>({data:['x'],total:5,nextCursor:'same'});await expect(budgetedOwnerCursorPage(read,3,1)).rejects.toThrow('DID_NOT_ADVANCE');});
it('rejects page walks beyond explicit read budget before reads',async()=>{const read=vi.fn();await expect(budgetedOwnerCursorPage(read,26,1)).rejects.toThrow('BUDGET');expect(read).not.toHaveBeenCalled();});
