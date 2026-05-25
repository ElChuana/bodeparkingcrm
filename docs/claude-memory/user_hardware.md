---
name: user-hardware
description: "Hardware del setup del usuario — GPU, monitores y sus límites reales de refresh rate"
metadata: 
  node_type: memory
  type: user
  originSessionId: 09acd252-7aba-4d48-99f7-fac64a042a51
---

Setup de hardware del usuario (verificado 2026-05-25):

- **GPU**: Intel UHD Graphics 630 (CometLake-S, driver i915)
  - HDMI 1.4 (max ~10.2 Gbps)
  - DisplayPort 1.2 (max ~17.28 Gbps)
- **Monitor primario DP-1**: Xiaomi Mi Monitor 3440x1440 ultrawide, conectado por DisplayPort
  - Soporta hasta 120Hz nativos pero la GPU limita a **100Hz** estables (DP 1.2 no alcanza para 120Hz a esa resolución)
  - Modos válidos: 50/60/100/120Hz a 3440x1440
- **Monitor secundario HDMI-A-3**: LG QHD 2560x1440, rotado (transform=3, vertical)
  - Máximo del panel a 1440p: **74.96Hz** (no soporta 120Hz a resolución nativa)

Config aplicada en `~/.config/hypr/monitors.lua`:
- DP-1 → `3440x1440@100`
- HDMI-A-3 → `2560x1440@74.96`

**How to apply:** Si el usuario reporta problemas de fluidez/refresh, recordar que el techo real es 100Hz en el Xiaomi y 75Hz en el LG por límites de hardware (GPU + panel). No prometer 120Hz reales con esta combinación.
