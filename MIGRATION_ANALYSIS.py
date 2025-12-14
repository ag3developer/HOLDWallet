#!/usr/bin/env python3
"""
Análise de Migração de Banco de Dados
Script para verificar quantas tabelas e dados precisam ser migrados do SQLite local para PostgreSQL em produção
"""

import sqlite3
import os
from pathlib import Path
from tabulate import tabulate
from datetime import datetime

# Paths
# Use the backend database which contains real data with app@holdwallet.com
LOCAL_DB = Path(__file__).parent / "backend" / "holdwallet.db"
MIGRATION_REPORT = Path(__file__).parent / "MIGRATION_REPORT.md"

def get_db_connection():
    """Conecta ao banco de dados SQLite local."""
    if not LOCAL_DB.exists():
        print(f"❌ Banco de dados não encontrado: {LOCAL_DB}")
        return None
    
    try:
        conn = sqlite3.connect(LOCAL_DB)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"❌ Erro ao conectar ao banco: {e}")
        return None

def get_all_tables(conn):
    """Obtém todas as tabelas do banco de dados."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """)
    return [row[0] for row in cursor.fetchall()]

def get_table_info(conn, table_name):
    """Obtém informações sobre uma tabela específica."""
    cursor = conn.cursor()
    
    # Contar linhas
    cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
    row_count = cursor.fetchone()[0]
    
    # Obter colunas
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()
    
    # Obter índices
    cursor.execute(f"PRAGMA index_list({table_name})")
    indices = cursor.fetchall()
    
    # Obter foreign keys
    cursor.execute(f"PRAGMA foreign_key_list({table_name})")
    foreign_keys = cursor.fetchall()
    
    return {
        'rows': row_count,
        'columns': len(columns),
        'column_details': columns,
        'indices': len(indices),
        'foreign_keys': len(foreign_keys),
        'fk_details': foreign_keys
    }

def estimate_migration_size(conn, table_name):
    """Estima o tamanho em MB de uma tabela."""
    cursor = conn.cursor()
    
    # Usar PRAGMA page_count para estimar tamanho
    cursor.execute(f"""
        SELECT page_count * page_size as size 
        FROM pragma_page_count(), pragma_page_size()
    """)
    total_db_size = cursor.fetchone()[0]
    
    cursor.execute(f"SELECT COUNT(*) as count FROM {table_name}")
    row_count = cursor.fetchone()[0]
    
    if row_count == 0:
        return 0
    
    cursor.execute(f"""
        SELECT COUNT(*) FROM {table_name}
    """)
    
    # Estimativa bem grosseira por linha
    return (total_db_size / (1024 * 1024)) if total_db_size > 0 else 0

def generate_migration_checklist():
    """Gera checklist completo de migração."""
    
    conn = get_db_connection()
    if not conn:
        return
    
    print("\n" + "="*80)
    print("ANÁLISE DE MIGRAÇÃO DE BANCO DE DADOS".center(80))
    print("="*80 + "\n")
    
    # 1. Listar todas as tabelas
    tables = get_all_tables(conn)
    
    if not tables:
        print("⚠️  Nenhuma tabela encontrada no banco de dados!")
        conn.close()
        return
    
    print(f"📊 Total de tabelas encontradas: {len(tables)}\n")
    
    # 2. Análise detalhada
    migration_data = []
    total_rows = 0
    tables_with_data = 0
    
    print("Analisando tabelas...\n")
    
    for table_name in tables:
        try:
            info = get_table_info(conn, table_name)
            total_rows += info['rows']
            if info['rows'] > 0:
                tables_with_data += 1
            
            migration_data.append({
                'Tabela': table_name,
                'Linhas': info['rows'],
                'Colunas': info['columns'],
                'Índices': info['indices'],
                'FK': info['foreign_keys'],
                'Prioridade': 'Alta' if info['rows'] > 0 else 'Baixa'
            })
        except Exception as e:
            print(f"⚠️  Erro ao analisar {table_name}: {e}")
            migration_data.append({
                'Tabela': table_name,
                'Linhas': 'ERROR',
                'Colunas': '-',
                'Índices': '-',
                'FK': '-',
                'Prioridade': 'Verificar'
            })
    
    # 3. Exibir tabela
    print("DETALHES DAS TABELAS:")
    print("-" * 80)
    print(tabulate(migration_data, headers="keys", tablefmt="grid", stralign="center"))
    print()
    
    # 4. Resumo
    print("\n" + "="*80)
    print("RESUMO DA MIGRAÇÃO".center(80))
    print("="*80)
    
    summary = [
        ['Total de tabelas', len(tables)],
        ['Tabelas com dados', tables_with_data],
        ['Tabelas vazias', len(tables) - tables_with_data],
        ['Total de linhas', f'{total_rows:,}'],
        ['Data da análise', datetime.now().strftime('%Y-%m-%d %H:%M:%S')],
        ['Banco de dados', str(LOCAL_DB)],
    ]
    
    print(tabulate(summary, headers=['Métrica', 'Valor'], tablefmt="simple"))
    print()
    
    # 5. Prioridade de migração
    print("\n" + "="*80)
    print("ORDEM DE MIGRAÇÃO (Dependências)".center(80))
    print("="*80 + "\n")
    
    priority_order = generate_migration_order(conn, tables, migration_data)
    
    for idx, (table, reason) in enumerate(priority_order, 1):
        rows = next((d['Linhas'] for d in migration_data if d['Tabela'] == table), 0)
        print(f"{idx}. {table:30s} ({rows:6,} linhas) - {reason}")
    
    # 6. Gerar checklist
    print("\n" + "="*80)
    print("CHECKLIST DE MIGRAÇÃO".center(80))
    print("="*80 + "\n")
    
    for idx, table in enumerate(priority_order, 1):
        print(f"☐ [{idx:2d}] Migrar tabela: {table[0]}")
    
    print("\n☐ Validar integridade referencial")
    print("☐ Verificar sequences/auto-increment")
    print("☐ Testar todas as constraints")
    print("☐ Comparar contagem de linhas")
    print("☐ Validar dados críticos")
    
    # 7. Comandos SQL
    print("\n" + "="*80)
    print("COMANDOS PARA EXPORTAÇÃO".center(80))
    print("="*80 + "\n")
    
    print("Para exportar dados em CSV:\n")
    for table in tables:
        print(f".mode csv")
        print(f".output {table}.csv")
        print(f"SELECT * FROM {table};")
        print()
    
    # 8. Gerar Markdown report
    generate_markdown_report(migration_data, priority_order, total_rows, len(tables))
    
    print(f"\n✅ Relatório salvo em: {MIGRATION_REPORT}")
    print("\n" + "="*80 + "\n")
    
    conn.close()

def generate_migration_order(conn, tables, migration_data):
    """Determina a ordem de migração baseada em dependências."""
    
    # Mapear quais tabelas têm foreign keys
    fk_dependencies = {}
    
    for table_name in tables:
        try:
            cursor = conn.cursor()
            cursor.execute(f"PRAGMA foreign_key_list({table_name})")
            fks = cursor.fetchall()
            fk_dependencies[table_name] = [fk[2] for fk in fks]  # fk[2] é a tabela referenciada
        except:
            fk_dependencies[table_name] = []
    
    # Ordenar: primeiro tabelas sem dependências, depois as que dependem delas
    sorted_tables = []
    processed = set()
    
    # Primeira passada: tabelas sem dependências externas
    for table in tables:
        if not fk_dependencies[table]:
            sorted_tables.append((table, "Sem dependências"))
            processed.add(table)
    
    # Segundas passadas: resolver dependências
    max_iterations = len(tables)
    iteration = 0
    
    while len(processed) < len(tables) and iteration < max_iterations:
        for table in tables:
            if table not in processed:
                # Verificar se todas as dependências já foram processadas
                if all(dep in processed for dep in fk_dependencies[table]):
                    reason = f"Dependências: {', '.join(fk_dependencies[table])}"
                    sorted_tables.append((table, reason if reason != "Dependências: " else "Sem dependências externas"))
                    processed.add(table)
        iteration += 1
    
    # Adicionar tabelas não processadas (possível ciclo)
    for table in tables:
        if table not in processed:
            sorted_tables.append((table, "⚠️  CICLO DETECTADO - Verificar manualmente"))
    
    return sorted_tables

def generate_markdown_report(migration_data, priority_order, total_rows, total_tables):
    """Gera relatório em Markdown."""
    
    with open(MIGRATION_REPORT, 'w') as f:
        f.write("# 📊 Relatório de Análise de Migração de Banco de Dados\n\n")
        f.write(f"**Data**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"**Origem**: SQLite Local (`holdwallet.db`)\n")
        f.write(f"**Destino**: PostgreSQL DigitalOcean (Produção)\n\n")
        
        # Resumo
        f.write("## 📋 Resumo Executivo\n\n")
        f.write(f"- **Total de Tabelas**: {total_tables}\n")
        f.write(f"- **Total de Linhas**: {total_rows:,}\n")
        f.write(f"- **Tabelas com Dados**: {sum(1 for d in migration_data if d['Linhas'] > 0)}\n")
        f.write(f"- **Tabelas Vazias**: {sum(1 for d in migration_data if d['Linhas'] == 0)}\n\n")
        
        # Detalhes das tabelas
        f.write("## 📑 Detalhes das Tabelas\n\n")
        f.write("| Tabela | Linhas | Colunas | Índices | FK | Prioridade |\n")
        f.write("|--------|--------|---------|---------|----|-----------|\n")
        
        for item in sorted(migration_data, key=lambda x: x['Linhas'] if isinstance(x['Linhas'], int) else 0, reverse=True):
            f.write(f"| {item['Tabela']} | {item['Linhas']} | {item['Colunas']} | {item['Índices']} | {item['FK']} | {item['Prioridade']} |\n")
        
        # Ordem de migração
        f.write("\n## 🔄 Ordem de Migração (Respeitando Dependências)\n\n")
        for idx, (table, reason) in enumerate(priority_order, 1):
            f.write(f"{idx}. `{table}` - {reason}\n")
        
        # Checklist
        f.write("\n## ✅ Checklist de Execução\n\n")
        f.write("### Fase 1: Preparação\n")
        f.write("- [ ] Fazer backup do banco de dados local\n")
        f.write("- [ ] Fazer backup do banco de dados de produção\n")
        f.write("- [ ] Testar conexão com PostgreSQL DigitalOcean\n")
        f.write("- [ ] Garantir que todas as tabelas estão criadas em produção\n\n")
        
        f.write("### Fase 2: Migração de Dados\n")
        for idx, (table, _) in enumerate(priority_order, 1):
            f.write(f"- [ ] Migrar tabela `{table}`\n")
        
        f.write("\n### Fase 3: Validação\n")
        f.write("- [ ] Comparar contagem de linhas\n")
        f.write("- [ ] Validar integridade referencial\n")
        f.write("- [ ] Verificar constraints\n")
        f.write("- [ ] Testar todas as sequências/auto-increment\n")
        f.write("- [ ] Validar dados críticos (usuários, wallets, etc)\n\n")
        
        # Script de migração
        f.write("\n## 🔧 Próximos Passos\n\n")
        f.write("1. Execute `MIGRATION_SCRIPT.py` para gerar o script SQL de migração\n")
        f.write("2. Review do script gerado antes de executar\n")
        f.write("3. Execute em ambiente de staging primeiro\n")
        f.write("4. Após validação, execute em produção\n")

if __name__ == "__main__":
    try:
        generate_migration_checklist()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operação cancelada pelo usuário")
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
