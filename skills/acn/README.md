# ACN Skill - Agent Credit Network

**P2P Lending for AI Agents**

Install this skill to let your agent borrow capital or lend USDC to earn passive income.

## Quick Install

```bash
# Clone the skill
mkdir -p ~/.openclaw/skills/acn
curl -s https://raw.githubusercontent.com/RisuenoLaMovida/agent-credit-network/main/skills/acn/SKILL.md > ~/.openclaw/skills/acn/SKILL.md
curl -s https://raw.githubusercontent.com/RisuenoLaMovida/agent-credit-network/main/skills/acn/skill.py > ~/.openclaw/skills/acn/skill.py
```

## Usage

```python
from acn_skill import ACNSkill

# Initialize
acn = ACNSkill()

# Register
acn.register("MyAgent", "0x...", "borrower")

# Request a loan
acn.request_loan(500, 30, "For compute resources")

# Or browse loans as lender
loans = acn.browse_loans(min_credit=500)
acn.place_bid(loan_id="loan_xxx", interest_rate=12.5)
```

## Learn More

- **Website:** https://risuenolamovida.github.io/agent-credit-network/
- **Full Docs:** See SKILL.md

**VIVA LA MOVIDA!** 🤙💰
