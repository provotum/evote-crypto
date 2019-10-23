const BN = require('bn.js')
const random = require('random')
const printConsole = false

import { PublicKey, Cipher } from './models'

export const generateKeys = (_p: number, _g: number): [PublicKey, any] => {
  const p = new BN(_p, 10)
  const g = new BN(_g, 10)
  const sk = new BN(random.int(1, _p - 2), 10)
  const h = g.pow(sk).mod(p)
  const pk = { p: p, g: g, h: h }

  return [pk, sk]
}

export const encrypt = (
  message: any,
  pk: PublicKey,
  log: boolean = false
): Cipher => {
  // generate a random value
  const randomValue = new BN(random.int(1, pk.p - 2), 10)
  log && console.log('enc secret   (r)', randomValue)

  // compute c1: generator^randomValue
  let c1 = pk.g.pow(randomValue).mod(pk.p)
  log && console.log('c1\t\t', c1)

  // compute s: h^randomValue whereby
  // h = publicKey => h = g^privateKeyOfReceiver (h is publically available)
  const s = pk.h.pow(randomValue).mod(pk.p)
  log && console.log('s\t\t', s)

  // compute mh: generator^message
  const mh = pk.g.pow(message).mod(pk.p)
  log && console.log('mh\t\t', mh)

  // compute c2: s*message_homomorphic
  const c2 = s.mul(mh).mod(pk.p)
  log && console.log('c2\t\t', c2)
  log && console.log('------------------------')

  return { c1: c1, c2: c2 }
}

export const add = (em1: Cipher, em2: Cipher, pk: PublicKey): Cipher => {
  return {
    c1: em1.c1.mul(em2.c1).mod(pk.p),
    c2: em1.c2.mul(em2.c2).mod(pk.p),
  }
}

export const decrypt1 = (
  cipherText: Cipher,
  sk: any,
  pk: PublicKey,
  log: boolean = false
): any => {
  let c1 = cipherText.c1
  let c2 = cipherText.c2

  // compute s: c1^privateKey
  let s = c1.pow(sk).mod(pk.p)
  log && console.log('s\t\t', s)

  // compute s^-1: the multiplicative inverse of s (probably the most difficult)
  let s_inverse = s.invm(pk.p)
  log && console.log('s^-1\t\t', s_inverse)

  // compute m: c2 * s^-1 | c2 / s
  let m_h = c2.mul(s_inverse).mod(pk.p)
  log && console.log('m_h\t\t', m_h)

  // 4.
  let m = new BN(1, 10)
  while (
    !pk.g
      .pow(m)
      .mod(pk.p)
      .eq(m_h)
  ) {
    m = m.add(new BN(1, 10))
  }

  log && console.log('plaintext d1\t', m)
  printConsole && console.log('------------------------')

  return m
}

export const decrypt2 = (
  cipherText: Cipher,
  sk: any,
  pk: PublicKey,
  log: boolean = false
): any => {
  let c1 = cipherText.c1
  let c2 = cipherText.c2

  // compute s: c1^privateKey
  let s = c1.pow(sk).mod(pk.p)
  log && console.log('s\t\t', s)

  // compute s^-1: the multiplicative inverse of s (probably the most difficult)
  let s_inverse = s.invm(pk.p)
  log && console.log('s^-1\t\t', s_inverse)

  // alternative computation
  // 1. compute p-2
  const pMinusX = pk.p.sub(new BN(2, 10))
  //const pMinusX = p.sub(new BN(2, 10));
  log && console.log('p - 2\t\t', pMinusX)

  // 2. compute pre-result s^(p-x)
  const sPowPMinusX = s.pow(pMinusX).mod(pk.p)
  log && console.log('s^(p-x)\t\t', sPowPMinusX)

  // 3. compute message - msg = c2*s^(p-x)
  let m_h = c2.mul(sPowPMinusX).mod(pk.p)
  log && console.log('msg_homo\t', m_h)

  let m = new BN(1, 10)
  while (
    !pk.g
      .pow(m)
      .mod(pk.p)
      .eq(m_h)
  ) {
    m = m.add(new BN(1, 10))
  }

  log && console.log('plaintext d2\t', m)
  log && console.log('------------------------')

  return m
}

const [pk, sk] = generateKeys(7, 3)

// plaintext check may be wrong as it is checked against the message from above
const m1 = new BN(2, 10)
const e_m1 = encrypt(m1, pk)
//const d_m1 = decrypt(e_m1, sk, p, gen);

const m2 = new BN(3, 10)
const e_m2 = encrypt(m2, pk)
//const d_m2 = decrypt(e_m2, sk, p, gen);

const d_sum = decrypt1(add(e_m1, e_m2, pk), sk, pk)
console.log(d_sum)