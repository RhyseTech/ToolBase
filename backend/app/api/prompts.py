from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import domain as models
from app.schemas import domain as schemas

router = APIRouter(
    prefix="/api/prompts",
    tags=["prompts"]
)

@router.post("/", response_model=schemas.Prompt)
def create_prompt(prompt: schemas.PromptCreate, db: Session = Depends(get_db)):
    db_prompt = models.Prompt(
        title=prompt.title,
        prompt=prompt.prompt,
        tool_id=prompt.tool_id
    )
    db.add(db_prompt)
    db.commit()
    db.refresh(db_prompt)
    return db_prompt

@router.get("/", response_model=List[schemas.Prompt])
def read_prompts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    prompts = db.query(models.Prompt).offset(skip).limit(limit).all()
    # Seed default prompts if none exist
    if not prompts:
        default_prompts = [
            models.Prompt(
                title="Principal Systems Architecture Teardown",
                prompt="Conduct an unsparing corporate architecture and moat breakdown of [TARGET_REPO]. Synthesize: 1) Verified FY25 edge topology, 2) Critical single-point-of-failure vulnerabilities, 3) Latency regression vectors under [LATENCY_BUDGET] constraint..."
            ),
            models.Prompt(
                title="Empirical Research & Whitepaper Verification",
                prompt="Cross-examine arXiv paper [ARXIV_ID_OR_TITLE] against empirical industry evaluations. Detect dataset contamination suspicions, parameter over-claims, and provide 3 cited independent benchmarks validating [EVAL_METRIC]..."
            ),
            models.Prompt(
                title="Production Design System & React Blueprint",
                prompt="Construct an enterprise-grade accessible React component named [COMPONENT_NAME] adhering to [DESIGN_TOKENS]. Require: zero inline styles, 100% WAI-ARIA keyboard navigation, Lucide icons, strict TypeScript props, and smooth spring physics transitions..."
            )
        ]
        db.add_all(default_prompts)
        db.commit()
        prompts = db.query(models.Prompt).offset(skip).limit(limit).all()
        
    return prompts

@router.get("/{prompt_id}", response_model=schemas.Prompt)
def read_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(models.Prompt).filter(models.Prompt.id == prompt_id).first()
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt

@router.delete("/{prompt_id}")
def delete_prompt(prompt_id: int, db: Session = Depends(get_db)):
    prompt = db.query(models.Prompt).filter(models.Prompt.id == prompt_id).first()
    if prompt is None:
        raise HTTPException(status_code=404, detail="Prompt not found")
    db.delete(prompt)
    db.commit()
    return {"ok": True}
