# ai-usage-detect

Small heuristic scorer for spotting text with surface-level signs of being AI-generated (stock phrases, repeated sentence openers, low lexical variety).

## Usage

```python
from ai_usage_detect import analyze_text

result = analyze_text("As an AI language model, I don't have personal opinions.")
print(result.score, result.likely_ai_generated, result.signals)
```

## Tests

```
pip install pytest
pytest tests/
```
