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
    { id: 'ufc', label: 'UFC', marketFamily: 'ufc' },
    { id: 'golf', label: 'Golf', marketFamily: 'golf' }
  ];

  /*
   * Market groups are a UX taxonomy, NOT a partition — the same market string
   * intentionally appears in multiple groups (e.g. "Player Home Runs" is in
   * both MLB Batter Props and MLB Home Runs). A group's markets come from one
   * of three sources, resolved by resolveGroupMarkets() in app.js:
   *   - markets: ALL_MARKETS      -> every market in the league's own family
   *   - prefixes: [...]           -> every family market starting with any
   *                                   given prefix (used for the mechanical
   *                                   half/quarter/period/inning groups so
   *                                   they can never drift from the source)
   *   - markets: [...] (explicit) -> a curated, hand-picked list
   * `family` overrides which reference market array a group's explicit list
   * is validated/sourced against (used for the per-league Futures groups,
   * which pull from markets.futures rather than the league's own family).
   */
  var MARKET_GROUPS = {
    mlb: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Run Line', 'Total Runs'] },
      { id: 'extras', label: 'Full Game Extras', markets: ['Team Total', 'Total Hits'] },
      { id: 'f5', label: 'First 5 Innings', prefixes: ['1st Half '] },
      { id: 'f1', label: 'First Inning', prefixes: ['1st Inning '] },
      { id: 'innings', label: 'Inning Markets', prefixes: ['1st Inning ', '2nd Inning ', '3rd Inning ', '4th Inning ', '5th Inning ', '6th Inning ', '7th Inning ', '8th Inning ', '9th Inning '] },
      { id: 'pitching', label: 'Pitcher Props', markets: ['Player Earned Runs', 'Player Hits Allowed', 'Player Outs', 'Player Strikeouts', 'Player Walks', 'Player Wins'], defaultName: 'Over' },
      { id: 'batting', label: 'Batter Props', markets: ['Player Batting Strikeouts', 'Player Batting Walks', 'Player Doubles', 'Player First Hit', 'Player First Home Run', 'Player First Run', 'Player Hits', 'Player Hits + Runs', 'Player Hits + Runs + RBIs', 'Player Home Runs', 'Player RBIs', 'Player Runs', 'Player Runs + RBIs', 'Player Singles', 'Player Stolen Bases', 'Player Total Bases', 'Player Triples'] },
      { id: 'hitsbases', label: 'Hits & Bases', markets: ['Player Hits', 'Player Singles', 'Player Doubles', 'Player Triples', 'Player Total Bases'], defaultName: 'Over' },
      { id: 'runsrbis', label: 'Runs & RBIs', markets: ['Player Runs', 'Player RBIs', 'Player Runs + RBIs', 'Player Hits + Runs', 'Player Hits + Runs + RBIs'], defaultName: 'Over' },
      { id: 'homeruns', label: 'Home Runs', markets: ['Player Home Runs', 'Player First Home Run'] },
      { id: 'platediscipline', label: 'Plate Discipline', markets: ['Player Batting Walks', 'Player Batting Strikeouts', 'Player Stolen Bases'], defaultName: 'Over' },
      { id: 'firstevents', label: 'Batter First Events', markets: ['Player First Hit', 'Player First Home Run', 'Player First Run'] },
      { id: 'allplayerprops', label: 'All Player Props', prefixes: ['Player '] },
      { id: 'futures', label: 'Futures', family: 'futures', markets: ['MLB World Series', 'MLB Pennant', 'MLB Division', 'MLB Playoffs', 'MLB Cy Young', 'MLB MVP', 'MLB Reliever of the Year', 'MLB Rookie of the Year', 'MLB Manager of the Year', 'MLB Home Run Leader', 'MLB Strikeouts Leader', 'MLB Wins Leader', 'MLB Stolen Bases Leader', 'MLB RBI Leader'] },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
    ],
    nfl: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Point Spread', 'Total Points'] },
      { id: 'firsthalf', label: 'First Half', prefixes: ['1st Half '] },
      { id: 'secondhalf', label: 'Second Half', prefixes: ['2nd Half '] },
      { id: 'q1', label: 'First Quarter', prefixes: ['1st Quarter '] },
      { id: 'q2', label: 'Second Quarter', prefixes: ['2nd Quarter '] },
      { id: 'q3', label: 'Third Quarter', prefixes: ['3rd Quarter '] },
      { id: 'q4', label: 'Fourth Quarter', prefixes: ['4th Quarter '] },
      { id: 'teamprops', label: 'Team / Game Props', markets: ['D/ST Touchdown Scored', 'Go to Overtime', 'Moneyline 3-Way Reg Time', 'Team Total', 'Team Total Field Goals Made', 'Team Total Touchdowns', 'Total FG Made 1st Quarter', 'Total Touchdowns', 'Total Turnovers'] },
      { id: 'passing', label: 'Passing Props', markets: ['Player Interceptions', 'Player Longest Completion', 'Player Passing + Rushing Yards', 'Player Passing Attempts', 'Player Passing Completions', 'Player Passing Touchdowns', 'Player Passing Yards'], defaultName: 'Over' },
      { id: 'rushing', label: 'Rushing Props', markets: ['Player Longest Rush', 'Player Rushing + Receiving Yards', 'Player Rushing Attempts', 'Player Rushing Touchdowns', 'Player Rushing Yards', 'Player Passing + Rushing Yards'], defaultName: 'Over' },
      { id: 'receiving', label: 'Receiving Props', markets: ['Player Longest Reception', 'Player Receiving Touchdowns', 'Player Receiving Yards', 'Player Receptions', 'Player Rushing + Receiving Yards'], defaultName: 'Over' },
      { id: 'combo', label: 'Combo Props', markets: ['Player Passing + Rushing Yards', 'Player Rushing + Receiving Yards'], defaultName: 'Over' },
      { id: 'touchdowns', label: 'Touchdown Props', markets: ['Player First Team Touchdown', 'Player First Touchdown 2nd Half', 'Player First Touchdown Scorer', 'Player Last Touchdown', 'Player Last Touchdown Scorer', 'Player Touchdowns', 'Player Touchdowns 1st Half', 'Player Touchdowns 1st Quarter', 'Player Touchdowns 2nd Half', 'Player Touchdowns 2nd Quarter', 'Player Touchdowns 3rd Quarter', 'Player Touchdowns 4th Quarter', 'Player Rushing Touchdowns', 'Player Receiving Touchdowns'] },
      { id: 'firstlasttd', label: 'First / Last TD', markets: ['Player First Team Touchdown', 'Player First Touchdown 2nd Half', 'Player First Touchdown Scorer', 'Player Last Touchdown', 'Player Last Touchdown Scorer'] },
      { id: 'kicking', label: 'Kicking Props', markets: ['Player Extra Points Made', 'Player Field Goals Made', 'Player Kicking Points'], defaultName: 'Over' },
      { id: 'defense', label: 'Defensive Props', markets: ['Player Assists', 'Player Defensive Interceptions', 'Player Sacks', 'Player Tackles', 'Player Tackles + Assists'], defaultName: 'Over' },
      { id: 'allplayerprops', label: 'All Player Props', prefixes: ['Player '] },
      { id: 'futures', label: 'Futures', family: 'futures', markets: ['NFL Super Bowl', 'NFL Conference', 'NFL Division', 'NFL Playoffs', 'NFL Regular Season Wins', 'NFL MVP', 'NFL Offensive Player of the Year', 'NFL Offensive Rookie of the Year', 'NFL Defensive Player of the Year', 'NFL Defensive Rookie of the Year', 'NFL Combeback Player of the Year', 'NFL Coach of the Year', 'NFL Most Passing Yards', 'NFL Most Rushing Yards', 'NFL Most Receiving Yards', 'NFL Most Interceptions Thrown', 'NFL Total Receiving Yards', 'NFL Total Passing Yards', 'NFL Total Rushing Yards', 'NFL Total Passing Touchdowns', 'NFL Total Rushing Touchdowns', 'NFL Total Receiving Touchdowns', 'NFL Total Sacks', 'NFL Most Regular Season Wins', 'NFL Most Regular Season Losses', 'NFL Last Undefeated Team', 'NFL Last Winless Team'] },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
    ],
    ncaaf: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Point Spread', 'Total Points'] },
      { id: 'futures', label: 'Futures', family: 'futures', markets: ['College Football Playoffs', 'NCAAF Regular Season Wins', 'NCAAF Conference', 'NCAAF Heisman Trophy'] },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
    ],
    nba: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Point Spread', 'Total Points'] },
      { id: 'firsthalf', label: 'First Half', prefixes: ['1st Half '] },
      { id: 'secondhalf', label: 'Second Half', prefixes: ['2nd Half '] },
      { id: 'q1', label: 'First Quarter', prefixes: ['1st Quarter '] },
      { id: 'q2', label: 'Second Quarter', prefixes: ['2nd Quarter '] },
      { id: 'q3', label: 'Third Quarter', prefixes: ['3rd Quarter '] },
      { id: 'q4', label: 'Fourth Quarter', prefixes: ['4th Quarter '] },
      { id: 'teamprops', label: 'Team / Game Props', markets: ['Field Goals Made', 'Go to Overtime', 'Moneyline 3-Way', 'Team First FG', 'Team Score First', 'Team Total', 'Team Total 3-PTs', 'Team Total Assists', 'Team Total Blocks', 'Team Total Steals'] },
      { id: 'points', label: 'Points / Scoring Props', markets: ['Player Points', 'Player 1st Quarter Points', 'Player 2nd Quarter Points', 'Player 3rd Quarter Points', 'Player 4th Quarter Points'], defaultName: 'Over' },
      { id: 'rebounds', label: 'Rebound Props', markets: ['Player Rebounds', 'Player 1st Quarter Rebounds', 'Player 2nd Quarter Rebounds', 'Player 3rd Quarter Rebounds', 'Player 4th Quarter Rebounds'], defaultName: 'Over' },
      { id: 'assists', label: 'Assist Props', markets: ['Player Assists', 'Player 1st Half Assists', 'Player 1st Quarter Assists', 'Player 2nd Quarter Assists', 'Player 3rd Quarter Assists', 'Player 4th Quarter Assists'], defaultName: 'Over' },
      { id: 'combo', label: 'Combo Props', markets: ['Player Points + Assists', 'Player Points + Rebounds', 'Player Points + Rebounds + Assists', 'Player Rebounds + Assists', 'Player Steals + Blocks', 'Player Turnovers + Steals', 'Player Turnovers + Steals + Blocks'], defaultName: 'Over' },
      { id: 'threes', label: 'Three-Point Props', markets: ['Player First Three', 'Player First Three Team', 'Player Most Threes', 'Player Threes Attempted', 'Player Threes Made'] },
      { id: 'shooting', label: 'Shooting Props', markets: ['Player Field Goals Attempted', 'Player Free Throws Attempted', 'Player Free Throws Made', 'Player Most Free Throws', 'Player Most Twos', 'Player Threes Attempted', 'Player Threes Made', 'Player Twos Attempted', 'Player Twos Made'] },
      { id: 'defense', label: 'Defense / Hustle Props', markets: ['Player Blocks', 'Player Most Blocks', 'Player Most Steals', 'Player Steals', 'Player Steals + Blocks', 'Player Turnovers', 'Player Most Turnovers', 'Player Turnovers + Steals', 'Player Turnovers + Steals + Blocks'] },
      { id: 'doubledouble', label: 'Double / Triple Double', markets: ['Player Double Double', 'Player Triple Double'] },
      { id: 'firstevents', label: 'First Event Props', markets: ['Player First Assist', 'Player First Basket', 'Player First Field Goal', 'Player First Free Throw', 'Player First Rebound', 'Player First Team Basket', 'Player First Three', 'Player First Three Team', 'Player First Two'] },
      { id: 'leaders', label: 'Leader / Most Props', markets: ['Player Most Blocks', 'Player Most Free Throws', 'Player Most Points', 'Player Most Points Team', 'Player Most Rebounds', 'Player Most Steals', 'Player Most Threes', 'Player Most Turnovers', 'Player Most Twos'] },
      { id: 'allplayerprops', label: 'All Player Props', prefixes: ['Player '] },
      { id: 'futures', label: 'Futures', family: 'futures', markets: ['NBA Division', 'NBA Finals', 'NBA Conference', 'NBA Play In', 'NBA Regular Season Wins', 'NBA Most Regular Season Wins', 'NBA MVP', 'NBA Finals MVP', 'NBA Rookie of the Year', 'NBA Defensive Player of the Year', 'NBA Most Improved Player of the Year', 'NBA Sixth Man of the Year', 'NBA Clutch Player of the Year', 'NBA Coach of the Year'] },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
    ],
    ncaab: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Point Spread', 'Total Points'] },
      { id: 'futures', label: 'Futures', family: 'futures', markets: ['NCAAB National Champion', 'NCAAB Final Four', 'NCAAB Conference Winner', 'NCAAB Wooden Award'] },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
    ],
    nhl: [
      { id: 'main', label: 'Main Lines', markets: ['Moneyline', 'Puck Line', 'Total Goals'] },
      { id: 'reglines', label: 'Regulation Lines', markets: ['Moneyline 3-Way', 'Moneyline Draw No Bet', 'Puck Line Reg Time', 'Puck Line Reg Time 3-Way', 'Team Total Reg Time', 'Total Goals Reg Time'] },
      { id: 'p1', label: 'First Period', prefixes: ['1st Period '] },
      { id: 'p2', label: 'Second Period', prefixes: ['2nd Period '] },
      { id: 'p3', label: 'Third Period', prefixes: ['3rd Period '] },
      { id: 'teamprops', label: 'Game / Team Props', markets: ['Both Teams To Score', 'Both Teams To Score 1st Period', 'Both Teams To Score 2nd Period', 'Both Teams To Score 3rd Period', 'Go to Overtime', 'Shots', 'Team Score First 3-Way', 'Team Total', 'Team Total Reg Time'] },
      { id: 'skater', label: 'Skater Props', markets: ['Player Assists', 'Player Blocks', 'Player Goals', 'Player Points', 'Player Power Play Points', 'Player Shots On Goal'], defaultName: 'Over' },
      { id: 'goalscorer', label: 'Goal Scorer Props', markets: ['Player First Goal Scorer', 'Player Goals', 'Player Last Goal Scorer'] },
      { id: 'goalie', label: 'Goalie Props', markets: ['Player Goals Allowed', 'Player Saves', 'Player Shutout'] },
      { id: 'periodprops', label: 'Period Player Props', markets: ['Player 1st Period Points', 'Player 1st Period Shots On Goal', 'Player 2nd Period Points', 'Player 2nd Period Shots On Goal', 'Player 3rd Period Points', 'Player 3rd Period Shots On Goal'], defaultName: 'Over' },
      { id: 'allplayerprops', label: 'All Player Props', prefixes: ['Player '] },
      { id: 'futures', label: 'Futures', family: 'futures', markets: ['NHL Stanley Cup', 'NHL Conference', 'NHL Division', 'NHL Presidents Trophy', 'Hart Memorial Winner', 'Rocket Richard Trophy Winner', 'Art Ross Trophy Winner', 'Calder Memorial Trophy Winner', 'Vezina Trophy Winner', 'James Norris Memorial Winner', 'Jack Adams Award Winner', 'Selke Trophy Winner'] },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
    ],
    soccer: [
      { id: 'main', label: 'Main / Full Match', markets: ['Moneyline', 'Asian Handicap', 'Asian Handicap Reg Time', 'Draw No Bet', 'Total Goals', 'Total Goals Reg Time', 'Team Total', 'Team Total Reg Time', 'Both Teams To Score', 'Both Teams To Score No Draw', 'Goal Scored Both Halves', 'To Qualify'] },
      { id: 'firsthalf', label: 'First Half', markets: ['1st Half Asian Handicap', '1st Half Moneyline', '1st Half Moneyline 3-Way', '1st Half Team Total', '1st Half Total Goals', 'Both Teams To Score 1st Half', 'Team Total Corners 1st Half', 'Total Corners 1st Half'] },
      { id: 'secondhalf', label: 'Second Half', markets: ['2nd Half Asian Handicap', '2nd Half Asian Handicap Reg Time', '2nd Half Moneyline 3-Way', '2nd Half Moneyline Reg Time', '2nd Half Team Total', '2nd Half Team Total Reg Time', '2nd Half Total Goals', '2nd Half Total Goals Reg Time', 'Both Teams To Score 2nd Half', 'Team Total Corners 2nd Half', 'Total Corners 2nd Half'] },
      { id: 'btts', label: 'BTTS', markets: ['Both Teams To Score', 'Both Teams To Score 1st Half', 'Both Teams To Score 2nd Half', 'Both Teams To Score Both Halves', 'Both Teams To Score No Draw'] },
      { id: 'goals', label: 'Goals / Totals', markets: ['Total Goals', 'Total Goals Reg Time', '1st Half Total Goals', '2nd Half Total Goals', '2nd Half Total Goals Reg Time', 'Team Total', 'Team Total Reg Time', '1st Half Team Total', '2nd Half Team Total', '2nd Half Team Total Reg Time', 'Goal Scored Both Halves'] },
      { id: 'corners', label: 'Corners', markets: ['Team Total Corners', 'Team Total Corners 1st Half', 'Team Total Corners 2nd Half', 'Total Corners', 'Total Corners 1st Half', 'Total Corners 2nd Half'] },
      { id: 'scoring', label: 'Player Scoring / Shooting', markets: ['Player First Goal ScoreR', 'Player Goals', 'Player Last Goal Scorer', 'Player Score Or Assist', 'Player Shots', 'Player Shots On Goal'] },
      { id: 'playerother', label: 'Player Other', markets: ['Player Assists', 'Player Passes', 'Player Saves', 'Player Tackles'], defaultName: 'Over' },
      { id: 'allplayerprops', label: 'All Player Props', prefixes: ['Player '] },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
    ],
    tennis: [
      { id: 'main', label: 'Match Lines', markets: ['Moneyline', 'Game Spread', 'Set Spread', 'Total Games', 'Total Sets'] },
      { id: 'firstset', label: 'First Set', markets: ['1st Set Game Spread', '1st Set Moneyline', '1st Set Total Games'] },
      { id: 'secondset', label: 'Second Set', markets: ['2nd Set Moneyline'] },
      { id: 'playergames', label: 'Player Games', markets: ['Player Games Won'], defaultName: 'Over' },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
    ],
    ufc: [
      { id: 'main', label: 'Main Fight Lines', markets: ['Moneyline', 'Point Spread', 'Total Rounds', 'Fight Goes The Distance'] },
      { id: 'decision', label: 'Distance / Decision', markets: ['Fight Goes The Distance', 'Fight Goes to Split Decision'] },
      { id: 'roundstart', label: 'Round Start', markets: ['Fight To Start Round 2', 'Fight To Start Round 3', 'Fight To Start Round 4', 'Fight To Start Round 5'] },
      { id: 'fightstats', label: 'Fighter / Fight Stats', markets: ['Total Takedowns', 'Total Significant Strikes', 'Most Takedowns Landed', 'Most Significant Strikes Landed'] },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
    ],
    golf: [
      { id: 'placement', label: 'Outrights / Placement', markets: ['Tournament Winner', 'Top 5 Finish', 'Top 10 Finish', 'Top 20 Finish'] },
      { id: 'roundleaders', label: 'Round Leaders', markets: ['1st Round Leader', '2nd Round Leader'] },
      { id: 'roundprops', label: 'Player Round Props', markets: ['Player Round Score', 'Player Birdies', 'Player Bogeys'], defaultName: 'Over' },
      { id: 'specials', label: 'Specials', markets: ['Hole In One'] },
      { id: 'custom', label: 'All Markets', markets: ALL_MARKETS }
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
