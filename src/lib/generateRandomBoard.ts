import { BASE_CLUB, BASE_DIAMOND, BASE_HEART, BASE_SPADE } from './data'
import { fisherYatesShuffle } from './fisherYatesShuffle'
import { Board, Card } from './types'

const SYMBOLS = ['♥', '♠', '♦', '♣']
const CARD_VALUES = [
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
]

const parseCardValue = (cardValue: string): number => {
  if (cardValue === 'A') return 1
  if (cardValue === 'J') return 11
  if (cardValue === 'Q') return 12
  if (cardValue === 'K') return 13
  if (cardValue === '00') return 0
  return parseInt(cardValue)
}
const parseCardSymbol = (symbol: string): string => {
  if (symbol === '♥') return 'Heart'
  if (symbol === '♠') return 'Spade'
  if (symbol === '♦') return 'Diamond'
  if (symbol === '♣') return 'Club'
  return symbol
}
const parseCardName = (cardValue: string, symbol: string): string => {
  if (cardValue === 'A') return `Ace ${parseCardSymbol(symbol)}`
  if (cardValue === 'J') return `Jack ${parseCardSymbol(symbol)}`
  if (cardValue === 'Q') return `Queen ${parseCardSymbol(symbol)}`
  if (cardValue === 'K') return `King ${parseCardSymbol(symbol)}`
  return `${cardValue} ${parseCardSymbol(symbol)}`
}

const getFullCardDeck = (): Card[] => {
  const cards: Card[] = []
  SYMBOLS.forEach((symbol) => {
    CARD_VALUES.forEach((cardValue) => {
      const card = {
        name: parseCardName(cardValue, symbol),
        shortName: `${cardValue}${symbol}`,
        symbol: symbol,
        color: symbol === '♠' || symbol === '♣' ? 'black' : 'red',
        value: parseCardValue(cardValue),
        hidden: true,
      }
      cards.push(card)
    })
  })

  return cards
}

const getShuffledCardDeck = (): Card[] => {
  const cards = getFullCardDeck()
  return fisherYatesShuffle(cards)
}

export const generateBoard = (): Board => {
  const cards = getShuffledCardDeck()

  const talon: Card[] = cards.slice(0, 24)
  const foundation: Card[][] = [
    [BASE_HEART],
    [BASE_SPADE],
    [BASE_DIAMOND],
    [BASE_CLUB],
  ]
  const tableau: Card[][] = [
    cards.slice(24, 25),
    cards.slice(25, 27),
    cards.slice(27, 30),
    cards.slice(30, 34),
    cards.slice(34, 39),
    cards.slice(39, 45),
    cards.slice(45, 52),
  ]
  tableau.forEach((column) => {
    column[column.length - 1].hidden = false
  })
  talon[talon.length - 1].hidden = false

  return {
    talon: talon,
    foundation: foundation,
    tableau: tableau,
  }
}

export default generateBoard
