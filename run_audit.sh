#!/bin/bash
cd /Users/josecarlosmartins/Documents/HOLDWallet
/usr/bin/python3 check_address.py > audit_result.txt 2>&1
echo "Script finalizado"
cat audit_result.txt
