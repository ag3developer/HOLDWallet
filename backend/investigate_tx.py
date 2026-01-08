#!/usr/bin/env python3
from web3 import Web3
import requests

system_address = '0xf35180d70920361426b5c3db222DEb450aA19979'
suspicious_address = '0xeB4c1Fe541e5361340f10B5c712d82aA6e441319'

print('INVESTIGACAO DE TRANSACAO SUSPEITA')
print('=' * 70)
print(f'Sistema: {system_address}')
print(f'Suspeito: {suspicious_address}')

w3 = Web3(Web3.HTTPProvider('https://polygon-rpc.com'))

# Saldos atuais
print()
print('SALDOS ATUAIS:')
balance = w3.eth.get_balance(system_address)
print(f'Sistema MATIC: {w3.from_wei(balance, "ether")}')

balance_sus = w3.eth.get_balance(suspicious_address)
print(f'Suspeito MATIC: {w3.from_wei(balance_sus, "ether")}')

# USDT
usdt = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
abi = [{'constant':True,'inputs':[{'name':'_owner','type':'address'}],'name':'balanceOf','outputs':[{'name':'balance','type':'uint256'}],'type':'function'}]
contract = w3.eth.contract(address=Web3.to_checksum_address(usdt), abi=abi)

usdt_sys = contract.functions.balanceOf(Web3.to_checksum_address(system_address)).call()
usdt_sus = contract.functions.balanceOf(Web3.to_checksum_address(suspicious_address)).call()
print(f'Sistema USDT: {usdt_sys / 10**6}')
print(f'Suspeito USDT: {usdt_sus / 10**6}')

# Buscar transacoes de tokens
print()
print('BUSCANDO TRANSACOES DE TOKENS...')
url = f'https://api.polygonscan.com/api?module=account&action=tokentx&address={system_address}&sort=desc'
r = requests.get(url, timeout=15)
data = r.json()

found = False
if data.get('status') == '1':
    for tx in data['result'][:50]:
        to_addr = tx['to'].lower()
        from_addr = tx['from'].lower()
        if to_addr == suspicious_address.lower() or from_addr == suspicious_address.lower():
            found = True
            value = int(tx['value']) / 10**int(tx.get('tokenDecimal', 18))
            print()
            print('!!! TRANSACAO RELACIONADA AO ENDERECO SUSPEITO !!!')
            print(f'TX: {tx["hash"]}')
            print(f'De: {tx["from"]}')
            print(f'Para: {tx["to"]}')
            print(f'Valor: {value} {tx.get("tokenSymbol", "TOKEN")}')
            print(f'Block: {tx["blockNumber"]}')

# Buscar transacoes normais (MATIC)
print()
print('BUSCANDO TRANSACOES DE MATIC...')
url2 = f'https://api.polygonscan.com/api?module=account&action=txlist&address={system_address}&sort=desc'
r2 = requests.get(url2, timeout=15)
data2 = r2.json()

if data2.get('status') == '1':
    for tx in data2['result'][:50]:
        to_addr = tx['to'].lower() if tx['to'] else ''
        from_addr = tx['from'].lower()
        if to_addr == suspicious_address.lower() or from_addr == suspicious_address.lower():
            found = True
            value = int(tx['value']) / 10**18
            print()
            print('!!! TRANSACAO MATIC RELACIONADA AO ENDERECO SUSPEITO !!!')
            print(f'TX: {tx["hash"]}')
            print(f'De: {tx["from"]}')
            print(f'Para: {tx["to"]}')
            print(f'Valor: {value} MATIC')
            print(f'Block: {tx["blockNumber"]}')

if not found:
    print()
    print('Nenhuma transacao encontrada entre os dois enderecos.')
    print()
    print('Verificando historico completo do endereco suspeito...')
    
    # Verificar de onde o suspeito recebeu
    url3 = f'https://api.polygonscan.com/api?module=account&action=tokentx&address={suspicious_address}&sort=desc'
    r3 = requests.get(url3, timeout=15)
    data3 = r3.json()
    
    if data3.get('status') == '1':
        print(f'Transacoes de tokens do endereco suspeito:')
        for tx in data3['result'][:10]:
            value = int(tx['value']) / 10**int(tx.get('tokenDecimal', 18))
            direction = 'IN' if tx['to'].lower() == suspicious_address.lower() else 'OUT'
            print(f'  {direction} | {value} {tx.get("tokenSymbol")} | De: {tx["from"][:20]}... Para: {tx["to"][:20]}...')
