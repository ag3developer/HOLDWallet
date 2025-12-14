#!/usr/bin/env python3
"""
Script de Migração SQL
Gera comandos SQL para migrar dados do SQLite para PostgreSQL
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

LOCAL_DB = Path(__file__).parent / "backend" / "holdwallet.db"
MIGRATION_SQL = Path(__file__).parent / "MIGRATION_DATA.sql"

def get_db_connection():
    """Conecta ao banco SQLite."""
    if not LOCAL_DB.exists():
        print(f"❌ Banco não encontrado: {LOCAL_DB}")
        return None
    
    try:
        conn = sqlite3.connect(LOCAL_DB)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        print(f"❌ Erro: {e}")
        return None

def get_all_tables(conn):
    """Lista todas as tabelas."""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """)
    return [row[0] for row in cursor.fetchall()]

def sqlite_to_postgresql_type(sqlite_type):
    """Converte tipo SQLite para PostgreSQL."""
    sqlite_type = sqlite_type.upper() if sqlite_type else "TEXT"
    
    type_mapping = {
        'INTEGER': 'INTEGER',
        'INT': 'INTEGER',
        'BIGINT': 'BIGINT',
        'TEXT': 'TEXT',
        'VARCHAR': 'VARCHAR',
        'FLOAT': 'NUMERIC',
        'REAL': 'NUMERIC',
        'BOOLEAN': 'BOOLEAN',
        'BOOL': 'BOOLEAN',
        'BLOB': 'BYTEA',
        'DATETIME': 'TIMESTAMP',
        'DATE': 'DATE',
        'TIMESTAMP': 'TIMESTAMP',
        'JSON': 'JSONB',
        'DECIMAL': 'NUMERIC',
        'NUMERIC': 'NUMERIC',
    }
    
    for key, value in type_mapping.items():
        if key in sqlite_type:
            return value
    
    return 'TEXT'

def get_create_table_sql(conn, table_name):
    """Obtém o SQL de criação de tabela."""
    cursor = conn.cursor()
    cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
    result = cursor.fetchone()
    return result[0] if result else None

def export_table_data(conn, table_name):
    """Exporta dados de uma tabela como inserts SQL."""
    
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM {table_name}")
    
    columns = [description[0] for description in cursor.description]
    rows = cursor.fetchall()
    
    if not rows:
        return None  # Tabela vazia
    
    inserts = []
    
    for row in rows:
        values = []
        for i, value in enumerate(row):
            if value is None:
                values.append('NULL')
            elif isinstance(value, str):
                # Escapar aspas simples
                escaped = value.replace("'", "''")
                values.append(f"'{escaped}'")
            elif isinstance(value, bool):
                values.append('TRUE' if value else 'FALSE')
            else:
                values.append(str(value))
        
        columns_str = ', '.join(f'"{col}"' for col in columns)
        values_str = ', '.join(values)
        inserts.append(f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});")
    
    return inserts

def generate_migration_script():
    """Gera script completo de migração."""
    
    conn = get_db_connection()
    if not conn:
        return
    
    print("\n" + "="*80)
    print("GERADOR DE SCRIPT DE MIGRAÇÃO SQL".center(80))
    print("="*80 + "\n")
    
    tables = get_all_tables(conn)
    
    if not tables:
        print("⚠️  Nenhuma tabela encontrada!")
        conn.close()
        return
    
    print(f"📝 Gerando script SQL para {len(tables)} tabelas...\n")
    
    with open(MIGRATION_SQL, 'w') as f:
        # Header
        f.write("-- ============================================================================\n")
        f.write("-- SCRIPT DE MIGRAÇÃO: SQLite Local → PostgreSQL DigitalOcean\n")
        f.write(f"-- Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("-- ============================================================================\n\n")
        
        f.write("-- IMPORTANTE:\n")
        f.write("-- 1. Backup do banco de destino foi feito?\n")
        f.write("-- 2. Todas as tabelas foram criadas em PostgreSQL?\n")
        f.write("-- 3. Você revisa o script antes de executar?\n\n")
        
        f.write("-- Desabilitar constraints durante a inserção\n")
        f.write("SET CONSTRAINTS ALL DEFERRED;\n\n")
        
        total_rows = 0
        tables_with_data = 0
        
        for table_name in tables:
            print(f"  📊 Processando tabela: {table_name}...", end=" ")
            
            try:
                cursor = conn.cursor()
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                row_count = cursor.fetchone()[0]
                
                f.write(f"\n-- ============================================================================\n")
                f.write(f"-- Tabela: {table_name} ({row_count} linhas)\n")
                f.write(f"-- ============================================================================\n")
                f.write(f"TRUNCATE TABLE {table_name} CASCADE;\n\n")
                
                if row_count == 0:
                    f.write(f"-- Tabela vazia, nada a migrar\n\n")
                    print(f"(vazia)")
                else:
                    inserts = export_table_data(conn, table_name)
                    
                    if inserts:
                        for insert in inserts:
                            f.write(insert + "\n")
                        f.write("\n")
                        
                        total_rows += row_count
                        tables_with_data += 1
                        print(f"✅ ({row_count} linhas)")
                    else:
                        print("⚠️  Erro ao exportar")
                
            except Exception as e:
                f.write(f"-- ERRO ao processar {table_name}: {e}\n\n")
                print(f"❌ ERRO: {e}")
        
        # Footer
        f.write("\n-- ============================================================================\n")
        f.write("-- Reabilitar constraints\n")
        f.write("-- ============================================================================\n")
        f.write("SET CONSTRAINTS ALL IMMEDIATE;\n\n")
        
        f.write("-- ============================================================================\n")
        f.write("-- RESUMO DA MIGRAÇÃO\n")
        f.write("-- ============================================================================\n")
        f.write(f"-- Total de tabelas: {len(tables)}\n")
        f.write(f"-- Tabelas com dados: {tables_with_data}\n")
        f.write(f"-- Total de linhas: {total_rows}\n")
        f.write(f"-- Data de execução: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    print(f"\n✅ Script gerado com sucesso!")
    print(f"📁 Arquivo: {MIGRATION_SQL}")
    print(f"📊 Total de linhas a migrar: {total_rows:,}")
    print(f"📋 Total de tabelas com dados: {tables_with_data}/{len(tables)}")
    
    print("\n" + "="*80)
    print("PRÓXIMAS ETAPAS:".center(80))
    print("="*80)
    print("""
1. Review do arquivo MIGRATION_DATA.sql:
   - Verificar se os dados estão corretos
   - Adaptar conforme necessário

2. Executar em PostgreSQL:
   psql -U holdwallet-db -h <host> -d defaultdb < MIGRATION_DATA.sql

3. Validar dados:
   - Comparar contagens de linhas
   - Verificar integridade dos dados

4. Testar aplicação:
   - Fazer login com contas migradas
   - Verificar wallets e transações
   - Testar P2P e outras features
    """)
    
    conn.close()

if __name__ == "__main__":
    try:
        generate_migration_script()
    except KeyboardInterrupt:
        print("\n\n⚠️  Operação cancelada")
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
