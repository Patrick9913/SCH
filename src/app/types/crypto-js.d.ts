declare module 'crypto-js' {
  export interface WordArray {
    toString(encoder?: any): string;
  }

  export function SHA256(message: string, key?: string): WordArray;
  
  export const AES: any;
  export const enc: any;
  
  const CryptoJS: {
    SHA256: typeof SHA256;
    AES: any;
    enc: any;
  };
  
  export default CryptoJS;
}

