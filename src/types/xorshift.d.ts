declare module 'xorshift' {
  export class XorShift {
    _state0U: number;
    _state0L: number;
    _state1U: number;
    _state1L: number;
    constructor(seed: [number, number, number, number]);
    random(): number;
    randomint(): [number, number];
  }

  const xorshift: XorShift;
  export default xorshift;
}
