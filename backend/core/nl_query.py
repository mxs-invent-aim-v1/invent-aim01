"""
Natural Language to SQL engine.
Uses the Ollama LLM to convert plain English into SQLite queries.
"""
import re
import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from core.ollama_client import ollama

logger = logging.getLogger(__name__)

# Schema injected into the system prompt to guide the LLM
DB_SCHEMA = """
Tables in SQLite database:

1. invoices
   id (INTEGER) - Primary key
   invoice_number (VARCHAR) - E.g. 'MKT-91257815'
   invoice_date (VARCHAR) - E.g. '2026-05-18'
   order_id (VARCHAR) - E.g. '171-7576678-6969944'
   seller_gstin (VARCHAR) - E.g. '29AICA3918J1ZE'
   grand_total (FLOAT) - Total amount of the invoice
   confidence_score (FLOAT) - Extraction confidence (0.0 to 1.0)
   status (VARCHAR) - 'processed', 'needs_review', 'error'
   source_type (VARCHAR) - E.g. 'pdf_native', 'image_vision'
   created_at (DATETIME) - When the record was inserted

2. line_items
   id (INTEGER) - Primary key
   invoice_id (INTEGER) - Foreign key to invoices.id
   name (VARCHAR) - Product description
   hsn_code (VARCHAR) - HSN/SAC code
   quantity (FLOAT)
   unit_price (FLOAT)
   total_price (FLOAT)
   tax_rate (FLOAT)
   tax_amount (FLOAT)

3. taxes
   id (INTEGER) - Primary key
   invoice_id (INTEGER) - Foreign key to invoices.id
   tax_type (VARCHAR) - 'CGST', 'SGST', 'IGST'
   rate (FLOAT)
   amount (FLOAT)
"""

SYSTEM_PROMPT = f"""You are an expert SQL assistant. Your task is to convert plain English questions into valid SQLite queries.
You have access to the following database schema:
{DB_SCHEMA}

RULES:
1. Return ONLY the raw SQL query. No markdown formatting, no explanations, no `sql` fences.
2. Use valid SQLite syntax.
3. Keep queries efficient. Use JOINs where necessary.
4. If asked for a trend over time, group by strftime('%Y-%m', invoice_date).
5. Assume the user only wants up to 100 rows unless they specify otherwise. Add LIMIT 100 if no other limit makes sense.
"""

def extract_sql_from_response(response: str) -> str:
    """Clean the LLM output to extract just the SQL."""
    text = response.strip()
    
    # Remove markdown code fences if present
    for fence in ["```sql", "```SQL", "```sqlite", "```"]:
        if text.startswith(fence):
            text = text[len(fence):].strip()
    
    if text.endswith("```"):
        text = text[:-3].strip()
        
    return text

def is_destructive_sql(sql: str) -> bool:
    """Check if the SQL contains destructive keywords."""
    # Convert to uppercase for checking
    upper_sql = sql.upper()
    destructive_keywords = ["DELETE", "DROP", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "REPLACE"]
    
    # Check if any keyword exists as a whole word
    for keyword in destructive_keywords:
        if re.search(rf'\b{keyword}\b', upper_sql):
            return True
    return False

async def generate_sql(question: str) -> str:
    """Convert natural language to SQL using Ollama."""
    try:
        response = await ollama.generate(
            prompt=f"Question: {question}\n\nGenerate the SQLite query:",
            system=SYSTEM_PROMPT,
            temperature=0.0  # Zero temperature for more deterministic SQL
        )
        return extract_sql_from_response(response)
    except Exception as e:
        logger.error(f"Error generating SQL: {e}")
        raise RuntimeError("Failed to generate SQL from the prompt.")

async def generate_explanation(sql: str) -> str:
    """Generate a 1-sentence plain English explanation of the SQL."""
    prompt = f"In one concise sentence, explain what this SQLite query does in plain English:\n\n{sql}\n\nExplanation:"
    try:
        response = await ollama.generate(
            prompt=prompt,
            system="You are a helpful data analyst. Explain SQL queries simply.",
            temperature=0.3
        )
        return response.strip().replace('\n', ' ')
    except Exception:
        return "Executes the requested database query."

def execute_query(db: Session, sql: str) -> Dict[str, Any]:
    """Execute the SQL query safely and return results."""
    try:
        result = db.execute(text(sql))
        
        # If it's a DML statement (INSERT/UPDATE/DELETE), there are no rows to fetch
        if result.returns_rows:
            columns = list(result.keys())
            rows = [list(row) for row in result.fetchall()]
            return {
                "columns": columns,
                "rows": rows,
                "row_count": len(rows),
                "error": None
            }
        else:
            db.commit()
            return {
                "columns": [],
                "rows": [],
                "row_count": result.rowcount,
                "message": f"Successfully affected {result.rowcount} rows.",
                "error": None
            }
            
    except Exception as e:
        logger.error(f"SQL Execution error: {e}")
        db.rollback()
        return {
            "columns": [],
            "rows": [],
            "row_count": 0,
            "error": str(e)
        }
