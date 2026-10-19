# bandwidthswap.com

Source for the Bandwidth Swap project site and whitepaper. Served by GitHub Pages from `main`.

- **Site:** https://bandwidthswap.com
- **Paper (LaTeX-style):** https://bandwidthswap.com/docs/paper.html; the same paper in plain words: https://bandwidthswap.com/docs/paper-plain.html; for operators: https://bandwidthswap.com/docs/paper-operators.html
- **What changed in v0.6 (Oct 18, 2026):** https://bandwidthswap.com/docs/whitepaper-diff-v0.6.html; v0.4 to v0.5: https://bandwidthswap.com/docs/whitepaper-diff-v0.5.html; v0.3 to v0.4: https://bandwidthswap.com/docs/whitepaper-diff-v0.4.html; v0.2 to v0.3: https://bandwidthswap.com/docs/whitepaper-diff-v0.3.html; from the 2021 paper to v0.2: https://bandwidthswap.com/docs/whitepaper-diff.html
- **Lab status, live from the four nodes:** https://bandwidthswap.com/#lab; the network, every Mint the map lists: https://bandwidthswap.com/docs/network.html; the Steward's book: https://bandwidthswap.com/docs/steward.html
- **Field notes:** https://bandwidthswap.com/notes/
- **The kit (receipt daemon, Mint, node provisioning):** https://github.com/bandwidthswap/kit
- **Open questions:** [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md)

Edit `paper/BANDWIDTH-whitepaper-v0.6.md` (or its two readings, `-v0.6-plain.md` and `-v0.6-operators.md`) or `OPEN-QUESTIONS.md`, run `tools/build.sh`, push. A field note is one HTML file in `notes/` plus a line in `notes/index.html` and in the Field notes section of `index.html`. Needs pandoc and python3.

For the full handoff (layout, conventions, decisions, next step) read [CLAUDE.md](CLAUDE.md). To flash the cards and bring up the three Pis, read [PHASE0-SETUP.md](PHASE0-SETUP.md). The parts, by phase and with a budget, are in [SHOPPING-LIST.md](SHOPPING-LIST.md).
