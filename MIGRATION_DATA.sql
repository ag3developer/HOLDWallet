-- ============================================================================
-- SCRIPT DE MIGRAÇÃO: SQLite Local → PostgreSQL DigitalOcean
-- Gerado em: 2025-12-14 14:04:54
-- ============================================================================

-- IMPORTANTE:
-- 1. Backup do banco de destino foi feito?
-- 2. Todas as tabelas foram criadas em PostgreSQL?
-- 3. Você revisa o script antes de executar?

-- Desabilitar constraints durante a inserção
SET CONSTRAINTS ALL DEFERRED;


-- ============================================================================
-- Tabela: addresses (32 linhas)
-- ============================================================================
TRUNCATE TABLE addresses CASCADE;

INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (31, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '0xb07df60907d1325a800420ff6753094cce6314bb', 'multi', 'receiving', 0, 'Z0FBQUFBQnBOZ2VhM1hCSDRfbGhjcGd2RDdxbFJnQWR1OUF6VjBoZnkwWFNLRWxKZlg5U0hETXFveUo4MW9jcHFRZVVsRXkyYUVqQWZmZ0gyTF9Oek5uOUxaUHNqMVNKY1NwZnNSeDJUaEVjQWt4ems3LTRUSGZNbDlOMkF1QXNCVG5BTENyekZnQW5OTDMyT1EwbGNvTGtPdHV1UVk1eXRYSzBXNF93a2ltallITVNDdzBxZ2pvPQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:02:50.672156', '2025-12-07 23:02:50.672160');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (32, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '1CGu8j95NRAGGCosVHmyBdQ2tpQSoeUNYy', 'bitcoin', 'receiving', 0, 'Z0FBQUFBQnBOZ2VhdFozVXFISkpXUWgzdW9Rd3EzN3lielg4VzJ3ekRjVENaVjhKdGRhMmtiSGhJbTktQlMyRWZRUDhUUWlLOVdpNW5uYTNGTU1QVlZwMzZWbGg0VVBQTDE5S0VrT2puT1MxQ2RQZUZjNEFpWFNUb3lpLUNSQkFjLXJKMWRySEtIaGk0TkFQTkRCUFhMTWJJR1Q0dkJFQ1BQYjZOTjhZdHl6bHV1dHRaajA3ay13PQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:02:50.682717', '2025-12-07 23:02:50.682720');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (33, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '0xb07df60907d1325a800420ff6753094cce6314bb', 'ethereum', 'receiving', 0, 'Z0FBQUFBQnBOZ2VhSWIwYVlEUGVpUDlKZHpNRndISVNUMTVQT2NtYTZCMC0tLUJ6eng3Y0c1dnNjRXZFb1VYT0czYWRvVExPN3lRVHBKX2REMWFJM1lvZm9RMjd3VW52VUVRYl9vWmt4UEN1OTlVSWFRTEN0MUhFY3JvWkwyaC1mcEUwM2gzdW9saFVlWEt6cGZTLVVBMldRRkZRYlhqT0czeWU2S3UyU19TaWFpa2JHOGduS20wPQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:02:50.689589', '2025-12-07 23:02:50.689591');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (34, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '0xb07df60907d1325a800420ff6753094cce6314bb', 'polygon', 'receiving', 0, 'Z0FBQUFBQnBOZ2VhYWVFMnlfQW4tMUJQSXlONTVpWUg4M2ozSEN2ZEQxY0xabEUyUEszT0ltZERQdWZXY0FNMnp4d3k0cjF1bzhjU0NLUml1MzlrMkI1cE90TmtzQUhHN01XTW1zWWNkNmdwbFZELTZERWVITjBRNHl1N2o5MDRLTExha1R2b0RBZFBfVURPUWdYRzFhQkhCaGVSMmIzY1EwUFNDZUZIbWVqWEVSSDhxVEp3R3drPQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:02:50.696209', '2025-12-07 23:02:50.696212');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (35, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '0xb07df60907d1325a800420ff6753094cce6314bb', 'bsc', 'receiving', 0, 'Z0FBQUFBQnBOZ2VhemY4OTJlVE9kUTVlVU8ybGNndFdPRksxQ1lKeXpVWjQwbl9reWZmbzFjY2F5NElwTXhDNWZkaGJUeFVMdUh3ajEzWmNFOGQ4VFF5X0xQaWI2NWZoYmxsd0JoMnFFQ0N0RFFpMlk2ZU1nSnRlVk1TUjV1dVNfR21PYUhoR1JKZ2l5ZVpiWkJKV29mTkI3ZkZ4YTIxNTM4RGZBM2RhcFJpNFhiM0h1NFJYOGtRPQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:02:50.703255', '2025-12-07 23:02:50.703258');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (36, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', 'TFHfbEXKkSKSqK8qR3wtSrpLDN9WF8N8kx', 'tron', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGUE9NSVYwNFQ5MmxkaWhJSURidjRCcGl4LVhvOXdKUnNndzY3TTBKbUJuYnU5eXViOUtibU1xeEU0TlVwaEp1ZjZfamZMNDJMVEVOYV9nRW1PYk9pUGV6OHBMWXVNZXYtZ2RUUnNBcHBUVGFaTVF1aFJibl9DdWlsM2pDUjRsYkZ5N1NWcWhQMXh4Tmk0cFE5WFVLVTlOS0ZiS2FkVUhHWmNSb1dwNUtMM29BPQ==', 'm/44''/195''/0''/0/0', 1, '2025-12-07 23:04:37.404559', '2025-12-07 23:04:37.404563');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (37, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '0x0e273096867ed5272ad5eaed6d2def8a7928d076', 'base', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGYnozSW1BdzVuRGpWZDJUZVE1WUpQeWxtRWpvUXFFS2xXblZyalhoQXJrNWFLT000ZlNTVnRXX01vYXhtUWdYYVhiZTN2THpsU3ZvQkh1UlRBQWYwekZKT2lKMG1OcjI2c1UtdjRLazVicjVZWW9ieGdYRG45T2FmMnEwOFRlZ202Tkp1cWV0dE1relZHZHI4S3Jjc1NkcWFBR0pMR0t5SmpPVW43RTV4RUk4PQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:04:37.461633', '2025-12-07 23:04:37.461636');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (38, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', 'BsQtnGznwcGNvFzAS6Nf9vDNPYRzoZyiBYZSZV9ZPxx', 'solana', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGanJYeG1LVDllLXhLZmpxeVpKUWpvckFPRFR1RW1HX0pHdzVWalBWaFR1ZnR4R3U0VkVxWF94ZEVGT3FwM1lsNnJzZVFSdUNRaUM1ZGRzRkZ2ZlFueHdUYmRSdzhsV1JETzJoVjZwYVRHZmxORElPOFl6NXV4Y0psVENXUFJYZFlxN1k4dEVlQXFTY3A0bXY5UTJ5cHB6WjFreVBzdkJ5UUdGNXByYll6MkVrPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:04:37.495989', '2025-12-07 23:04:37.495996');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (39, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '12U6VX9NkUZTcKHzskyn86iiXHMz5yRwNS', 'litecoin', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGVlNGcDdtdTlfSFJxWnY1N2NLM1FhU1Vpc3VkWXlyUXJMakg5U2RDYlVxSkxmNWZna0c3ekFEZkxJdVFhVEFwdEktUVNXc2hVVHp2T1l5Vm1iQ24zNjI2Rkc1YS1WX1JKbjRmSjBSSG1aUWJMOXVoM1JfU1hQSjhNZkg4LTJ1RzBxdmJtWkY4emEtMm80cXNQa3l1SGxuSjJMME1uLVpPMEhid3hxSHQzeFpjPQ==', 'm/44''/2''/0''/0/0', 1, '2025-12-07 23:04:37.523299', '2025-12-07 23:04:37.523302');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (40, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '19yVR9PTkpRWgtjXN82BJWhCDPFtxf2iEF', 'dogecoin', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGZFJPQXRodThGWjNLQWE1ZWFsanlzZURPejF0TXh3M0xOTUlXbm1SWkk3ZGxQUWd3aXlDQ1JsTDFPdERrMTh4YktRN2pjYXhRcFd4ZGwwZ1pOTUQwaW9sMERpb2pvdkJVMnViVXZvZ3VxcWdmcnFaVFBHbWF4ZFN4VnJFWTNxcGs4MVl5a1piVzliSVJmc1N3RzhfUDJOTlZZUE1BQV8zYm5lV0V0eHc1X2JBPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:04:37.551327', '2025-12-07 23:04:37.551333');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (41, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', 'addr121fef1a3f62c0c37eaf5104bb6900ab87d5d4527', 'cardano', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGWFhyMXdoemV0cUdaV0wyVk1KQVVnNkRnZlctMlB0WUVhSTQzOVRiejRVWjdWZjVaUmdnSURsd1VTdW52ampEQ3ZiYTFaVWVQQVJMMVd3SjAzZkFNOV92dG9PcnhzcHdtbWJMRHpXdXEwOXpGdGU0RjN2Vm84QlNmSkZVczE0elF6cFNsT1pMNHBLdEhDb3Q1YzNIYVBDYk8zQi1kSk9GWnJvcmFjSGZ6czk4PQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:04:37.590114', '2025-12-07 23:04:37.590118');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (42, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '0x0948242dfd01b40e5d85ca86c66a2d1616802261', 'avalanche', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGNDZULXNDbXZnWnBUNGFlQS1weWp2WDFDLXVzbUcwLTNIYUI1RTVnN3NfbjB3V0pna2hwNXdLVndXM2VTaXlJYlpzZFpLQ2hkOW5zOGYxTVQ4VXF1NjJMcXNqTzVKaVZxVlRmdV9sQk8wak5lRG5yX0dtcHZ3b2daRnJqMXJxOHlhTzQtSHJLclAxdUF2TGhCM1JxY2xlYm13VmdZaU8ycnlNTEZBT09NOVBrPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:04:37.619914', '2025-12-07 23:04:37.619917');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (43, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '0x0948242dfd01b40e5d85ca86c66a2d1616802261', 'polkadot', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGNTdwRTdwcDlScVlqY01uc0hETGExT3VETDNxT3JRdzNHdkx0QW5oR05YeWlFYzhkNVJpNWd1LS1uUjZVNnpqQmZnWmlhN0Z1OUNQTXRDRl82RTVvTUdlMDU1RTU5eGQtNmpkUjNDSFB2RkxMQlJIQ0otS0wwNTF3c1ZOb3FjaDh5eEc2U1pfUlMxdi12NXBjRU9EUG5PUXVTdG1GSHRGbmF6M1hMazdRUWRJPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:04:37.649335', '2025-12-07 23:04:37.649338');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (44, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '0x0948242dfd01b40e5d85ca86c66a2d1616802261', 'chainlink', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGYnJxdWU3b0laRFNjQVFGWG1xUVBrbGN4c1JvYlRjNUloMHFoT2IwMmRrbFVqTVdlSUFsaks5VXZIb3IwVnN5S3JCalh1alkyYkR5QkZxaWVJTlZ5dTdkZkJTdEJScjd5VExyMVpvUHNWZDJGWGRCVmczUS1nZTVOZktySjFWVjNXMWt1R3JYNkpqMGl3UFh6Zms2bUpzTkRGeF9nTXVhMDFYdGpQdW1DRVUwPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:04:37.678336', '2025-12-07 23:04:37.678340');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (45, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '0x0948242dfd01b40e5d85ca86c66a2d1616802261', 'shiba', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGSTE0bUtKVmJfRHc2YzRsNVJwZ0hacEVWendScDRTSjFIOTA2N2lNM3hmOUZFYTdJOU9PdjktemVxX2Fhc1BDMlZhWG9xS2hGRHBEMUdIVkFwT3BkcDVLSU5RdTRFOTF1aEgxMnRQTF9XOG43SWdyVG9tUFFLVS1uc0ttOS1oU1c3aEFreGpVWVNZUlhOZDRZT3F1dl9LWFZTbTRyaGt6YVcyX1BQRC00T0xrPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:04:37.706051', '2025-12-07 23:04:37.706055');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (46, 'ad5d7074-600e-4e3f-9ce2-182449c4fa4b', 'r2c0c37eaf5104bb6900ab87d5d4527', 'xrp', 'receiving', 0, 'Z0FBQUFBQnBOZ2dGbUxpelZfWUZmM0lQNTB6YTVLQXZ1YjNYUVctNHB0LUtCRWw4d1AzSjVhckhHTkhHOW9JTXp4T1FiNEJqVFo5U0VxWi1iVHdmUnc1NGxoZ3dsVzJmeTRFYWE0UVJ2OHVySno1MmpKMlhPX20zQWpKNmJQUGtUUDdYWHBzeDN5NkhGbC1PbUZpTjhwc1NER3FWN2MweWpNd1p0LVhIZ2s4ZEcwSm5JUjBSRkFZPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:04:37.736098', '2025-12-07 23:04:37.736101');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (47, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '0xc421e96c0159934ff0344141a5b77e48de8280f9', 'multi', 'receiving', 0, 'Z0FBQUFBQnBOZ25wejBwY19RSnI3UU9FYUt4a0JWYVN1enZYeWFUN3dIOEk5OWtHajBRU19abklrdHN2ZllWQ0xfcllvUHJmemZMdzdjRzd5a2VhM3VZSXpMMnlqNmg3WXhyWEdXdVBZT3RXSEowZXJ1Q1VUd21GM21pTVBEZVFldi1KcHNmMWx0QmI3UENLTmViWk5qemtpRmRMUDgza21lU2NRZkhTc2xIWWxVejNhdGQyelJBPQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:12:41.066263', '2025-12-07 23:12:41.066267');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (48, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '1G6kq5oyjQvRdEcZtf4i6nS1sbmHYvJJx4', 'bitcoin', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1ZVducHh1WDVNTXZmaTJjbDlVY0Q5T2hiYXZ5RmtYc3Bxb0ItRWtGQUp0MXlKZGFKVjluS3Q0elBuc3ZiNThkY3Bxci1xVVNxSHdyVlUzcVRRLUFmUXNzZTBORjR2dFlCbEkxcjllSUlQTEJ5LUlOTTBpVkhtVUEtUDVJemZZREp0cWVNTVJNODBwbS1sZngxYUdXUW52Wm9IOWtRX1JkMUctVXphelc2eWk0PQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:20:25.085426', '2025-12-07 23:20:25.085430');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (49, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6', 'ethereum', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1MGxwaENSVVlad284WF9IcmljYTlaa2FVbV83TGY2cEd4Ml9qM28wcXI4YzdxUjkzaUx1MUVwMmFBdUN1V0RGTWh1WGdHYkpkdDB6M3ZlRnFXV19GR0E2YmtDYWZ2d1dTcjV5NkxHR1kyYmlNeGJxdWVIanl1dW5SajBmWWFhZjlMNlROZnY2REVkVEotYWhQQ01SU0ZWd0J4emY5ZXllQUhBME5JOFRaa1BZPQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:20:25.153231', '2025-12-07 23:20:25.153235');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (50, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '0x64b8039bb14d03934521f663a0d88fc0ecfcc596', 'avalanche', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1MG1ZcW5EQzloeTlTZUVUdFNQT0NmcmFjdk8zTlUzamdSYTRNVXFkTUc3RExINDhKQ1BzV3ZoSm5RQ05md21yb2NwbEl0cWFlSUpzeHNMdG8waTl0blJPM1J0Y013NVFpcjR1VGhrcWxoUzMzWGUyNHBaZVhxTVhZeF9DanR0YXFFWmJlZXNiM3NVbEd5b2pZQU1MNl9xOWhDV3Mxb1ZocTUxNFVLSnZMeFRZPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:20:25.190103', '2025-12-07 23:20:25.190107');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (51, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6', 'polygon', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1eTFFN2NfdS1QZl9WeVpVa1NSTWtXMmljUldGYTVhQndMUjF2c01hMGdyU095VXFfVjRIV1oxLVlQekZ0UUZDRjgxc3cwMzFJbUpCMEZqc3ViX0JhNmdUcExaVnBfRU5YdGhaMjdoSnIyQnA4X1o5LWd6UzdfbjlGYnpaeFlsa3oyUmJiNXgwbmZaTmZadlcwRWcySGNIZC15ZGx4c2hiR2tIVzBtLV9fbjc0PQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:20:25.220739', '2025-12-07 23:20:25.220743');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (52, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '0x64b8039bb14d03934521f663a0d88fc0ecfcc596', 'polkadot', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1b1YzZ2pCLTZsSHlHTXBydkpXYzBVS2hESlc3OTdKNlFuYW5OWkZTbjNoeFI4eTBzeVZyWG5VRDAwald3T0ppY3dDT21UNjQ1STBvU004eTdnN0R5bGp6WDNCejktMVVKNG0tQW8xWGZtNDM4VzBuM2lnd2VDVVRfZTFldWFZZ29EX3Zma1NzQ2QtNXhMOVlGMFhQZjQ3YTRpS01YYVlfbkpNZnpWeXZQZDhrPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:20:25.253915', '2025-12-07 23:20:25.253918');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (53, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6', 'bsc', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1cTVQQVFNTktpYjREaXZaR0pyQV9jOFBabTZOM19zRmJIbzczYldVdXVZMkdjWmQ1UV84c24yRHJxZE8waFJBQnFkSUpsSmMyZGV1cFhsckd1dzVOWThHRFBTZTU1UW5BTUc0cXA1c0dsLUJ6LWt4Szc1d1NlVXAwVWFLbGQwaFN3RHJWNU1UeERVZkZCQS1jZjBpdzAwWjRwRkVJb19EVV90eXVvLU1iaGZjPQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:20:25.287218', '2025-12-07 23:20:25.287221');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (54, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '0x64b8039bb14d03934521f663a0d88fc0ecfcc596', 'chainlink', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1b01QYUxHNmtvNEpJdDlxNVllZHFHSFY3MXJ4VjVqQ2VJbHUyc1VCZGh0bVllLU1FZU5vXzNNbmduU21qMlZFSmxWRU1jb3ZyeEstSkN1TUtnWC1Gd1YxNDFfcFBQYTRhcmFHN2xWaWRnYmJOeGR1ZkdDSjRscFdSTG45UTh5MExmNGhNeVNIbkJqR1pkMnJIek40NHdsX1hvRWl1ZHpnTWpVU1BGbzBMUE9rPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:20:25.315362', '2025-12-07 23:20:25.315365');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (55, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '0x64b8039bb14d03934521f663a0d88fc0ecfcc596', 'shiba', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1VVRFMlpQLVI4cVlNTHNNTGFfTXFDaWswa1V2UTdzR3JXcmxNTDgtd09QelQ3ZmdQWmhHSWR1YXhJaGQzcUtJQ0dyWEM3OFhZeHpwbFBHM1JiZHZDUzhOTUZpYnVWR1dCcDlDTU8zZlB6ekw4blJmVXF0QjlDS0l2SVJ1Wnl0SGxWVnpEbGZ2eXJ2aWVFUFV6b3JSeGJPd2dESkpONFhOLXF1YS10NWdlMGZZPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:20:25.342882', '2025-12-07 23:20:25.342885');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (56, '2b95a1d3-e4b4-4047-8027-297b6a01c183', 'rf0cfdb445b69e808204f2b213c337b', 'xrp', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1STdLNFc5UnNueG9fUWZXRllnRmJkcG9OTlVUbnJNMmluanMtaEpOM3NrQ0FVX2xMcDlFbkE0akI1WjlBQWhuNEtzSnVvbjBLelhiZGEzMndZai1zb1BUQlFFNG5FM1EzWU5GakJ1STl6V0JEcjFrMnRTOVdrb2RrUVVlaFN0STlQUzFwUkVBU2xHX1VzT3k5QzB6OEVuMFZ5X3RtdjY1VkpucFdXUzFQRDNzPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:20:25.368148', '2025-12-07 23:20:25.368151');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (57, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6', 'base', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1TTFuc043MDlWZDVQU2VYS09rbGpMR3FKVXgwcHI4eEo3aXo5eHdwdXVOeWl3Um1SQmR1SEE2aXFBcHdtSHFTOTBXeGl5RzktMkMtMGpoUHZVdEZ2ejRLV2NGOXJTb3hwNk9qcm9nMTF2b2tudWJjVGtlZHU1LUp0VkpYeDJGbXJnUDlBcHB1S290TU8zeEpwaEZNaHpUYkF0VmdNOGpObk5sd0tHSURaSjNNPQ==', 'm/44''/60''/0''/0/0', 1, '2025-12-07 23:20:25.392601', '2025-12-07 23:20:25.392604');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (58, '2b95a1d3-e4b4-4047-8027-297b6a01c183', 'ApQdi8s2eFD2jNowNztZ7sXtaFuiKEvPcxyHbSCAmu4', 'solana', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1Y0FlT0JJeklMMTYzZk5WbnZJc1N6cEtoYmdtSV9ualBnX0xLaG1tWWxrY3dIUWdHNVJPXzQwdlBpMjZGcjIzcGpXckh5b0FOZkQ2YTFmdFoyUk9rc19hWUZXY0wzNDQ0WHl3RWp5UkhEZ0EtMFN5SHJBTTVvM0pENGViOWZ3eF83LXdPb3pkaEtRNjdhdDdmSDFPYjV5T19DbnUtMUEzNExJS2hEXzNqQ2dnPQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:20:25.417269', '2025-12-07 23:20:25.417272');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (59, '2b95a1d3-e4b4-4047-8027-297b6a01c183', 'TUzKVht9Xy8vyYukHScfSEgswtLoKjNifS', 'tron', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1OF9tNkxNNUpMdFZEWEdhZ3ZQNmZsS21vdnk4NDRHeUhhTTdJNkpYdWJIRG0xellZa1luSDdrNEVsRU5iWmlqX282dFZ2VDQ1MTBOOGsyaVVZUW1mRlNhRFZVY0FzZFdoR3hBWlptQXVDMWNBV2VlQkN6cndta3FlblRLSFQzOGlBcTRqempYNzRnZjR5VGZDSGZUWDlLaC1BazVUUlQtcFlZb3dXYjFGTmRnPQ==', 'm/44''/195''/0''/0/0', 1, '2025-12-07 23:20:25.448359', '2025-12-07 23:20:25.448362');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (60, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '1G6kq5oyjQvRdEcZtf4i6nS1sbmHYvJJx4', 'dogecoin', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1ajlLRzczU3o5YUJuZVJOdnh4NzNId1ZuX2x2U0xJLUhWMFY2a29oajRVTHJQMzhsTVdkQ1FQcm04aHp2alo2aFNHbW9VbFl3NFpMdzhWREltRHZUUElmb3lES1EzLWJlQkJ3djBTTFExLWdyelVzbkY2RzJmQkdVa3ZnREV4N1o5UnoxRTNTd0hYd2hQb2NlcmpiamlKTkd5TUl5TlBmUl9adnppWHVPSGc0PQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:20:25.466675', '2025-12-07 23:20:25.466678');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (61, '2b95a1d3-e4b4-4047-8027-297b6a01c183', '19jGtV9jkbpYXM5CoeYCu7FeSeYeVtbRpr', 'litecoin', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1VTJtdjFObmlnWENfYTFXZW1PQ19Sd2ZhcGFvMEpldE9fenJPWktCeG12TEFsQUEzaW9WeVNXN09PN0pYMXo2Rkl5Tkh3T0Fac2VCQ0FTSDQtajgydWk5ZnB5LTJIN0x6dnc3MHpQd01UU3RRcjNpb3A2NGY3cnhneDdJZGFCVG9ybGpNRllLX1JJLUUxT0FHc09pcWNMV3ltRmJON0JnWW55TWIwLXpaY1lvPQ==', 'm/44''/2''/0''/0/0', 1, '2025-12-07 23:20:25.493612', '2025-12-07 23:20:25.493615');
INSERT INTO addresses ("id", "wallet_id", "address", "network", "address_type", "derivation_index", "encrypted_private_key", "derivation_path", "is_active", "created_at", "updated_at") VALUES (62, '2b95a1d3-e4b4-4047-8027-297b6a01c183', 'addr19604dcf6e3f0cfdb445b69e808204f2b213c337b', 'cardano', 'receiving', 0, 'Z0FBQUFBQnBOZ3U1QU5taU9JSFdlRzVvVk9FYjVjZ0YxSXN5b0tYb0RjNzRFSXF2SDd2ZG9pd3ptTnMwTUJHcmg1LWI0VzlWazh3bjBGRmVoejdCMU4teC04YmJWb05XUnJSbE1VZEV1U2hUVG1mTm1Pd3dlbTU3UkRZd1hESi1lSzNpc1FZQ21xZ1ozSzl5N3l5T3Z1U1lBanFXOGxHNkdOaENmb1B4SmdYZUtqNU9OR1N0b2s0PQ==', 'm/44''/0''/0''/0/0', 1, '2025-12-07 23:20:25.511303', '2025-12-07 23:20:25.511306');


-- ============================================================================
-- Tabela: balance_history (0 linhas)
-- ============================================================================
TRUNCATE TABLE balance_history CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: fraud_reports (0 linhas)
-- ============================================================================
TRUNCATE TABLE fraud_reports CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: instant_trade_history (0 linhas)
-- ============================================================================
TRUNCATE TABLE instant_trade_history CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: instant_trades (0 linhas)
-- ============================================================================
TRUNCATE TABLE instant_trades CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: p2p_chat_messages (0 linhas)
-- ============================================================================
TRUNCATE TABLE p2p_chat_messages CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: p2p_chat_rooms (0 linhas)
-- ============================================================================
TRUNCATE TABLE p2p_chat_rooms CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: p2p_chat_sessions (0 linhas)
-- ============================================================================
TRUNCATE TABLE p2p_chat_sessions CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: p2p_disputes (0 linhas)
-- ============================================================================
TRUNCATE TABLE p2p_disputes CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: p2p_escrows (0 linhas)
-- ============================================================================
TRUNCATE TABLE p2p_escrows CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: p2p_file_uploads (0 linhas)
-- ============================================================================
TRUNCATE TABLE p2p_file_uploads CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: p2p_matches (0 linhas)
-- ============================================================================
TRUNCATE TABLE p2p_matches CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: p2p_orders (5 linhas)
-- ============================================================================
TRUNCATE TABLE p2p_orders CASCADE;

INSERT INTO p2p_orders ("id", "user_id", "order_type", "cryptocurrency", "fiat_currency", "price", "total_amount", "available_amount", "min_order_limit", "max_order_limit", "payment_methods", "time_limit", "terms", "auto_reply", "status", "completed_trades", "total_volume", "created_at", "updated_at") VALUES (1, 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'sell', 'USDT', 'BRL', 5.0, 100.0, 100.0, 50.0, 500.0, '[1]', NULL, NULL, NULL, 'cancelled', 0, 0.0, '2025-12-07 20:20:20', '2025-12-08 15:37:08');
INSERT INTO p2p_orders ("id", "user_id", "order_type", "cryptocurrency", "fiat_currency", "price", "total_amount", "available_amount", "min_order_limit", "max_order_limit", "payment_methods", "time_limit", "terms", "auto_reply", "status", "completed_trades", "total_volume", "created_at", "updated_at") VALUES (2, 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'sell', 'USDT', 'BRL', 5.541899999999999, 2.037785, 2.037785, 1.0, 11.29, '[1]', 30, NULL, NULL, 'active', 0, 0.0, '2025-12-08 15:35:57', '2025-12-08 15:35:57');
INSERT INTO p2p_orders ("id", "user_id", "order_type", "cryptocurrency", "fiat_currency", "price", "total_amount", "available_amount", "min_order_limit", "max_order_limit", "payment_methods", "time_limit", "terms", "auto_reply", "status", "completed_trades", "total_volume", "created_at", "updated_at") VALUES (3, 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'buy', 'USDT', 'BRL', 5.4, 1000.0, 1000.0, 1.0, 5400.0, '[1]', 30, NULL, NULL, 'cancelled', 0, 0.0, '2025-12-08 15:41:53', '2025-12-08 15:43:13');
INSERT INTO p2p_orders ("id", "user_id", "order_type", "cryptocurrency", "fiat_currency", "price", "total_amount", "available_amount", "min_order_limit", "max_order_limit", "payment_methods", "time_limit", "terms", "auto_reply", "status", "completed_trades", "total_volume", "created_at", "updated_at") VALUES (4, 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'sell', 'USDT', 'BRL', 5.43, 2.037785, 2.037785, 1.0, 11.07, '[1]', 30, NULL, NULL, 'cancelled', 0, 0.0, '2025-12-10 04:27:42', '2025-12-10 04:28:03');
INSERT INTO p2p_orders ("id", "user_id", "order_type", "cryptocurrency", "fiat_currency", "price", "total_amount", "available_amount", "min_order_limit", "max_order_limit", "payment_methods", "time_limit", "terms", "auto_reply", "status", "completed_trades", "total_volume", "created_at", "updated_at") VALUES (5, 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'sell', 'USDT', 'BRL', 8.82375, 2.037785, 2.037785, 5.0, 17.98, '[1]', 30, NULL, NULL, 'active', 0, 0.0, '2025-12-10 04:31:42', '2025-12-10 04:31:42');


-- ============================================================================
-- Tabela: p2p_trades (1 linhas)
-- ============================================================================
TRUNCATE TABLE p2p_trades CASCADE;

INSERT INTO p2p_trades ("id", "order_id", "buyer_id", "seller_id", "cryptocurrency", "fiat_currency", "amount", "price", "total_fiat", "payment_method_id", "expires_at", "status", "created_at", "updated_at") VALUES (1, 1, 2, 1, 'USDT', 'BRL', 100.0, 5.0, 500.0, NULL, '2025-12-07 17:50:20', 'completed', '2025-12-07 20:20:20', '2025-12-07 20:20:20');


-- ============================================================================
-- Tabela: payment_method_verifications (0 linhas)
-- ============================================================================
TRUNCATE TABLE payment_method_verifications CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: payment_methods (1 linhas)
-- ============================================================================
TRUNCATE TABLE payment_methods CASCADE;

INSERT INTO payment_methods ("id", "user_id", "type", "details", "is_active", "created_at", "updated_at") VALUES (1, 1, 'pix', '{"key": "test@pix"}', 1, '2025-12-07 20:15:58', '2025-12-07 20:15:58');


-- ============================================================================
-- Tabela: trade_feedbacks (0 linhas)
-- ============================================================================
TRUNCATE TABLE trade_feedbacks CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: trader_profiles (1 linhas)
-- ============================================================================
TRUNCATE TABLE trader_profiles CASCADE;

INSERT INTO trader_profiles ("id", "user_id", "display_name", "avatar_url", "bio", "is_verified", "verified_at", "verification_level", "total_trades", "completed_trades", "success_rate", "average_rating", "total_reviews", "auto_accept_orders", "min_order_amount", "max_order_amount", "accepted_payment_methods", "average_response_time", "trading_hours", "is_active", "is_blocked", "created_at", "updated_at") VALUES ('9e10cc7c-8794-40c2-b09b-9cd4e0489993', 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'HOLDX CAPITAL', NULL, NULL, 0, NULL, 'unverified', 0, 0, 0.0, 0.0, 0, 1, NULL, NULL, NULL, NULL, NULL, 1, 0, '2025-12-10 05:53:16.265759', '2025-12-10 05:58:35.707297');


-- ============================================================================
-- Tabela: trader_stats (0 linhas)
-- ============================================================================
TRUNCATE TABLE trader_stats CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: transactions (0 linhas)
-- ============================================================================
TRUNCATE TABLE transactions CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: two_factor_auth (0 linhas)
-- ============================================================================
TRUNCATE TABLE two_factor_auth CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: user_badges (0 linhas)
-- ============================================================================
TRUNCATE TABLE user_badges CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: user_reputations (0 linhas)
-- ============================================================================
TRUNCATE TABLE user_reputations CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: user_reviews (0 linhas)
-- ============================================================================
TRUNCATE TABLE user_reviews CASCADE;

-- Tabela vazia, nada a migrar


-- ============================================================================
-- Tabela: users (4 linhas)
-- ============================================================================
TRUNCATE TABLE users CASCADE;

INSERT INTO users ("id", "username", "email", "password_hash", "is_active", "is_email_verified", "created_at", "updated_at", "last_login") VALUES ('f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'app', 'app@holdwallet.com', '$2b$12$iQdvt85tn78ju6zHIOlXUe5mELT8v5T93mMIf4U/YhPe.3xRoFKJy', 1, NULL, '2025-12-07 20:57:43', '2025-12-10 06:39:07.321903', '2025-12-10 06:39:07.320061');
INSERT INTO users ("id", "username", "email", "password_hash", "is_active", "is_email_verified", "created_at", "updated_at", "last_login") VALUES ('2bf8e9cd-ea44-4ac9-84da-bf4318650b38', 'holdinvesting', 'trading@holdinvesting.io', '$2b$12$f0jeIC4hLatLVOQcIOfBM.hAezg2Gyk72/kBHEA0AbVnKTtXttpka', 1, 0, '2025-12-07 22:44:22.456117', '2025-12-08 00:22:48.964513', '2025-12-08 00:22:48.963065');
INSERT INTO users ("id", "username", "email", "password_hash", "is_active", "is_email_verified", "created_at", "updated_at", "last_login") VALUES ('a51b02ed-1900-4b70-8b0e-c66036d7265d', 'usuariotest3', 'testeapi3@holdwallet.com', '$2b$12$WiYlD5PEzfxUGgUXJCSMoeVCs5tnoL38PIeUY3yYf70hfYjBg6PjW', 1, 0, '2025-12-07 22:56:13.222277', '2025-12-07 22:56:13.222280', NULL);
INSERT INTO users ("id", "username", "email", "password_hash", "is_active", "is_email_verified", "created_at", "updated_at", "last_login") VALUES ('66eac1f6-4316-4017-9483-59d09a339148', 'user_1765148311', 'teste_1765148311@holdwallet.com', '$2b$12$DMJEBfsc/c.RIfFvuX7cS.YCjm1ksj1l1VRfgt9OpxOS5Pg8Sq4gy', 1, 0, '2025-12-07 22:58:31.709219', '2025-12-07 22:58:31.709222', NULL);


-- ============================================================================
-- Tabela: wallet_balances (3 linhas)
-- ============================================================================
TRUNCATE TABLE wallet_balances CASCADE;

INSERT INTO wallet_balances ("id", "user_id", "cryptocurrency", "available_balance", "locked_balance", "total_balance", "created_at", "updated_at", "last_updated_reason") VALUES ('1e580df1-daeb-47df-bee5-70590959c5fb', 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'USDT', 2.037785, 0.0, 2.037785, '2025-12-08 14:07:57.690789', '2025-12-08 12:37:23.168653', 'USDT sync from polygon');
INSERT INTO wallet_balances ("id", "user_id", "cryptocurrency", "available_balance", "locked_balance", "total_balance", "created_at", "updated_at", "last_updated_reason") VALUES ('63b7ebd9-0702-4bbb-8c49-4272ecea23bc', 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'MATIC', 22.991438883672135, 0.0, 22.991438883672135, '2025-12-08 14:10:04.235141', '2025-12-08 14:10:04.235145', 'Initial sync from polygon');
INSERT INTO wallet_balances ("id", "user_id", "cryptocurrency", "available_balance", "locked_balance", "total_balance", "created_at", "updated_at", "last_updated_reason") VALUES ('97c43b92-5fd3-4498-aa57-037f1d60dc76', 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'BASE', 0.00269658799953073, 0.0, 0.00269658799953073, '2025-12-08 14:10:09.078805', '2025-12-08 14:10:09.078809', 'Initial sync from base');


-- ============================================================================
-- Tabela: wallets (2 linhas)
-- ============================================================================
TRUNCATE TABLE wallets CASCADE;

INSERT INTO wallets ("id", "user_id", "name", "network", "derivation_path", "encrypted_seed", "seed_hash", "is_active", "created_at", "updated_at") VALUES ('ad5d7074-600e-4e3f-9ce2-182449c4fa4b', '2bf8e9cd-ea44-4ac9-84da-bf4318650b38', 'holinvesting', 'multi', 'm/44''/0''/0''', 'Z0FBQUFBQnBOZ2Vhd0cwdjgwYTktdklHT21rQ2FrNkJqZmFta2xsYTNRT2t0OFAwODcxMGU0U09DZ0Eyai1MRmFMdUIxeEVWNGtvSjdIUzhLNW4wYjNqZnBmV2hSVVF2OUJ5TUZVMmI3SVk2ZFBxWmwzUUJQLVZBUllRWXM4bkZ2VnJvV0FhZlRDdEJWWWlNTFFhc1dZbzBXMU9ubTJXREJKbWZoZzZDbUdnWUg5cG5DNnpGWlo0bklvbXg1RXNHa09ZdTAyT0lyMUJK', '28f64405c6d1d3dcc297cd371093a6b36d2186f07d077a261c5585d03824570c', 1, '2025-12-07 23:02:50.652910', '2025-12-07 23:02:50.652912');
INSERT INTO wallets ("id", "user_id", "name", "network", "derivation_path", "encrypted_seed", "seed_hash", "is_active", "created_at", "updated_at") VALUES ('2b95a1d3-e4b4-4047-8027-297b6a01c183', 'f7d138b8-cdef-4231-bf29-73b1bf5974f3', 'holdwallet', 'multi', 'm/44''/0''/0''', 'Z0FBQUFBQnBOZ25wMkQyZW1CajZPNWFuREdyTndoYXlYZThtRDZ2YXloaXZSRzU2Vk00STJSLURUMjUyTU90NWh6Qy1NQzdYNjNNS0hBU2wySnB0QVJLN2ZiQ1JUZXVXX3pBMDU4dmItUWZwM05ubGhDVWZTMmdac0EtTE5sa2RTaVVPSFBGSXBfMFQ5dEpSOW1UUUwxNVp5UFFLLUhsSzNobF9nT0ZXTHUtWi04ai1vckpwcUN3PQ==', '676ad1532bb27d4a25286aae9615f7885f2d245b3c6a3e2d81ee2b8d056edb03', 1, '2025-12-07 23:12:41.058598', '2025-12-07 23:12:41.058601');


-- ============================================================================
-- Reabilitar constraints
-- ============================================================================
SET CONSTRAINTS ALL IMMEDIATE;

-- ============================================================================
-- RESUMO DA MIGRAÇÃO
-- ============================================================================
-- Total de tabelas: 27
-- Tabelas com dados: 8
-- Total de linhas: 49
-- Data de execução: 2025-12-14 14:04:54

