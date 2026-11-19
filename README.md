# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/matzzsatoru/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/matzzsatoru/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token launch radar: it reads a sealed snapshot of every protocol DefiLlama tracks, finds the ones with no token yet, and ranks them by what their launch would be worth. Each protocol gets an implied value from a model calibrated on the snapshot itself — the median market-cap-to-TVL ratio of the live-token protocols in its category — plus its seven-day growth, how long it has run with no token, and how many chains it runs on. Every row carries an eight-step farm plan with costs and times, and the dashboard shows the model and the calibration behind each number.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input path/to/snapshot.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=mcn28m2m&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
