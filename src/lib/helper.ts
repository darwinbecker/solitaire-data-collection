import { Card, Board, Move, Node, Result, GameData } from './types'
import { BASE_HEART, BASE_SPADE, BASE_DIAMOND, BASE_CLUB } from './data'
import axios from 'axios'
import md5 from 'md5'

export function notUndefined<T>(value: T | undefined): value is T {
  return value !== undefined
}

export const getBaseCard = (card: Card) => {
  if (card.symbol === '♥') return BASE_HEART
  if (card.symbol === '♠') return BASE_SPADE
  if (card.symbol === '♦') return BASE_DIAMOND
  if (card.symbol === '♣') return BASE_CLUB
}

export const getFoundationLocation = (card: Card): number => {
  if (card.symbol === '♥') return 0
  if (card.symbol === '♠') return 1
  if (card.symbol === '♦') return 2
  if (card.symbol === '♣') return 3
  return 0
}

export const isAce = (card: Card) => {
  return card.value === 1
}

export const isKing = (card: Card) => {
  return card.value === 13
}

export const isOppositeColor = (card1: Card, card2: Card) => {
  return card1.color !== card2.color
}

export const isOneLess = (card1: Card, card2: Card) => {
  return card1.value === card2.value - 1
}

export const isOneMore = (card1: Card, card2: Card) => {
  return card1.value === card2.value + 1
}

export const isSameSymbol = (card1: Card, card2: Card) => {
  return card1.symbol === card2.symbol
}

export const revealCard = (board: Board, move: Move): Board => {
  const newBoard = structuredClone(board)
  if (move.from.startsWith('col')) {
    if (newBoard.tableau[move.fromIndex].length === 0) return newBoard
    newBoard.tableau[move.fromIndex][
      newBoard.tableau[move.fromIndex].length - 1
    ].hidden = false
  }
  return newBoard
}

export const isWon = (board: Board) => {
  return board.foundation.every(
    (foundationColumn) => foundationColumn.length === 14
  )
}

export const isLost = (board: Board) => {
  return getAllValidMoves(board).length === 0 && !isWon(board)
}

export const getAllMovesFromTalon = (board: Board): Move[] => {
  const talon = board.talon
  if (talon.length === 0) return []
  const talonMoves: Move[] = []
  talon.forEach((card, talonIndex) => {
    if (!card) return undefined
    // if card is an Ace, move to empty foundation
    if (isAce(card)) {
      const moveName =
        card.shortName +
        '(' +
        `talon` +
        ')' +
        ' [' +
        1 +
        ']' +
        ' -> ' +
        getBaseCard(card).shortName +
        '(' +
        `base-${getFoundationLocation(card)}` +
        ')'
      return talonMoves.push({
        id: moveName,
        name: moveName,
        from: 'talon',
        to: `base-${getFoundationLocation(card)}`,
        cards: [card],
        targetCard: getBaseCard(card),
        fromIndex: talonIndex,
        toIndex: getFoundationLocation(card),
        visits: 0,
        wins: 0,
      } as Move)
    }

    board.tableau.forEach((tableauColumn, tableauIndex) => {
      const otherCard =
        tableauColumn.length === 0
          ? null
          : tableauColumn[tableauColumn.length - 1]
      if (!otherCard) {
        if (!isKing(card)) return undefined

        const emptyColumnIndex = board.tableau.findIndex(
          (col) => col.length === 0
        )
        const moveName =
          card.shortName +
          '(' +
          `talon` +
          ')' +
          ' [' +
          1 +
          ']' +
          ' -> ' +
          'null' +
          '(' +
          `col-${emptyColumnIndex}` +
          ')'
        return talonMoves.push({
          id: moveName,
          name: moveName,
          from: 'talon',
          to: `col-${emptyColumnIndex}`,
          cards: [card],
          targetCard: null,
          fromIndex: tableauIndex,
          toIndex: emptyColumnIndex,
          visits: 0,
          wins: 0,
        } as Move)
      }

      // if card is opposite color and value is one less than other card, move card to other column
      if (isOppositeColor(card, otherCard) && isOneLess(card, otherCard)) {
        const moveName =
          card.shortName +
          '(' +
          `talon` +
          ')' +
          ' [' +
          1 +
          ']' +
          ' -> ' +
          otherCard.shortName +
          '(' +
          `col-${board.tableau.indexOf(tableauColumn)}` +
          ')'
        return talonMoves.push({
          id: moveName,
          name: moveName,
          from: 'talon',
          to: `col-${board.tableau.indexOf(tableauColumn)}`,
          cards: [card],
          targetCard: otherCard,
          fromIndex: tableauIndex,
          toIndex: board.tableau.indexOf(tableauColumn),
          visits: 0,
          wins: 0,
        } as Move)
      }

      return undefined
    })

    board.foundation.forEach((foundationColumn, foundationIndex) => {
      const otherCard =
        foundationColumn.length === 0
          ? null
          : foundationColumn[foundationColumn.length - 1]
      if (!otherCard) return undefined

      if (isSameSymbol(card, otherCard) && isOneMore(card, otherCard)) {
        const moveName =
          card.shortName +
          '(' +
          `talon` +
          ')' +
          ' [' +
          1 +
          ']' +
          ' -> ' +
          otherCard.shortName +
          '(' +
          `base-${getFoundationLocation(card)}` +
          ')'
        return talonMoves.push({
          id: moveName,
          name: moveName,
          from: 'talon',
          to: `base-${getFoundationLocation(card)}`,
          cards: [card],
          targetCard: otherCard,
          fromIndex: foundationIndex,
          toIndex: getFoundationLocation(card),
          visits: 0,
          wins: 0,
        } as Move)
      }

      return undefined
    })

    return undefined
  })

  return talonMoves
}
export const checkIfTalonContainsValidMoves = (board: Board): boolean => {
  return getAllMovesFromTalon(board).length > 0 ? true : false
}

export const getAllMovesFromTableau = (board: Board): Move[] => {
  const validMoves: Move[] = []

  // valid moves from tableau
  board.tableau.forEach((tableauColumn, tableuColumnIndex) => {
    const cardsThatAreRevealed = tableauColumn.filter((card) => !card.hidden)

    const cards =
      tableauColumn.length === 0
        ? null
        : cardsThatAreRevealed.length > 1
        ? cardsThatAreRevealed
        : [tableauColumn[tableauColumn.length - 1]] // get last card
    if (!cards) return

    const firstCardFromColumn = cards[0]
    const lastCardFromColumn = cards[cards.length - 1]

    // if card is an Ace, move to empty foundation
    if (isAce(lastCardFromColumn)) {
      const moveName =
        lastCardFromColumn.shortName +
        '(' +
        `col-${tableuColumnIndex}` +
        ')' +
        ' [' +
        1 +
        ']' +
        ' -> ' +
        getBaseCard(lastCardFromColumn).shortName +
        '(' +
        `base-${getFoundationLocation(lastCardFromColumn)}` +
        ')'
      validMoves.push({
        name: moveName,
        from: `col-${tableuColumnIndex}`,
        to: `base-${getFoundationLocation(lastCardFromColumn)}`,
        cards: [lastCardFromColumn],
        targetCard: getBaseCard(lastCardFromColumn),
        fromIndex: tableuColumnIndex,
        toIndex: getFoundationLocation(lastCardFromColumn),
      })
    }

    // move to foundation
    board.foundation.forEach((foundationColumn) => {
      const otherCard =
        foundationColumn.length === 1
          ? null
          : foundationColumn[foundationColumn.length - 1]
      if (!otherCard) return

      let cardForFoundation =
        cards.length > 1 ? lastCardFromColumn : firstCardFromColumn

      if (
        isSameSymbol(cardForFoundation, otherCard) &&
        isOneMore(cardForFoundation, otherCard)
      ) {
        const moveName =
          cardForFoundation.shortName +
          '(' +
          `col-${tableuColumnIndex}` +
          ')' +
          ' [' +
          1 +
          ']' +
          ' -> ' +
          otherCard.shortName +
          '(' +
          `base-${getFoundationLocation(cardForFoundation)}` +
          ')'
        validMoves.push({
          name: moveName,
          from: `col-${tableuColumnIndex}`,
          to: `base-${getFoundationLocation(cardForFoundation)}`,
          cards: [cardForFoundation],
          targetCard: otherCard,
          fromIndex: tableuColumnIndex,
          toIndex: getFoundationLocation(cardForFoundation),
        })
      }
    })

    const emptyColumnIndex = board.tableau.findIndex((col) => col.length === 0)
    // if card is a king and there is an empty column, move card to empty column
    // find index of king in tableauColumn
    const cardBelowKingIndex = tableauColumn.indexOf(firstCardFromColumn) - 1
    if (cardBelowKingIndex > -1) {
      const cardBelowKing = tableauColumn[cardBelowKingIndex]
      if (
        isKing(firstCardFromColumn) &&
        emptyColumnIndex !== -1 &&
        cardBelowKing.hidden
      ) {
        const moveName =
          cards[0].shortName +
          '(' +
          `col-${tableuColumnIndex}` +
          ')' +
          ' [' +
          1 +
          ']' +
          ' -> ' +
          'null' +
          '(' +
          `col-${emptyColumnIndex}` +
          ')'
        validMoves.push({
          name: moveName,
          from: `col-${tableuColumnIndex}`,
          to: `col-${emptyColumnIndex}`,
          cards: cards,
          targetCard: null,
          fromIndex: tableuColumnIndex,
          toIndex: emptyColumnIndex,
        })
      }
    }

    // move from tableau to tableau, but only if the card below is hidden or undefined
    const otherCards: Card[] = []
    const getAllPlaceableIndexes = board.tableau
      .map((tableauCol, tableauColIndex) => {
        const otherCard = tableauCol[tableauCol.length - 1]
        if (!otherCard) return

        // if card is opposite color and value is one less than other card, move card to other column
        if (
          isOppositeColor(firstCardFromColumn, otherCard) &&
          isOneLess(firstCardFromColumn, otherCard)
        ) {
          otherCards.push(otherCard)
          return tableauColIndex
        }
      })
      .filter(notUndefined)

    const indexOfCurrentCard = tableauColumn.indexOf(firstCardFromColumn)
    const cardBelow =
      indexOfCurrentCard > 0 ? tableauColumn[indexOfCurrentCard - 1] : undefined

    getAllPlaceableIndexes.forEach((placeableIndex, arrayIndex) => {
      if (!cardBelow || cardBelow.hidden) {
        const moveName =
          cards[0].shortName +
          '(' +
          `col-${tableuColumnIndex}` +
          ')' +
          ' [' +
          cards.length +
          ']' +
          ' -> ' +
          otherCards[arrayIndex].shortName +
          '(' +
          `col-${placeableIndex}` +
          ')'
        validMoves.push({
          name: moveName,
          from: `col-${tableuColumnIndex}`,
          to: `col-${placeableIndex}`,
          cards: cards,
          targetCard: otherCards[arrayIndex],
          fromIndex: tableuColumnIndex,
          toIndex: placeableIndex,
        })
      }
    })
  })

  return validMoves
}

export const getAllValidMoves = (board: Board): Move[] => {
  const talonMoves = getAllMovesFromTalon(board)
  const tableauMoves = getAllMovesFromTableau(board)
  // const moves = [...talonMoves, ...tableauMoves]
  // moves.sort(() => Math.random() - 0.5)
  return [...talonMoves, ...tableauMoves]
}

export const makeMove = (board: Board, move: Move): Board => {
  const newBoard = structuredClone(board)
  if (move.from.startsWith('col') && move.to.startsWith('base')) {
    const card = newBoard.tableau[move.fromIndex].pop()
    if (!card) return newBoard
    newBoard.foundation[move.toIndex].push(card)
  }
  if (move.from.startsWith('col') && move.to.startsWith('col')) {
    if (move.cards.length > 1) {
      const column = newBoard.tableau[move.fromIndex]
      const indexOfFirstMoveableCard = column.findIndex(
        (card) => card.name === move.cards[0].name
      )
      const cards = column.splice(indexOfFirstMoveableCard)

      if (!cards) return newBoard
      newBoard.tableau[move.toIndex].push(...cards)
    } else {
      const card = newBoard.tableau[move.fromIndex].pop()
      if (!card) return newBoard
      newBoard.tableau[move.toIndex].push(card)
    }
  }
  if (move.from === 'talon' && move.to.startsWith('base')) {
    const card = newBoard.talon.find(
      (card) => card?.shortName === move.cards[0].shortName
    )
    newBoard.talon = newBoard.talon.filter(
      (card) => card?.shortName !== move.cards[0].shortName
    )
    if (!card) return newBoard
    newBoard.foundation[move.toIndex].push(card)
  }
  if (move.from === 'talon' && move.to.startsWith('col')) {
    const card = newBoard.talon.find(
      (card) => card?.shortName === move.cards[0].shortName
    )
    newBoard.talon = newBoard.talon.filter(
      (card) => card?.shortName !== move.cards[0].shortName
    )
    if (!card) return newBoard
    newBoard.tableau[move.toIndex].push(card)
  }
  return newBoard
}

export const makeMoveAndReveal = (board: Board, move: Move): Board => {
  const newBoard = structuredClone(board)
  if (move.from.startsWith('col') && move.to.startsWith('base')) {
    const card = newBoard.tableau[move.fromIndex].pop()
    if (!card) return newBoard
    newBoard.foundation[move.toIndex].push(card)
  }
  if (move.from.startsWith('col') && move.to.startsWith('col')) {
    if (move.cards.length > 1) {
      const column = newBoard.tableau[move.fromIndex]
      const indexOfFirstMoveableCard = column.findIndex(
        (card) => card.name === move.cards[0].name
      )
      const cards = column.splice(indexOfFirstMoveableCard)

      if (!cards) return newBoard
      newBoard.tableau[move.toIndex].push(...cards)
    } else {
      const card = newBoard.tableau[move.fromIndex].pop()
      if (!card) return newBoard
      newBoard.tableau[move.toIndex].push(card)
    }
  }
  if (move.from === 'talon' && move.to.startsWith('base')) {
    const card = newBoard.talon.find(
      (card) => card?.shortName === move.cards[0].shortName
    )
    newBoard.talon = newBoard.talon.filter(
      (card) => card?.shortName !== move.cards[0].shortName
    )
    if (!card) return newBoard
    newBoard.foundation[move.toIndex].push(card)
  }
  if (move.from === 'talon' && move.to.startsWith('col')) {
    const card = newBoard.talon.find(
      (card) => card?.shortName === move.cards[0].shortName
    )
    newBoard.talon = newBoard.talon.filter(
      (card) => card?.shortName !== move.cards[0].shortName
    )
    if (!card) return newBoard
    newBoard.tableau[move.toIndex].push(card)
  }

  return revealCard(newBoard, move)
}

const simulateGame = (board: Board): boolean => {
  let gameWon: boolean
  while (true) {
    if (isLost(board)) {
      gameWon = false
      break
    }
    if (isWon(board)) {
      gameWon = true
      break
    }

    const allMoves = getAllValidMoves(board)
    let aMove = allMoves[Math.floor(Math.random() * allMoves.length)]
    const movedboard = makeMove(board, aMove)
    board = revealCard(movedboard, aMove)
  }

  return gameWon
}

export const Random_Simulation = (initBoard: Board): Result => {
  const start = Date.now()

  const firstMoves = getAllValidMoves(structuredClone(initBoard))

  const firstNode = {
    id: 'first-' + md5(JSON.stringify(initBoard)),
    visits: 0,
    wins: 0,
    moveThatCreatedThisNode: null,
  } as Node

  const childNodes: Node[] = []
  firstMoves.forEach((move) => {
    const childBoard = makeMoveAndReveal(initBoard, move)

    // this is a workaround, so each childNode is unique
    childBoard.moveThatCreatedThisBoard = move

    const childNode = {
      id: md5(JSON.stringify(childBoard)),
      visits: 0,
      wins: 0,
      winnabilityPercentage: 0,
      moveThatCreatedThisNode: move,
    } as Node
    childNodes.push(childNode)
  })

  let simulationsCounter = 0
  const AMOUNT_OF_OVERALL_SIMULATIONS = childNodes.length * 1000

  while (simulationsCounter < AMOUNT_OF_OVERALL_SIMULATIONS) {
    const randomMove = firstMoves[Math.floor(Math.random() * firstMoves.length)]
    const board = makeMoveAndReveal(structuredClone(initBoard), randomMove)

    // find according childNode
    const playedChildNode = childNodes.find((node) => {
      return node.moveThatCreatedThisNode.name === randomMove.name
    })
    firstNode.visits++
    playedChildNode.visits++

    const isWon = simulateGame(board)
    if (isWon) {
      playedChildNode.wins++
      firstNode.wins++
    }
    simulationsCounter++
  }

  // calclulate winnability for parent node
  firstNode.winnabilityPercentage = (firstNode.wins / firstNode.visits) * 100

  // calculate winnability for each child node
  childNodes.forEach((node) => {
    node.winnabilityPercentage = (node.wins / node.visits) * 100
  })

  // find the node with the highest winnability
  const bestNode = childNodes.reduce((prev, current) => {
    return prev.winnabilityPercentage > current.winnabilityPercentage
      ? prev
      : current
  })

  // find the node with the lowest winnability
  const worstNode = childNodes.reduce((prev, current) => {
    return prev.winnabilityPercentage < current.winnabilityPercentage
      ? prev
      : current
  })

  // debug output
  const end = Date.now()
  const timeTaken = end - start
  console.log(`Execution time: ${timeTaken} ms`)

  const results = {
    nodes: {
      currentNode: firstNode,
      childNodes: childNodes,
      bestNode: bestNode,
      worstNode: worstNode,
    },
    wins: firstNode.wins,
    visits: firstNode.visits,
    bestWinnabilityPercentage: bestNode.winnabilityPercentage,
    worstWinnabilityPercentage: worstNode.winnabilityPercentage,
    bestMove: bestNode.moveThatCreatedThisNode,
    duration: timeTaken,
    moves: firstMoves,
  } as Result

  return results
}

export const UCB1_Simulation = (initBoard: Board): Result => {
  const start = Date.now()

  let board = structuredClone(initBoard)
  const availableMoves = getAllValidMoves(board)

  // 1. selection phase
  const playedNodes: Node[] = []
  const firstNode = {
    id: 'first-' + md5(JSON.stringify(initBoard)),
    visits: 0,
    wins: 0,
    moveThatCreatedThisNode: null,
  } as Node
  playedNodes.push(firstNode)

  const childNodes: Node[] = []
  availableMoves.forEach((move) => {
    const childBoard = makeMoveAndReveal(initBoard, move)

    // this is a workaround, so each childNode is unique
    childBoard.moveThatCreatedThisBoard = move

    const childNode = {
      id: md5(JSON.stringify(childBoard)),
      visits: 0,
      wins: 0,
      winnabilityPercentage: 0,
      moveThatCreatedThisNode: move,
    } as Node
    childNodes.push(childNode)
  })

  if (childNodes.length === 0) {
    console.log('no childNodes')
    return
  }

  let simulationsCounter = 0
  const AMOUNT_OF_OVERALL_SIMULATIONS = childNodes.length * 1000

  // 2. expand phase
  // UCB1-formula: nodeWins/nodeVisits + c * sqrt(log(overAllVisits)/nodeVisits)
  const c = 1.41
  while (simulationsCounter < AMOUNT_OF_OVERALL_SIMULATIONS) {
    const ucb1Values: number[] = []
    childNodes.forEach((node) => {
      if (node.visits === 0) {
        return ucb1Values.push(Infinity)
      }
      const ucb1Value =
        node.wins / node.visits +
        c * Math.sqrt(Math.log(simulationsCounter) / node.visits)
      ucb1Values.push(ucb1Value)
    })

    const maxUCB1Value = Math.max(...ucb1Values)
    const index = ucb1Values.indexOf(maxUCB1Value)
    const bestNode = childNodes[index]
    if (
      !playedNodes.find((node) => {
        node.id === bestNode.id
      })
    ) {
      playedNodes.push(bestNode)
    }

    board = makeMoveAndReveal(initBoard, bestNode.moveThatCreatedThisNode)

    // 3. rollout phase
    const isWon = simulateGame(board)

    // 4. backpropagation phase
    if (isWon) {
      playedNodes.forEach((node) => {
        node.visits++
        node.wins++
      })
    } else {
      playedNodes.forEach((node) => {
        node.visits++
      })
    }

    playedNodes.pop()

    simulationsCounter++
  }

  // calculate winnability for parent node
  firstNode.winnabilityPercentage = (firstNode.wins / firstNode.visits) * 100

  // calculate winnability for each child node
  childNodes.forEach((node) => {
    node.winnabilityPercentage = (node.wins / node.visits) * 100
  })

  // find the node with the highest winnability
  const bestNode = childNodes.reduce((prev, current) => {
    return prev.winnabilityPercentage > current.winnabilityPercentage
      ? prev
      : current
  })

  // find the node with the lowest winnability
  const worstNode = childNodes.reduce((prev, current) => {
    return prev.winnabilityPercentage < current.winnabilityPercentage
      ? prev
      : current
  })

  // debug output
  const end = Date.now()
  const timeTaken = end - start
  console.log(`Execution time: ${timeTaken} ms`)

  const results = {
    nodes: {
      currentNode: firstNode,
      childNodes: childNodes,
      bestNode: bestNode,
      worstNode: worstNode,
    },
    wins: firstNode.wins,
    visits: firstNode.visits,
    bestWinnabilityPercentage: bestNode.winnabilityPercentage,
    worstWinnabilityPercentage: worstNode.winnabilityPercentage,
    bestMove: bestNode.moveThatCreatedThisNode,
    moves: availableMoves,
    duration: timeTaken,
  } as Result

  return results
}

export const saveDataToFirebase = (data: GameData) => {
  const databaseURL = process.env.DATABASE_URL
  // POST request to the specified URL
  try {
    axios.post(databaseURL, data).then((response) => {
      console.log('POST request successful:', response.data)
    })
  } catch (error) {
    console.log(data)
    console.log('POST request failed')
  }
}

export function encodeBoard(board: Board): string {
  return Buffer.from(JSON.stringify(board), 'utf-8').toString('base64')
}

export function decodeBoard(encodedBoard: string): Board {
  return JSON.parse(Buffer.from(encodedBoard, 'base64').toString('utf-8'))
}
