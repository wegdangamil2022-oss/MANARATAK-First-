// Minimal typed surface used by the existing installed renderer in interaction tests.
// This does not add a production dependency or claim the renderer's complete API.
declare module 'react-test-renderer' {
  import type {ReactElement} from 'react';
  export interface ReactTestInstance {
    children: Array<ReactTestInstance|string>;
    props: {onClick?:()=>void;[name:string]:unknown};
    findAllByType(type:string):ReactTestInstance[];
  }
  export interface ReactTestRenderer {
    root:ReactTestInstance;
    toJSON():unknown;
    unmount():void;
  }
  export function create(element:ReactElement):ReactTestRenderer;
}
