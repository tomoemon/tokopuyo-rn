declare module 'xorshift' {
  export class XorShift {
    state: [number, number, number, number];
    constructor(seed: [number, number, number, number]);
    random(): number;
    randomint(): [number, number];
  }

  const xorshift: XorShift;
  export default xorshift;
}
