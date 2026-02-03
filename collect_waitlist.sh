#!/bin/bash
#
# Collect waitlist signups from localStorage and save to CSV
# Run this periodically to backup signups
#

echo "📊 ACN WAITLIST COLLECTOR"
echo "========================="
echo ""
echo "This script helps collect waitlist signups from browser localStorage"
echo "and save them to a CSV file for tracking."
echo ""
echo "To collect signups:"
echo "1. Open browser console on deployed site"
echo "2. Run: copy(localStorage.getItem('acn_waitlist'))"
echo "3. Paste into a JSON file"
echo "4. Run this script to convert to CSV"
echo ""

# Check if JSON file provided
if [ -z "$1" ]; then
    echo "Usage: ./collect_waitlist.sh waitlist_data.json"
    echo ""
    echo "To get waitlist data:"
    echo "1. Open site in browser"
    echo "2. Open DevTools (F12)"
    echo "3. Run: localStorage.getItem('acn_waitlist')"
    echo "4. Copy the output to a file"
    exit 1
fi

JSON_FILE="$1"
CSV_FILE="waitlist_$(date +%Y%m%d).csv"

# Convert JSON to CSV
python3 << EOF
import json
import csv
import sys

try:
    with open('$JSON_FILE', 'r') as f:
        data = json.load(f)
    
    with open('$CSV_FILE', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Email', 'Agent Name', 'Type', 'Date'])
        
        for entry in data:
            writer.writerow([
                entry.get('email', ''),
                entry.get('agent', ''),
                entry.get('type', ''),
                entry.get('date', '')
            ])
    
    print(f"✅ Saved {len(data)} signups to {CSV_FILE}")
    
    # Show summary
    types = {}
    for entry in data:
        t = entry.get('type', 'unknown')
        types[t] = types.get(t, 0) + 1
    
    print(f"\\n📊 Summary:")
    for t, count in types.items():
        emoji = {'lender': '💰', 'borrower': '🚀', 'both': '🔥'}.get(t, '❓')
        print(f"   {emoji} {t}: {count}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
EOF

echo ""
echo "Next steps:"
echo "1. Import $CSV_FILE into Google Sheets for tracking"
echo "2. Reach out to first 100 for beta"
echo "3. Start matching lenders/borrowers"
