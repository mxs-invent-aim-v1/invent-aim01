"""
Natural Language Query routes.
"""
import time
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db.database import get_db
from core.nl_query import generate_sql, generate_explanation, is_destructive_sql, execute_query
from cachetools import TTLCache

router = APIRouter(prefix="/api/query", tags=["query"])

# Cache to store NL query results for 60 seconds (max 100 items)
_query_cache = TTLCache(maxsize=100, ttl=60)

class NLQueryRequest(BaseModel):
    question: Optional[str] = None
    sql: Optional[str] = None
    confirmed: bool = False

@router.post("/nl")
async def run_nl_query(req: NLQueryRequest, db: Session = Depends(get_db)):
    """Run a natural language query against the database."""
    
    if req.sql and req.confirmed:
        # This is a confirmed destructive query execution
        sql = req.sql
        explanation = "Executed confirmed query."
        cached = False
    elif req.question:
        # 1. Check cache for pure SELECTs (if not a confirmed run)
        cache_key = req.question.strip().lower()
        if cache_key in _query_cache:
            result = _query_cache[cache_key]
            result["cached"] = True
            return result
            
        # 2. Generate SQL from natural language
        try:
            sql = await generate_sql(req.question)
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
            
        if not sql:
            raise HTTPException(status_code=400, detail="Could not generate a valid SQL query.")
            
        # 3. Generate explanation
        explanation = await generate_explanation(sql)
        cached = False
    else:
        raise HTTPException(status_code=400, detail="Must provide either 'question' or 'sql' with 'confirmed=True'")

    # 4. Check for destructive queries
    is_destructive = is_destructive_sql(sql)
    
    if is_destructive and not req.confirmed:
        return {
            "sql": sql,
            "explanation": explanation,
            "requires_confirmation": True,
            "rows": None,
            "columns": None,
            "row_count": 0,
            "cached": False,
            "error": None
        }

    # 5. Execute query
    start_time = time.time()
    db_result = execute_query(db, sql)
    execution_time_ms = int((time.time() - start_time) * 1000)
    
    response = {
        "sql": sql,
        "explanation": explanation,
        "requires_confirmation": False,
        "columns": db_result.get("columns", []),
        "rows": db_result.get("rows", []),
        "row_count": db_result.get("row_count", 0),
        "message": db_result.get("message"),
        "error": db_result.get("error"),
        "execution_time_ms": execution_time_ms,
        "cached": cached
    }
    
    # 6. Cache successful SELECTs
    if not is_destructive and not db_result.get("error") and req.question:
        _query_cache[cache_key] = response
        
    return response

@router.get("/suggestions")
def get_suggestions():
    """Return pre-baked contextual example queries."""
    # Hardcoded for now, could be dynamic based on DB stats
    return [
        {"id": 1, "label": "Top 5 sellers by total spend", "query": "Which 5 sellers have the highest total spend?"},
        {"id": 2, "label": "All invoices with missing GSTIN", "query": "Show me all invoices where the seller GSTIN is missing"},
        {"id": 3, "label": "Monthly invoice count trend", "query": "How many invoices were processed each month?"},
        {"id": 4, "label": "Top 5 most expensive invoices", "query": "What are the top 5 most expensive invoices?"},
        {"id": 5, "label": "Invoices that need review", "query": "Show me all invoices that have a status of needs_review"},
        {"id": 6, "label": "Products with high tax amounts", "query": "Which line items have a tax amount greater than 500?"},
        {"id": 7, "label": "Average order value per month", "query": "What is the average grand total of invoices per month?"},
        {"id": 8, "label": "Invoices with low confidence", "query": "Show invoices where the confidence score is less than 0.5"}
    ]
