from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.schemas import domain as schemas
from app.services import aw_repo

router = APIRouter(
    prefix="/api/prompts",
    tags=["prompts"]
)

@router.post("/")
def create_prompt(prompt: schemas.PromptCreate):
    return JSONResponse(
        aw_repo.create_prompt(prompt.title, prompt.prompt, prompt.tool_id)
    )

@router.get("/")
def read_prompts(skip: int = 0, limit: int = 100):
    prompts = aw_repo.list_prompts(skip, limit)
    # Seed default prompts if none exist
    if not prompts:
        defaults = [
            {
                "title": "Principal Systems Architecture Teardown",
                "prompt": "Conduct an unsparing corporate architecture and moat breakdown of [TARGET_REPO]. Synthesize: 1) Verified FY25 edge topology, 2) Critical single-point-of-failure vulnerabilities, 3) Latency regression vectors under [LATENCY_BUDGET] constraint..."
            },
            {
                "title": "Empirical Research & Whitepaper Verification",
                "prompt": "Cross-examine arXiv paper [ARXIV_ID_OR_TITLE] against empirical industry evaluations. Detect dataset contamination suspicions, parameter over-claims, and provide 3 cited independent benchmarks validating [EVAL_METRIC]..."
            },
            {
                "title": "Production Design System & React Blueprint",
                "prompt": "Construct an enterprise-grade accessible React component named [COMPONENT_NAME] adhering to [DESIGN_TOKENS]. Require: zero inline styles, 100% WAI-ARIA keyboard navigation, Lucide icons, strict TypeScript props, and smooth spring physics transitions..."
            }
        ]
        for p in defaults:
            try:
                aw_repo.create_prompt(p["title"], p["prompt"])
            except Exception:
                pass
        prompts = aw_repo.list_prompts(skip, limit)
        
    return JSONResponse(prompts)

@router.get("/{prompt_id}")
def read_prompt(prompt_id: str):
    return JSONResponse(aw_repo.get_prompt(prompt_id))

@router.delete("/{prompt_id}")
def delete_prompt(prompt_id: str):
    return JSONResponse(aw_repo.delete_prompt(prompt_id))
