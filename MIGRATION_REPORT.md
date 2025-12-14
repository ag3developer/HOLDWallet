# 📊 Relatório de Análise de Migração de Banco de Dados

**Data**: 2025-12-14 14:04:41
**Origem**: SQLite Local (`holdwallet.db`)
**Destino**: PostgreSQL DigitalOcean (Produção)

## 📋 Resumo Executivo

- **Total de Tabelas**: 27
- **Total de Linhas**: 49
- **Tabelas com Dados**: 8
- **Tabelas Vazias**: 19

## 📑 Detalhes das Tabelas

| Tabela | Linhas | Colunas | Índices | FK | Prioridade |
|--------|--------|---------|---------|----|-----------|
| addresses | 32 | 11 | 6 | 1 | Alta |
| p2p_orders | 5 | 19 | 1 | 0 | Alta |
| users | 4 | 9 | 3 | 0 | Alta |
| wallet_balances | 3 | 9 | 3 | 0 | Alta |
| wallets | 2 | 10 | 4 | 1 | Alta |
| p2p_trades | 1 | 14 | 1 | 0 | Alta |
| payment_methods | 1 | 7 | 1 | 0 | Alta |
| trader_profiles | 1 | 23 | 2 | 1 | Alta |
| balance_history | 0 | 12 | 3 | 0 | Baixa |
| fraud_reports | 0 | 15 | 5 | 3 | Baixa |
| instant_trade_history | 0 | 7 | 4 | 1 | Baixa |
| instant_trades | 0 | 26 | 14 | 1 | Baixa |
| p2p_chat_messages | 0 | 10 | 1 | 2 | Baixa |
| p2p_chat_rooms | 0 | 8 | 2 | 3 | Baixa |
| p2p_chat_sessions | 0 | 10 | 2 | 2 | Baixa |
| p2p_disputes | 0 | 11 | 1 | 3 | Baixa |
| p2p_escrows | 0 | 7 | 2 | 1 | Baixa |
| p2p_file_uploads | 0 | 12 | 1 | 2 | Baixa |
| p2p_matches | 0 | 14 | 1 | 4 | Baixa |
| payment_method_verifications | 0 | 19 | 4 | 2 | Baixa |
| trade_feedbacks | 0 | 18 | 4 | 1 | Baixa |
| trader_stats | 0 | 10 | 1 | 1 | Baixa |
| transactions | 0 | 22 | 9 | 2 | Baixa |
| two_factor_auth | 0 | 9 | 2 | 1 | Baixa |
| user_badges | 0 | 10 | 4 | 1 | Baixa |
| user_reputations | 0 | 24 | 6 | 1 | Baixa |
| user_reviews | 0 | 19 | 7 | 4 | Baixa |

## 🔄 Ordem de Migração (Respeitando Dependências)

1. `balance_history` - Sem dependências
2. `p2p_orders` - Sem dependências
3. `p2p_trades` - Sem dependências
4. `payment_methods` - Sem dependências
5. `users` - Sem dependências
6. `wallet_balances` - Sem dependências
7. `instant_trades` - Dependências: users
8. `p2p_matches` - Dependências: users, users, p2p_orders, p2p_orders
9. `payment_method_verifications` - Dependências: users, users
10. `trade_feedbacks` - Dependências: p2p_matches
11. `trader_profiles` - Dependências: users
12. `trader_stats` - Dependências: trader_profiles
13. `two_factor_auth` - Dependências: users
14. `user_reputations` - Dependências: users
15. `user_reviews` - Dependências: users, users, users, p2p_matches
16. `wallets` - Dependências: users
17. `addresses` - Dependências: wallets
18. `fraud_reports` - Dependências: users, p2p_matches, user_reputations
19. `instant_trade_history` - Dependências: instant_trades
20. `p2p_chat_rooms` - Dependências: users, users, p2p_matches
21. `p2p_chat_sessions` - Dependências: p2p_chat_rooms, users
22. `p2p_disputes` - Dependências: users, users, p2p_matches
23. `p2p_escrows` - Dependências: p2p_matches
24. `transactions` - Dependências: addresses, users
25. `user_badges` - Dependências: user_reputations
26. `p2p_chat_messages` - Dependências: users, p2p_chat_rooms
27. `p2p_file_uploads` - Dependências: users, p2p_chat_messages

## ✅ Checklist de Execução

### Fase 1: Preparação
- [ ] Fazer backup do banco de dados local
- [ ] Fazer backup do banco de dados de produção
- [ ] Testar conexão com PostgreSQL DigitalOcean
- [ ] Garantir que todas as tabelas estão criadas em produção

### Fase 2: Migração de Dados
- [ ] Migrar tabela `balance_history`
- [ ] Migrar tabela `p2p_orders`
- [ ] Migrar tabela `p2p_trades`
- [ ] Migrar tabela `payment_methods`
- [ ] Migrar tabela `users`
- [ ] Migrar tabela `wallet_balances`
- [ ] Migrar tabela `instant_trades`
- [ ] Migrar tabela `p2p_matches`
- [ ] Migrar tabela `payment_method_verifications`
- [ ] Migrar tabela `trade_feedbacks`
- [ ] Migrar tabela `trader_profiles`
- [ ] Migrar tabela `trader_stats`
- [ ] Migrar tabela `two_factor_auth`
- [ ] Migrar tabela `user_reputations`
- [ ] Migrar tabela `user_reviews`
- [ ] Migrar tabela `wallets`
- [ ] Migrar tabela `addresses`
- [ ] Migrar tabela `fraud_reports`
- [ ] Migrar tabela `instant_trade_history`
- [ ] Migrar tabela `p2p_chat_rooms`
- [ ] Migrar tabela `p2p_chat_sessions`
- [ ] Migrar tabela `p2p_disputes`
- [ ] Migrar tabela `p2p_escrows`
- [ ] Migrar tabela `transactions`
- [ ] Migrar tabela `user_badges`
- [ ] Migrar tabela `p2p_chat_messages`
- [ ] Migrar tabela `p2p_file_uploads`

### Fase 3: Validação
- [ ] Comparar contagem de linhas
- [ ] Validar integridade referencial
- [ ] Verificar constraints
- [ ] Testar todas as sequências/auto-increment
- [ ] Validar dados críticos (usuários, wallets, etc)


## 🔧 Próximos Passos

1. Execute `MIGRATION_SCRIPT.py` para gerar o script SQL de migração
2. Review do script gerado antes de executar
3. Execute em ambiente de staging primeiro
4. Após validação, execute em produção
