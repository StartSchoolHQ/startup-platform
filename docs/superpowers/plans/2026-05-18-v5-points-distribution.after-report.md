# V5 Points Distribution — Before/After Report

**Applied:** 2026-05-18

## What changed

1. **Future team-task approvals** now use `distribute_team_rewards_v2`, which applies a team-size upmark on top of the base split:

   | Team size | Upmark | Per-member share of a 240-pt task |
   |---|---|---|
   | 1 (solo) | +0% | 240 |
   | 2 | +30% | 156 |
   | 3 | +50% | 120 |
   | 4+ | +70% | 102 (or less for 5+, capped) |

   Formula: `per_member = ROUND( (base / team_size) × (1 + upmark) )`

2. **One-time inflation** applied to existing user totals based on **current team size** (historical team composition ignored, per spec).
   - 39 users inflated
   - 19 solo and 12 unteamed users skipped (factor 1.00 → 0 delta)
   - Total added: **+47,008 pts**, **+58,742 XP**
   - Audit row per inflated user: `transactions.type = 'admin_grant'`, description `"V5 distribution rebalance (current team size: N)"`

3. **Unchanged paths:** individual tasks (`complete_individual_task`), client meetings (`complete_meeting`), team achievements (`award_team_achievement`), strikes, reviewer rewards.

4. **Rollback safety:** the original `distribute_team_rewards` function is untouched and remains callable; flipping one line in `submit_external_peer_review` reverts to V1 behavior.

---

## Headline leaderboard movement (top 10)

| New rank | Was | Name | Team | Size | Before pts | After pts | Δ pts |
|---|---|---|---|---|---|---|---|
| 1 | 1 | Kristine Fedulova | ThinkChess | 1 | 9596 | 9596 | 0 |
| 2 | 2 | Agnese Misāne | CyberEd | 1 | 9152 | 9152 | 0 |
| 3 | 4 ↑ | Gints Turlajs | bettermind.now | 2 | 7249 | **8827** | +1578 |
| 4 | 6 ↑ | Mikus Straumēns | bettermind.now | 2 | 6592 | **8170** | +1578 |
| 5 | 3 ↓ | Inga Priedite | RootCode.Guide | 1 | 7252 | 7252 | 0 |
| 6 | 14 ↑ | Martins Mozga | WebGlazer | 4 | 3976 | **6803** | +2827 |
| 7 | 16 ↑ | Erik Babra | WebGlazer | 4 | 3888 | **6715** | +2827 |
| 8 | 5 ↓ | Andris Vilks | ScratchTheScore | 1 | 6606 | 6606 | 0 |
| 9 | 9 | Liene Dobele | ConnyAI | 3 | 4428 | **6515** | +2087 |
| 10 | 10 | Jānis Ārgalis | ConnyAI | 3 | 4373 | **6460** | +2087 |

Solo-founder share of top 10 dropped from **5/10 → 3/10**. Two WebGlazer quad members entered the top 10 for the first time. Solo #1 and #2 stayed put — V5 doesn't punish high-performing solos, it just lets teams catch up through cooperation.

---

## Full user table

Every active user, sorted by new total points.

| # | Name | Team | Size | Before pts | After pts | Δ pts | Before XP | After XP | Δ XP | Factor |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Kristine Fedulova | ThinkChess | 1 | 9596 | 9596 | 0 | 11498 | 11498 | 0 | — |
| 2 | Agnese Misāne | CyberEd | 1 | 9152 | 9152 | 0 | 10940 | 10940 | 0 | — |
| 3 | Gints Turlajs | bettermind.now | 2 | 7249 | 8827 | +1578 | 8443 | 10416 | +1973 | +30% |
| 4 | Mikus Straumēns | bettermind.now | 2 | 6592 | 8170 | +1578 | 7620 | 9593 | +1973 | +30% |
| 5 | Inga Priedite | RootCode.Guide | 1 | 7252 | 7252 | 0 | 8712 | 8712 | 0 | — |
| 6 | Martins Mozga | WebGlazer | 4 | 3976 | 6803 | +2827 | 5279 | 8801 | +3522 | +70% |
| 7 | Erik Babra | WebGlazer | 4 | 3888 | 6715 | +2827 | 5131 | 8653 | +3522 | +70% |
| 8 | Andris Vilks | ScratchTheScore | 1 | 6606 | 6606 | 0 | 8012 | 8012 | 0 | — |
| 9 | Liene Dobele | ConnyAI | 3 | 4428 | 6515 | +2087 | 5431 | 8040 | +2609 | +50% |
| 10 | Jānis Ārgalis | ConnyAI | 3 | 4373 | 6460 | +2087 | 5218 | 7827 | +2609 | +50% |
| 11 | Jurita Brunava | TEBRA 21 | 2 | 5154 | 6242 | +1088 | 6187 | 7546 | +1359 | +30% |
| 12 | Markuss Titovs | WebGlazer | 4 | 3555 | 5876 | +2321 | 4182 | 7074 | +2892 | +70% |
| 13 | Linda Bondare | CE.D | 4 | 4497 | 5604 | +1107 | 5275 | 6670 | +1395 | +70% |
| 14 | Jānis Trēgers | WebGlazer | 4 | 3116 | 5437 | +2321 | 4132 | 7024 | +2892 | +70% |
| 15 | Maris Nelsons | TEBRA 21 | 2 | 4096 | 5184 | +1088 | 4889 | 6248 | +1359 | +30% |
| 16 | Alla Polischuk | Betterskin | 2 | 4057 | 4942 | +885 | 4818 | 5925 | +1107 | +30% |
| 17 | Inga Basikirska | The Idea Unboxing | 2 | 3901 | 4858 | +957 | 4289 | 5485 | +1196 | +30% |
| 18 | Valērija Ečina | ConnyAI | 3 | 3484 | 4715 | +1231 | 4022 | 5571 | +1549 | +50% |
| 19 | Sandis Mežaraups | CoachSet | 4 | 3051 | 4672 | +1621 | 3613 | 5633 | +2020 | +70% |
| 20 | Sandra Smalina | The Idea Unboxing | 2 | 3640 | 4597 | +957 | 4087 | 5283 | +1196 | +30% |
| 21 | Vita Jekabsone | CoachSet | 4 | 2899 | 4520 | +1621 | 3242 | 5262 | +2020 | +70% |
| 22 | Alise-Linda Valdheima | Betterskin | 2 | 3464 | 4349 | +885 | 3974 | 5081 | +1107 | +30% |
| 23 | Viktors Liepins-Kolodins | Iron Grid | 1 | 4301 | 4301 | 0 | 5144 | 5144 | 0 | — |
| 24 | Aksels Trulis | CoachSet | 4 | 2630 | 4251 | +1621 | 2903 | 4923 | +2020 | +70% |
| 25 | Zanda Rasa | Doin' App | 3 | 2954 | 4250 | +1296 | 3481 | 5101 | +1620 | +50% |
| 26 | Zlata Daškeviča | CoachSet | 4 | 2616 | 4237 | +1621 | 2885 | 4905 | +2020 | +70% |
| 27 | Alyona Matvejeva | Doin' App | 3 | 2864 | 4160 | +1296 | 3491 | 5111 | +1620 | +50% |
| 28 | Inese Tīkmane | Barkulator | 3 | 2835 | 3743 | +908 | 3196 | 4333 | +1137 | +50% |
| 29 | Guntars Nemiro | CarRentDesk | 1 | 3630 | 3630 | 0 | 4431 | 4431 | 0 | — |
| 30 | Artūrs Dukaļskis | CE.D | 4 | 2447 | 3554 | +1107 | 2960 | 4355 | +1395 | +70% |
| 31 | Elizabete Akona | HolyDonation.com | 3 | 2381 | 3411 | +1030 | 2898 | 4181 | +1283 | +50% |
| 32 | Krists Andersons | HolyDonation.com | 3 | 2304 | 3334 | +1030 | 3021 | 4304 | +1283 | +50% |
| 33 | Robins Reins | HolyDonation.com | 3 | 2174 | 3204 | +1030 | 2584 | 3867 | +1283 | +50% |
| 34 | Marta Teivāne | Barkulator | 3 | 2233 | 3141 | +908 | 2496 | 3633 | +1137 | +50% |
| 35 | Emīls Ronis | Solara Music Vibes | 2 | 2489 | 3116 | +627 | 2614 | 3398 | +784 | +30% |
| 36 | Deniss Vigovskis | Solara Music Vibes | 2 | 2458 | 3085 | +627 | 2701 | 3485 | +784 | +30% |
| 37 | Adriāns Piliksers | CE.D | 4 | 1881 | 2988 | +1107 | 1993 | 3388 | +1395 | +70% |
| 38 | Kerena Ansone | CE.D | 4 | 1881 | 2988 | +1107 | 1993 | 3388 | +1395 | +70% |
| 39 | Matvei Medvedev | Pepol invoice conversion api | 1 | 2940 | 2940 | 0 | 4180 | 4180 | 0 | — |
| 40 | Petra-Baiba Olehno | Barkulator | 3 | 2015 | 2923 | +908 | 2273 | 3410 | +1137 | +50% |
| 41 | Alic Merlivat | — | 0 | 2835 | 2835 | 0 | 3159 | 3159 | 0 | — |
| 42 | Davis Reinis | Replyo AI | 1 | 2793 | 2793 | 0 | 3371 | 3371 | 0 | — |
| 43 | Edvards Broders | BlipBlop | 2 | 1835 | 2464 | +629 | 2887 | 3673 | +786 | +30% |
| 44 | Carlos Mestre | BlipBlop | 2 | 1831 | 2460 | +629 | 2683 | 3469 | +786 | +30% |
| 45 | Aigars Reiters | SpeakOnMic | 1 | 2385 | 2385 | 0 | 2981 | 2981 | 0 | — |
| 46 | Helvijs Leja | CrossAware | 1 | 2331 | 2331 | 0 | 2664 | 2664 | 0 | — |
| 47 | Eliass Baranovs | [TEST] Test product | 2 | 2268 | 2268 | 0 | 2561 | 2561 | 0 | — |
| 48 | Anita Novicka | AmberPulse/Anita Novicka | 1 | 2116 | 2116 | 0 | 2189 | 2189 | 0 | — |
| 49 | Janis Vedla | — | 0 | 1820 | 1820 | 0 | 1646 | 1646 | 0 | — |
| 50 | Līva Birkava | — | 0 | 1565 | 1565 | 0 | 1597 | 1597 | 0 | — |
| 51 | Oskars Zvingulis | — | 0 | 1422 | 1422 | 0 | 1274 | 1274 | 0 | — |
| 52 | Raimonds Priedītis | Aivar | 1 | 1420 | 1420 | 0 | 1398 | 1398 | 0 | — |
| 53 | Iveta Zālīte | — | 0 | 740 | 740 | 0 | 548 | 548 | 0 | — |
| 54 | Inga Kononova | Doin' App | 3 | 435 | 669 | +234 | 667 | 958 | +291 | +50% |
| 55 | Māris Punenovs | DuoRay | 1 | 564 | 564 | 0 | 80 | 80 | 0 | — |
| 56 | Eliass Test | [TEST] Test product | 2 | 554 | 554 | 0 | 68 | 68 | 0 | — |
| 57 | Romans Kartasovs | antifrog | 1 | 547 | 547 | 0 | 949 | 949 | 0 | — |
| 58 | Rolands Siliņš | — | 0 | 500 | 500 | 0 | 0 | 0 | 0 | — |
| 59 | Anna Andersone | — | 0 | 500 | 500 | 0 | 0 | 0 | 0 | — |
| 60 | Arina Li | — | 0 | 500 | 500 | 0 | 0 | 0 | 0 | — |
| 61 | Zane Jakobsone | — | 0 | 500 | 500 | 0 | 0 | 0 | 0 | — |
| 62 | Aivis Brutans | — | 0 | 500 | 500 | 0 | 0 | 0 | 0 | — |
| 63 | Alberts Levics | Collective_Experiments | 1 | 312 | 312 | 0 | 890 | 890 | 0 | — |
| 64 | Kārlis Kalds | Cucuro/BearlyFunctioningCo. | 2 | 208 | 300 | +92 | 385 | 501 | +116 | +30% |
| 65 | Junie Sandberga | Cucuro/BearlyFunctioningCo. | 2 | 116 | 208 | +92 | 385 | 501 | +116 | +30% |
| 66 | Nils Ozols | — | 0 | 182 | 182 | 0 | 350 | 350 | 0 | — |
| 67 | Markuss Brieze | — | 0 | 182 | 182 | 0 | 350 | 350 | 0 | — |
| 68 | Ivo Čapiņš | Fragment | 1 | 100 | 100 | 0 | 0 | 0 | 0 | — |
| 69 | Victoria Kolosova | mirror-mirror | 2 | 44 | 87 | +43 | 180 | 234 | +54 | +30% |
| 70 | Janis Strapcans | FocusFine - app blocker | 1 | 82 | 82 | 0 | 350 | 350 | 0 | — |
| 71 | Jānis Altgauzens | Janis - Test product | 1 | 82 | 82 | 0 | 1040 | 1040 | 0 | — |
| 72 | Artis Steinerts | mirror-mirror | 2 | 0 | 0 | 0 | 50 | 50 | 0 | — |
| 73 | Rihards Liepa | Zolara | 1 | 0 | 0 | 0 | 50 | 50 | 0 | — |

Notes:
- "Δ" columns show inflation grants only. Solo / unteamed users show 0 by design (per spec: "we don't really care about historical teammate count, just inflate by current status").
- Users with team_size=2 but Δ=0 (e.g. Eliass Baranovs, Eliass Test, Artis Steinerts) have no historical team-task earnings — nothing to inflate.
- "Before" values are reconstructed as `after_pts - delta_pts`. They match the pre-backfill baseline captured in the snapshot file.

---

## Going forward

Next time a team task gets approved via peer review:
- Solo team's founder gets the full base reward
- Duo gets `base/2 × 1.30` each
- Trio gets `base/3 × 1.50` each
- Quad+ gets `base/4 × 1.70` each (cap)

Each new transaction records `metadata.distribution_version = "v2"` and the exact `upmark_factor` used.
