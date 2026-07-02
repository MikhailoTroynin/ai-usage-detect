"""Lightweight heuristic scorer for text that may be AI-generated.

This is not a rigorous classifier -- just a small set of surface-level
signals (stock phrases, repeated sentence openers, low lexical variety)
combined into a 0-1 score.
"""

from dataclasses import dataclass, field
import re

_STOCK_PHRASES = (
    "as an ai language model",
    "i don't have personal opinions",
    "in conclusion",
    "it's important to note that",
    "i cannot provide",
    "as of my last knowledge update",
    "let's dive into",
    "in today's fast-paced world",
    "unlock the full potential",
)


@dataclass
class DetectionResult:
    score: float
    signals: list = field(default_factory=list)

    @property
    def likely_ai_generated(self) -> bool:
        return self.score >= 0.5


def _sentences(text: str) -> list:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]


def _stock_phrase_score(text_lower: str) -> float:
    hits = sum(1 for phrase in _STOCK_PHRASES if phrase in text_lower)
    return min(hits / 3, 1.0)


def _repeated_opener_score(sentences: list) -> float:
    if len(sentences) < 2:
        return 0.0
    openers = [s.split()[0].lower() for s in sentences if s.split()]
    if not openers:
        return 0.0
    most_common = max(openers.count(o) for o in set(openers))
    return min((most_common - 1) / max(len(openers) - 1, 1), 1.0)


def _lexical_variety_score(text: str) -> float:
    words = re.findall(r"[a-zA-Z']+", text.lower())
    if len(words) < 10:
        return 0.0
    variety = len(set(words)) / len(words)
    # Lower variety -> higher suspicion.
    return max(0.0, min(1.0, (0.55 - variety) / 0.35))


def analyze_text(text: str) -> DetectionResult:
    """Score a snippet of text for surface-level AI-generation signals."""
    text_lower = text.lower()
    sentences = _sentences(text)

    signals = []
    scores = []

    stock = _stock_phrase_score(text_lower)
    if stock > 0:
        signals.append("contains common AI stock phrases")
    scores.append(stock)

    opener = _repeated_opener_score(sentences)
    if opener > 0.3:
        signals.append("repeated sentence openers")
    scores.append(opener)

    variety = _lexical_variety_score(text)
    if variety > 0.3:
        signals.append("low lexical variety")
    scores.append(variety)

    weights = (0.5, 0.25, 0.25)  # stock phrases weigh heaviest
    score = sum(w * s for w, s in zip(weights, scores))
    return DetectionResult(score=round(score, 3), signals=signals)
