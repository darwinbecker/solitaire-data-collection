import { Card } from './types'

export function fisherYatesShuffle(arr: Card[]): Card[] {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1)) // random index
    ;[arr[i], arr[j]] = [arr[j], arr[i]] // swap
  }
  return arr
}
