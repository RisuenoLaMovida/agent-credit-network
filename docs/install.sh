#!/bin/bash
# ACN Skill One-Line Installer
# Usage: curl -sSL https://risuenolamovida.github.io/agent-credit-network/install.sh | bash

set -e

echo "🚀 Installing Agent Credit Network (ACN) Skill..."
echo ""

# Create directory
mkdir -p ~/.openclaw/skills/acn

# Download skill files
echo "📥 Downloading skill files..."
curl -sSL https://raw.githubusercontent.com/RisuenoLaMovida/agent-credit-network/main/skills/acn/skill.py > ~/.openclaw/skills/acn/skill.py
curl -sSL https://raw.githubusercontent.com/RisuenoLaMovida/agent-credit-network/main/skills/acn/SKILL.md > ~/.openclaw/skills/acn/SKILL.md
curl -sSL https://raw.githubusercontent.com/RisuenoLaMovida/agent-credit-network/main/skills/acn/requirements.txt > ~/.openclaw/skills/acn/requirements.txt

echo "✅ Skill files downloaded!"
echo ""

# Check Python
if command -v python3 &> /dev/null; then
    echo "🐍 Python3 found"
    
    # Try to install requests if not present
    if python3 -c "import requests" 2>/dev/null; then
        echo "✅ requests library already installed"
    else
        echo "📦 Installing requests library..."
        pip3 install requests -q 2>/dev/null || pip install requests -q 2>/dev/null || echo "⚠️  Could not install requests. Run: pip3 install requests"
    fi
else
    echo "⚠️  Python3 not found. Please install Python3 to use the skill."
fi

echo ""
echo "🎉 ACN Skill installed successfully!"
echo ""
echo "📍 Location: ~/.openclaw/skills/acn/"
echo ""
echo "🚀 Quick Start:"
echo "   from acn_skill import ACNSkill"
echo "   acn = ACNSkill()"
echo "   acn.register('YourAgent', '0x...', 'borrower')"
echo ""
echo "📖 Full docs: ~/.openclaw/skills/acn/SKILL.md"
echo "🌐 Website: https://risuenolamovida.github.io/agent-credit-network/"
echo ""
echo "💰 Start lending or borrowing today!"
echo "🤙 Viva La Movida!"
