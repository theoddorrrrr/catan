import { GameState, GamePhase, TurnPhase, GameConfig, DEFAULT_CONFIG } from '../types/game.js';
import { Player, createPlayer, PlayerColor, ALL_PLAYER_COLORS } from '../types/player.js';
import { DevCardType, DEV_CARD_COUNTS, ResourceType, emptyResources } from '../types/resource.js';
import { generateBoard, findDesertHex } from '../board/board-generator.js';
import { BoardGraph, buildBoardGraph, generateHexCoords } from '../board/hex-grid.js';
import { SeededRandom } from '../utils/random.js';

export interface GameInitResult {
  state: GameState;
  graph: BoardGraph;
}

export function createGame(
  gameId: string,
  config: Partial<GameConfig> = {},
  playerSetups: Array<{ id: string; name: string; isBot: boolean }> = []
): GameInitResult {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const seed = fullConfig.boardSeed ?? Math.floor(Math.random() * 2147483647);
  const rng = new SeededRandom(seed);

  const { board, graph } = generateBoard(seed);

  // Create dev card deck
  const devCardDeck: DevCardType[] = [];
  if (fullConfig.devCardsEnabled) {
    for (const [type, count] of Object.entries(DEV_CARD_COUNTS)) {
      for (let i = 0; i < count; i++) {
        devCardDeck.push(type as DevCardType);
      }
    }
  }
  const shuffledDeck = rng.shuffle(devCardDeck);

  // Create players
  const players: Player[] = playerSetups.slice(0, fullConfig.playerCount).map((setup, i) =>
    createPlayer(setup.id, setup.name, ALL_PLAYER_COLORS[i], setup.isBot)
  );

  // Fill remaining slots with bots if needed
  while (players.length < fullConfig.playerCount) {
    const i = players.length;
    players.push(createPlayer(`bot-${i}`, `Bot ${i + 1}`, ALL_PLAYER_COLORS[i], true));
  }

  const desertHex = findDesertHex(board.hexes);

  const state: GameState = {
    gameId,
    config: { ...fullConfig, boardSeed: seed },
    phase: GamePhase.SetupRound1,
    turnPhase: TurnPhase.PreRoll,

    board,
    players,
    currentPlayerIndex: 0,
    turnNumber: 0,

    setupState: {
      currentSetupPlayerIndex: 0,
      settlementsPlacedThisRound: 0,
      awaitingRoad: false,
    },

    lastDiceRoll: null,
    devCardDeck: shuffledDeck,
    activeTradeOffer: null,

    robberHex: desertHex,
    playersNeedingDiscard: [],

    longestRoadPlayerId: null,
    longestRoadLength: 0,
    largestArmyPlayerId: null,
    largestArmySize: 0,

    winnerId: null,

    bank: {
      [ResourceType.Brick]: 19,
      [ResourceType.Lumber]: 19,
      [ResourceType.Ore]: 19,
      [ResourceType.Grain]: 19,
      [ResourceType.Wool]: 19,
    },
    diceRollHistory: [],
    gameStartTimestamp: Date.now(),

    eventLog: [],
    actionIndex: 0,
  };

  return { state, graph };
}
