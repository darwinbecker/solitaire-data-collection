export type Card = {
  name: string
  shortName: string
  symbol: string
  color: string
  value: number
  image?: string | null
  hidden?: boolean | null
  classname?: string | null
}

export type Board = {
  moveThatCreatedThisBoard?: Move | null
  talon: (null | Card)[]
  foundation: Card[][]
  tableau: Card[][]
}

export type Move = {
  name: string
  from: 'talon' | 'foundation' | 'tableau' | string
  to: 'talon' | 'foundation' | 'tableau' | string
  cards: Card[]
  targetCard?: Card | null
  fromIndex: number
  toIndex: number
}

export type Result = {
  nodes: {
    currentNode: Node
    childNodes: Node[]
    bestNode: Node
    worstNode: Node
  }
  visits: number
  wins: number
  bestWinnabilityPercentage: number
  worstWinnabilityPercentage: number
  bestMove?: Move | null
  moves: Move[]
  duration: number
}

export type Node = {
  id: string
  visits: number
  wins: number
  winnabilityPercentage: number
  moveThatCreatedThisNode?: Move | null
}

export type Edge = {
  from: Node
  to: Node
  move: Move
  winnability: number
}

export type GameData = {
  gameType: 'Full-Random' | 'UCB1'
  gameID: string
  gameStatus: 'won' | 'lost' | 'impossible'
  resultsHistory: Result[]
  playedMoves: Move[]
}
