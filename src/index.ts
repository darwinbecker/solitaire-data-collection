import 'dotenv/config'
import {
  Random_Simulation,
  UCB1_Simulation,
  encodeBoard,
  getAllMovesFromTalon,
  isLost,
  makeMoveAndReveal,
  saveDataToFirebase,
} from './lib/helper'
import { Board, GameData, Move, Result } from './lib/types'
import generateBoard from './lib/generateRandomBoard'

function runStrategie(
  strategy: 'UCB1' | 'Full-Random',
  board: Board,
  playedMoves: Move[],
  resultsHistory: Result[],
  initBoardId: string
) {
  // if the initial board has no valid moves, return
  if (isLost(board)) {
    console.log(board)

    const data = {
      gameType: strategy,
      gameID: initBoardId,
      gameStatus: 'impossible',
      resultsHistory: [],
      playedMoves: [],
    } as GameData

    console.log(`save ${strategy}-data to database`)
    saveDataToFirebase(data)

    return
  }

  let move: Move
  // check if worst-winrate is 100% and play random
  const lastResult = resultsHistory[resultsHistory.length - 1]
  if (lastResult && lastResult.worstWinnabilityPercentage === 100) {
    // prioritise talon moves and move random
    const talonMoves = getAllMovesFromTalon(board)
    const allMoves = talonMoves.length > 0 ? talonMoves : undefined

    // game is won
    if (!allMoves) {
      console.log('game is won!')

      const data = {
        gameType: strategy,
        gameID: initBoardId,
        gameStatus: 'won',
        resultsHistory: resultsHistory,
        playedMoves: playedMoves,
      } as GameData

      console.log(`save ${strategy}-data to database`)
      saveDataToFirebase(data)

      return
    }
    move = allMoves[Math.floor(Math.random() * allMoves.length)]
  } else {
    const results =
      strategy === 'Full-Random'
        ? Random_Simulation(board)
        : UCB1_Simulation(board)
    resultsHistory.push(results)

    if (!results || !results.bestMove) {
      console.log('no move found')

      const data = {
        gameType: strategy,
        gameID: initBoardId,
        gameStatus: 'impossible',
        resultsHistory: resultsHistory,
        playedMoves: playedMoves,
      } as GameData

      console.log(`save ${strategy}-data to database`)
      saveDataToFirebase(data)

      return
    }
    if (results.wins === 0) {
      console.log('no winnable moves found')

      const data = {
        gameType: strategy,
        gameID: initBoardId,
        gameStatus: 'lost',
        resultsHistory: resultsHistory,
        playedMoves: playedMoves,
      } as GameData

      console.log(`save ${strategy}-data to database`)
      saveDataToFirebase(data)

      return
    }

    move = results.bestMove
  }
  playedMoves.push(move)

  const newBoard = makeMoveAndReveal(board, move)
  runStrategie(strategy, newBoard, playedMoves, resultsHistory, initBoardId)
}

const run = () => {
  const initBoard = generateBoard()

  // Random simulation
  console.log('running Random_Simulation...')
  const startRandom = Date.now()

  const randomBoard = structuredClone(initBoard)
  const randomPlayedMoves: Move[] = []
  const randomResultsHistory: Result[] = []

  runStrategie(
    'Full-Random',
    randomBoard,
    randomPlayedMoves,
    randomResultsHistory,
    encodeBoard(structuredClone(initBoard))
  )
  const randomDuration = Date.now() - startRandom
  console.log('duration of Full-Random:', randomDuration)
  console.log('--------------------')

  // UCB1 simulation
  console.log('running UCB1_Simulation...')
  const startUCB1 = Date.now()

  const ucb1Board = structuredClone(initBoard)
  const ucb1PlayedMoves: Move[] = []
  const ucb1ResultsHistory: Result[] = []

  runStrategie(
    'UCB1',
    ucb1Board,
    ucb1PlayedMoves,
    ucb1ResultsHistory,
    encodeBoard(structuredClone(initBoard))
  )
  const ucb1Duration = Date.now() - startUCB1
  console.log('duration of UCB1:', ucb1Duration)
  console.log('--------------------')

  console.log('finished running both simulations')
  console.log('duration of all simulations:', randomDuration + ucb1Duration)
}

run()
