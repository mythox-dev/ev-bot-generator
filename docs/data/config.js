/*
 * Central configuration for the EV Bot Command Builder.
 *
 * This file is the "usability layer": leagues, market groupings, presets,
 * and defaults. It does NOT define market/book strings itself — every
 * market/book value referenced here must appear verbatim in
 * ev-bot-reference.json (the authoritative source). app.js cross-checks
 * this at load time and logs a console warning if anything drifts.
 *
 * To add a league, market group, or preset later, edit this file only.
 */

window.EV_CONFIG = (function () {
  'use strict';

  // Sentinel meaning "show every market in this league's reference family"
  var ALL_MARKETS = 'ALL';

  var LEAGUES = [
    { id: 'mlb', label: 'MLB', marketFamily: 'mlb_ncaabaseball' },
    { id: 'nfl', label: 'NFL', marketFamily: 'nfl_ncaaf' },
    { id: 'ncaaf', label: 'NCAAF', marketFamily: 'nfl_ncaaf' },
    { id: 'nba', label: 'NBA', marketFamily: 'nba_ncaab_wnba_cba' },
    { id: 'ncaab', label: 'NCAAB', marketFamily: 'nba_ncaab_wnba_cba' },
    { id: 'nhl', label: 'NHL', marketFamily: 'nhl' },
    { id: 'soccer', label: 'Soccer', marketFamily: 'soccer' },
    { id: 'tennis', label: 'Tennis', marketFamily: 'tennis' },
    { id: 'ufc', label: 'UFC', marketFamily: 'ufc' }
  ];

  var MARKET_GROUPS = {
    mlb: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Run Line', 'Total Runs', 'Team Total'] },
      { id: 'f5', label: 'First 5', markets: ['1st Half Moneyline', '1st Half Moneyline 3-Way', '1st Half Run Line', '1st Half Team Total', '1st Half Total Runs'] },
      { id: 'f1', label: 'First Inning', markets: ['1st Inning Moneyline', '1st Inning Moneyline 3-Way', '1st Inning Run Line', '1st Inning Total Runs'] },
      { id: 'pitching', label: 'Pitching Props', markets: ['Player Strikeouts', 'Player Outs', 'Player Hits Allowed', 'Player Earned Runs', 'Player Walks', 'Player Wins'], defaultName: 'Over' },
      { id: 'batting', label: 'Batting Props', markets: ['Player Hits', 'Player Total Bases', 'Player RBIs', 'Player Runs', 'Player Hits + Runs + RBIs', 'Player Runs + RBIs', 'Player Singles', 'Player Doubles', 'Player Triples', 'Player Batting Walks', 'Player Batting Strikeouts', 'Player Stolen Bases', 'Player Hits + Runs', 'Player First Hit', 'Player First Run'], defaultName: 'Over' },
      { id: 'homeruns', label: 'Home Runs', markets: ['Player Home Runs', 'Player First Home Run'], defaultName: 'Over' },
      { id: 'custom', label: 'Custom / All Markets', markets: ALL_MARKETS }
    ],
    nfl: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Point Spread', 'Total Points', 'Team Total'] },
      { id: 'passing', label: 'Passing', markets: ['Player Passing Yards', 'Player Passing Touchdowns', 'Player Passing Attempts', 'Player Passing Completions', 'Player Interceptions', 'Player Longest Completion'], defaultName: 'Over' },
      { id: 'rushing', label: 'Rushing', markets: ['Player Rushing Yards', 'Player Rushing Attempts', 'Player Longest Rush', 'Player Rushing Touchdowns'], defaultName: 'Over' },
      { id: 'receiving', label: 'Receiving', markets: ['Player Receiving Yards', 'Player Receptions', 'Player Longest Reception', 'Player Receiving Touchdowns'], defaultName: 'Over' },
      { id: 'touchdowns', label: 'Touchdowns', markets: ['Player Touchdowns', 'Player First Touchdown Scorer', 'Player Last Touchdown Scorer', 'Player First Team Touchdown'] },
      { id: 'combo', label: 'Combo Props', markets: ['Player Passing + Rushing Yards', 'Player Rushing + Receiving Yards'], defaultName: 'Over' },
      { id: 'custom', label: 'Custom / All Markets', markets: ALL_MARKETS }
    ],
    ncaaf: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Point Spread', 'Total Points', 'Team Total'] },
      { id: 'custom', label: 'Custom / All Markets', markets: ALL_MARKETS }
    ],
    nba: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Point Spread', 'Total Points', 'Team Total'] },
      { id: 'points', label: 'Points', markets: ['Player Points'], defaultName: 'Over' },
      { id: 'rebounds', label: 'Rebounds', markets: ['Player Rebounds'], defaultName: 'Over' },
      { id: 'assists', label: 'Assists', markets: ['Player Assists'], defaultName: 'Over' },
      { id: 'combo', label: 'Combo Props', markets: ['Player Points + Rebounds + Assists', 'Player Points + Assists', 'Player Points + Rebounds', 'Player Rebounds + Assists'], defaultName: 'Over' },
      { id: 'threes', label: 'Threes', markets: ['Player Threes Made', 'Player Threes Attempted'], defaultName: 'Over' },
      { id: 'firstbasket', label: 'First Basket', markets: ['Player First Basket', 'Player First Field Goal', 'Player First Team Basket'] },
      { id: 'custom', label: 'Custom / All Markets', markets: ALL_MARKETS }
    ],
    ncaab: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Point Spread', 'Total Points', 'Team Total'] },
      { id: 'custom', label: 'Custom / All Markets', markets: ALL_MARKETS }
    ],
    nhl: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Puck Line', 'Total Goals', 'Team Total'] },
      { id: 'shots', label: 'Shots', markets: ['Player Shots On Goal'], defaultName: 'Over' },
      { id: 'points', label: 'Points', markets: ['Player Points'], defaultName: 'Over' },
      { id: 'assists', label: 'Assists', markets: ['Player Assists'], defaultName: 'Over' },
      { id: 'goals', label: 'Goals', markets: ['Player Goals'], defaultName: 'Over' },
      { id: 'goalie', label: 'Goalie', markets: ['Player Saves', 'Player Goals Allowed', 'Player Shutout'], defaultName: 'Over' },
      { id: 'custom', label: 'Custom / All Markets', markets: ALL_MARKETS }
    ],
    soccer: [
      { id: 'main', label: 'Main', markets: ['Moneyline', 'Asian Handicap', 'Total Goals', 'Draw No Bet', 'Both Teams To Score'] },
      { id: 'corners', label: 'Corners', markets: ['Total Corners', 'Team Total Corners'] },
      { id: 'playerprops', label: 'Player Props', markets: ['Player Goals', 'Player Assists', 'Player Shots', 'Player Shots On Goal', 'Player Score Or Assist'], defaultName: 'Over' },
      { id: 'custom', label: 'Custom / All Markets', markets: ALL_MARKETS }
    ],
    tennis: [
      { id: 'main', label: 'Main', markets: ['Moneyline', 'Game Spread', 'Set Spread', 'Total Games', 'Total Sets'] },
      { id: 'firstset', label: 'First Set', markets: ['1st Set Moneyline', '1st Set Game Spread', '1st Set Total Games'] },
      { id: 'playerprops', label: 'Player Props', markets: ['Player Games Won'], defaultName: 'Over' },
      { id: 'custom', label: 'Custom / All Markets', markets: ALL_MARKETS }
    ],
    ufc: [
      { id: 'main', label: 'Main', markets: ['Moneyline', 'Point Spread', 'Total Rounds', 'Fight Goes The Distance', 'Fight Goes to Split Decision'] },
      { id: 'rounds', label: 'Round Props', markets: ['Fight To Start Round 2', 'Fight To Start Round 3', 'Fight To Start Round 4', 'Fight To Start Round 5'] },
      { id: 'strikes', label: 'Strikes & Takedowns', markets: ['Total Takedowns', 'Total Significant Strikes', 'Most Takedowns Landed', 'Most Significant Strikes Landed'], defaultName: 'Over' },
      { id: 'custom', label: 'Custom / All Markets', markets: ALL_MARKETS }
    ]
  };

  // Primary short token shown/used per book. Default rule (applied in app.js):
  // 1 token -> use it; 2 tokens -> use the second (the abbreviation). The two
  // 3-token books need an explicit pick since the rule can't infer one.
  var BOOK_TOKEN_OVERRIDES = {
    'Bet365': 'b365',
    'DK Pick6': 'p6'
  };

  var DEFAULTS = {
    book: 'dk',
    sharps: ['pinny', 'circa', 'bm', 'novig'],
    minBooks: 2,
    minLimit: 1000
  };

  var PRESETS = [
    // MLB
    { id: 'mlb-main', league: 'mlb', label: 'MLB Main', description: 'Moneyline, Run Line, Total Runs', markets: ['Moneyline', 'Run Line', 'Total Runs'] },
    { id: 'mlb-main-only', league: 'mlb', label: 'MLB Main Only', description: 'Main lines, main markets only', markets: ['Moneyline', 'Run Line', 'Total Runs'], isMain: true },
    { id: 'mlb-f5-ml', league: 'mlb', label: 'MLB F5 Moneyline', description: 'First 5 innings moneyline', markets: ['1st Half Moneyline'] },
    { id: 'mlb-pitching', league: 'mlb', label: 'MLB Pitching Props', description: 'Strikeouts, outs, hits allowed, ER, walks, wins (Over)', markets: ['Player Strikeouts', 'Player Outs', 'Player Hits Allowed', 'Player Earned Runs', 'Player Walks', 'Player Wins'], name: 'Over' },
    { id: 'mlb-batting', league: 'mlb', label: 'MLB Batting Props', description: 'Hits, TB, RBIs, runs & more (Over)', markets: ['Player Hits', 'Player Total Bases', 'Player RBIs', 'Player Runs', 'Player Hits + Runs + RBIs', 'Player Runs + RBIs', 'Player Singles', 'Player Doubles', 'Player Triples', 'Player Batting Walks', 'Player Batting Strikeouts', 'Player Stolen Bases'], name: 'Over' },
    { id: 'mlb-hr', league: 'mlb', label: 'MLB Home Runs', description: 'Player home runs (Over)', markets: ['Player Home Runs'], name: 'Over' },

    // NFL
    { id: 'nfl-main', league: 'nfl', label: 'NFL Main', description: 'Moneyline, Point Spread, Total Points', markets: ['Moneyline', 'Point Spread', 'Total Points'] },
    { id: 'nfl-passing', league: 'nfl', label: 'NFL Passing', description: 'QB passing props (Over)', markets: ['Player Passing Yards', 'Player Passing Touchdowns', 'Player Passing Attempts', 'Player Passing Completions', 'Player Interceptions', 'Player Longest Completion'], name: 'Over' },
    { id: 'nfl-rushing', league: 'nfl', label: 'NFL Rushing', description: 'Rushing props (Over)', markets: ['Player Rushing Yards', 'Player Rushing Attempts', 'Player Longest Rush', 'Player Rushing Touchdowns'], name: 'Over' },
    { id: 'nfl-receiving', league: 'nfl', label: 'NFL Receiving', description: 'Receiving props (Over)', markets: ['Player Receiving Yards', 'Player Receptions', 'Player Longest Reception', 'Player Receiving Touchdowns'], name: 'Over' },
    { id: 'nfl-attd', league: 'nfl', label: 'NFL ATTD', description: 'Anytime touchdown scorer', markets: ['Player Touchdowns'] },
    { id: 'nfl-first-td', league: 'nfl', label: 'NFL First TD', description: 'First touchdown scorer', markets: ['Player First Touchdown Scorer'] },

    // NCAAF
    { id: 'ncaaf-main', league: 'ncaaf', label: 'NCAAF Main', description: 'Moneyline, Point Spread, Total Points', markets: ['Moneyline', 'Point Spread', 'Total Points'] },

    // NBA
    { id: 'nba-main', league: 'nba', label: 'NBA Main', description: 'Moneyline, Point Spread, Total Points', markets: ['Moneyline', 'Point Spread', 'Total Points'] },
    { id: 'nba-points', league: 'nba', label: 'NBA Points', description: 'Player points (Over)', markets: ['Player Points'], name: 'Over' },
    { id: 'nba-rebounds', league: 'nba', label: 'NBA Rebounds', description: 'Player rebounds (Over)', markets: ['Player Rebounds'], name: 'Over' },
    { id: 'nba-assists', league: 'nba', label: 'NBA Assists', description: 'Player assists (Over)', markets: ['Player Assists'], name: 'Over' },
    { id: 'nba-pra', league: 'nba', label: 'NBA Pts+Reb+Ast', description: 'Points + Rebounds + Assists (Over)', markets: ['Player Points + Rebounds + Assists'], name: 'Over' },
    { id: 'nba-pa', league: 'nba', label: 'NBA Pts+Ast', description: 'Points + Assists (Over)', markets: ['Player Points + Assists'], name: 'Over' },
    { id: 'nba-pr', league: 'nba', label: 'NBA Pts+Reb', description: 'Points + Rebounds (Over)', markets: ['Player Points + Rebounds'], name: 'Over' },
    { id: 'nba-ra', league: 'nba', label: 'NBA Reb+Ast', description: 'Rebounds + Assists (Over)', markets: ['Player Rebounds + Assists'], name: 'Over' },
    { id: 'nba-threes', league: 'nba', label: 'NBA Threes Made', description: 'Player threes made (Over)', markets: ['Player Threes Made'], name: 'Over' },
    { id: 'nba-first-basket', league: 'nba', label: 'NBA First Basket', description: 'First basket scorer', markets: ['Player First Basket'] },

    // NCAAB
    { id: 'ncaab-main', league: 'ncaab', label: 'NCAAB Main', description: 'Moneyline, Point Spread, Total Points', markets: ['Moneyline', 'Point Spread', 'Total Points'] },

    // NHL
    { id: 'nhl-main', league: 'nhl', label: 'NHL Main', description: 'Moneyline, Puck Line, Total Goals', markets: ['Moneyline', 'Puck Line', 'Total Goals'] },
    { id: 'nhl-shots', league: 'nhl', label: 'NHL Shots', description: 'Player shots on goal (Over)', markets: ['Player Shots On Goal'], name: 'Over' },
    { id: 'nhl-points', league: 'nhl', label: 'NHL Points', description: 'Player points (Over)', markets: ['Player Points'], name: 'Over' },
    { id: 'nhl-assists', league: 'nhl', label: 'NHL Assists', description: 'Player assists (Over)', markets: ['Player Assists'], name: 'Over' },
    { id: 'nhl-goals', league: 'nhl', label: 'NHL Goals', description: 'Player goals (Over)', markets: ['Player Goals'], name: 'Over' },
    { id: 'nhl-saves', league: 'nhl', label: 'NHL Saves', description: 'Goalie saves (Over)', markets: ['Player Saves'], name: 'Over' },

    // Soccer
    { id: 'soccer-main', league: 'soccer', label: 'Soccer Main', description: 'Moneyline, Total Goals, BTTS', markets: ['Moneyline', 'Total Goals', 'Both Teams To Score'] },
    { id: 'soccer-moneyline', league: 'soccer', label: 'Soccer Moneyline', description: 'Moneyline only', markets: ['Moneyline'] },
    { id: 'soccer-ah', league: 'soccer', label: 'Soccer Asian Handicap', description: 'Asian Handicap only', markets: ['Asian Handicap'] },
    { id: 'soccer-dnb', league: 'soccer', label: 'Soccer Draw No Bet', description: 'Draw No Bet only', markets: ['Draw No Bet'] },

    // Tennis
    { id: 'tennis-main', league: 'tennis', label: 'Tennis Main', description: 'Moneyline, spreads, totals', markets: ['Moneyline', 'Game Spread', 'Set Spread', 'Total Games', 'Total Sets'] }
  ];

  return {
    ALL_MARKETS: ALL_MARKETS,
    LEAGUES: LEAGUES,
    MARKET_GROUPS: MARKET_GROUPS,
    BOOK_TOKEN_OVERRIDES: BOOK_TOKEN_OVERRIDES,
    DEFAULTS: DEFAULTS,
    PRESETS: PRESETS
  };
})();
