# RULES
# 1) User Total = Individual + Team (separately for Points and EXP).
# 2) Team Total = SUM(User Totals) of its members (i.e., includes each member's Individual + Team).
# 3) When a user transfers Team X -> Team Y:
#    Team X Total -= User Total
#    Team Y Total += User Total
#    (apply separately for Points and EXP)

# EXAMPLE DATA (Team A with 2 users; Team B empty)
Team A
 ├── User 1
 │    ├── Individual
 │    │    ├── Points: 120
 │    │    └── EXP: 450
 │    └── Team
 │         ├── Points: 200
 │         └── EXP: 380
 │    ➜ User 1 Total: Points = 120+200 = 320 | EXP = 450+380 = 830
 ├── User 2
 │    ├── Individual
 │    │    ├── Points: 90
 │    │    └── EXP: 300
 │    └── Team
 │         ├── Points: 150
 │         └── EXP: 250
 │    ➜ User 2 Total: Points = 90+150 = 240 | EXP = 300+250 = 550
 └── Team A Total (includes Individual + Team)
      ├── Points: 320 + 240 = 560
      └── EXP: 830 + 550 = 1380

Team B
 └── Team B Total (includes Individual + Team)
      ├── Points: 0
      └── EXP: 0

# TRANSFER OPERATION
# Action: Move User 2 from Team A -> Team B (user carries Individual+Team totals)

# BEFORE:
# Team A Total: Points=560, EXP=1380
# Team B Total: Points=0,   EXP=0
# User 2 Total: Points=240, EXP=550

# APPLY TRANSFER:
# Team A New Total = 560 - 240 = 320 points | 1380 - 550 = 830 EXP
# Team B New Total =   0 + 240 = 240 points |    0 + 550 = 550 EXP

# AFTER:
Team A
 ├── User 1 (unchanged)
 │    ├── Individual
 │    │    ├── Points: 120
 │    │    └── EXP: 450
 │    └── Team
 │         ├── Points: 200
 │         └── EXP: 380
 │    ➜ User 1 Total: Points = 320 | EXP = 830
 └── Team A Total (updated)
      ├── Points: 320
      └── EXP: 830

Team B
 ├── User 2 (moved here; carries totals)
 │    ├── Individual
 │    │    ├── Points: 90
 │    │    └── EXP: 300
 │    └── Team
 │         ├── Points: 150
 │         └── EXP: 250
 │    ➜ User 2 Total: Points = 240 | EXP = 550
 └── Team B Total (updated)
      ├── Points: 240
      └── EXP: 550
