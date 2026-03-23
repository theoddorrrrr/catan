import {
  GameState,
  GamePhase,
  TurnPhase,
  GameEngine,
  createGame,
  SeededRandom,
  ActionEnvelope,
  GameAction,
  SimpleBot,
  LobbyRoom,
  totalResources,
  hasResources,
  emptyResources,
  BoardGraph,
  generateBoard,
} from '@catan/shared';

export class GameSession {
  private state: GameState;
  private graph: BoardGraph;
  private engine: GameEngine;
  private bot: SimpleBot;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private onStateChange: ((state: GameState) => void) | null = null;

  constructor(room: LobbyRoom) {
    // Build player setups from lobby slots (only non-open slots)
    const activeSlots = room.slots
      .filter((s) => s.type !== 'open')
      .sort((a, b) => a.index - b.index);

    const playerSetups = activeSlots.map((slot) => ({
      id: slot.playerId!,
      name: slot.playerName!,
      isBot: slot.type === 'bot',
    }));

    const config = {
      playerCount: activeSlots.length,
      ...room.config,
    };

    const seed = Math.floor(Math.random() * 2147483647);
    const { state, graph } = createGame(room.roomCode, config, playerSetups);

    // Assign player colors from lobby
    for (const slot of activeSlots) {
      const player = state.players.find((p) => p.id === slot.playerId);
      if (player) {
        player.color = slot.color;
      }
    }

    this.state = state;
    this.graph = graph;
    this.engine = new GameEngine(graph, new SeededRandom((state.config.boardSeed ?? seed) + 1));
    this.bot = new SimpleBot();
  }

  setOnStateChange(cb: (state: GameState) => void): void {
    this.onStateChange = cb;
  }

  handleAction(playerId: string, action: GameAction): { ok: boolean; error?: string } {
    const envelope: ActionEnvelope = {
      action,
      playerId,
      timestamp: Date.now(),
    };

    const validation = this.engine.validate(this.state, envelope);
    if (!validation.valid) {
      return { ok: false, error: validation.reason };
    }

    try {
      const result = this.engine.applyAction(this.state, envelope);
      this.state = result.newState;
      this.notifyStateChange();
      this.scheduleBotTick();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e.message };
    }
  }

  filterStateForPlayer(playerId: string): GameState {
    const filtered = structuredClone(this.state);

    for (const player of filtered.players) {
      if (player.id !== playerId) {
        // Hide resources — only show total
        player.resources = emptyResources();
        // Hide dev cards — only show count
        const count = player.devCards.length;
        player.devCards = [];
        // Store count in a way the client can read (use hiddenVP or a temporary field)
        (player as any).devCardCount = count;
      }
    }

    // Hide deck contents but preserve count
    const deckSize = filtered.devCardDeck.length;
    filtered.devCardDeck = [];
    (filtered as any).devCardDeckSize = deckSize;

    return filtered;
  }

  getState(): GameState {
    return this.state;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  scheduleBotTick(): void {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }

    if (this.state.phase === GamePhase.Finished) return;

    // Check if a bot needs to act
    const needsBotAction = this.doesBotNeedToAct();
    if (!needsBotAction) return;

    const delay = 400 + Math.floor(Math.random() * 400);
    this.botTimer = setTimeout(() => {
      this.runBotAction();
    }, delay);
  }

  private doesBotNeedToAct(): boolean {
    const s = this.state;
    if (s.phase === GamePhase.Finished) return false;

    // Handle active trade offers from human — bots should respond
    if (s.activeTradeOffer && s.activeTradeOffer.status === 'open') {
      const proposer = s.players.find((p) => p.id === s.activeTradeOffer!.fromPlayerId);
      if (proposer && !proposer.isBot) return true;
    }

    // Setup phase
    if (s.phase === GamePhase.SetupRound1 || s.phase === GamePhase.SetupRound2) {
      const player = s.players[s.setupState!.currentSetupPlayerIndex];
      return player.isBot;
    }

    // Discard phase — check if any bot needs to discard
    if (s.turnPhase === TurnPhase.RobberDiscard) {
      return s.playersNeedingDiscard.some((id) => {
        const p = s.players.find((pl) => pl.id === id);
        return p?.isBot;
      });
    }

    // Gold choice phase — check if any bot needs to choose
    if (s.turnPhase === TurnPhase.GoldChoice) {
      return s.playersNeedingGoldChoice.some(({ playerId: id }) => {
        const p = s.players.find((pl) => pl.id === id);
        return p?.isBot;
      });
    }

    // Playing phase — current player is bot
    if (s.phase === GamePhase.Playing) {
      const current = s.players[s.currentPlayerIndex];
      return current.isBot;
    }

    return false;
  }

  private runBotAction(): void {
    const s = this.state;
    if (s.phase === GamePhase.Finished) return;

    try {
      // Handle trade offers from human players
      if (s.activeTradeOffer && s.activeTradeOffer.status === 'open') {
        this.handleBotTradeResponse();
        return;
      }

      // Setup phase
      if (s.phase === GamePhase.SetupRound1 || s.phase === GamePhase.SetupRound2) {
        const setup = s.setupState!;
        const player = s.players[setup.currentSetupPlayerIndex];
        if (!player.isBot) return;

        let action: GameAction;
        if (!setup.awaitingRoad) {
          const vertex = this.bot.chooseInitialSettlement(s, player.id, this.graph);
          action = { type: 'placeInitialSettlement', vertexId: vertex };
        } else {
          const lastSettlement = player.settlements[player.settlements.length - 1];
          const edge = this.bot.chooseInitialRoad(s, player.id, this.graph, lastSettlement);
          action = { type: 'placeInitialRoad', edgeId: edge };
        }

        this.handleAction(player.id, action);
        return;
      }

      // Discard phase
      if (s.turnPhase === TurnPhase.RobberDiscard) {
        const botDiscarder = s.playersNeedingDiscard.find((id) => {
          const p = s.players.find((pl) => pl.id === id);
          return p?.isBot;
        });
        if (botDiscarder) {
          const action = this.bot.chooseAction(s, botDiscarder, this.graph);
          this.handleAction(botDiscarder, action);
        }
        return;
      }

      // Gold choice phase
      if (s.turnPhase === TurnPhase.GoldChoice) {
        const botChooser = s.playersNeedingGoldChoice.find(({ playerId: id }) => {
          const p = s.players.find((pl) => pl.id === id);
          return p?.isBot;
        });
        if (botChooser) {
          const action = this.bot.chooseAction(s, botChooser.playerId, this.graph);
          this.handleAction(botChooser.playerId, action);
        }
        return;
      }

      // Regular turn
      const current = s.players[s.currentPlayerIndex];
      if (!current.isBot) return;

      const action = this.bot.chooseAction(s, current.id, this.graph);
      const envelope: ActionEnvelope = { action, playerId: current.id, timestamp: Date.now() };
      const validation = this.engine.validate(s, envelope);

      if (!validation.valid) {
        // Fallback
        const fallback = s.turnPhase === TurnPhase.PreRoll
          ? { type: 'rollDice' as const }
          : { type: 'endTurn' as const };
        this.handleAction(current.id, fallback);
      } else {
        this.handleAction(current.id, action);
      }
    } catch (e) {
      console.error('Bot action error:', e);
      // Try to recover with a simple action
      const current = this.state.players[this.state.currentPlayerIndex];
      if (current.isBot && this.state.phase === GamePhase.Playing) {
        const fallback = this.state.turnPhase === TurnPhase.PreRoll
          ? { type: 'endTurn' as const }
          : { type: 'endTurn' as const };
        try {
          this.handleAction(current.id, fallback);
        } catch { /* give up */ }
      }
    }
  }

  private handleBotTradeResponse(): void {
    const offer = this.state.activeTradeOffer;
    if (!offer) return;

    const botPlayers = this.state.players.filter(
      (p) => p.isBot && p.id !== offer.fromPlayerId
    );

    for (const botPlayer of botPlayers) {
      if (hasResources(botPlayer.resources, offer.requesting)) {
        const offerTotal = totalResources(offer.offering);
        const requestTotal = totalResources(offer.requesting);
        if (offerTotal >= requestTotal - 1) {
          this.handleAction(botPlayer.id, { type: 'acceptTrade', tradeId: offer.id });
          return;
        }
      }
    }

    // No bot accepted — cancel
    this.handleAction(offer.fromPlayerId, { type: 'cancelTrade', tradeId: offer.id });
  }

  destroy(): void {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    this.onStateChange = null;
  }
}
