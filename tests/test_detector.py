from ai_usage_detect import analyze_text


def test_stock_phrases_raise_score():
    text = (
        "As an AI language model, I don't have personal opinions. "
        "In conclusion, it's important to note that this is generated text."
    )
    result = analyze_text(text)
    assert result.likely_ai_generated
    assert "contains common AI stock phrases" in result.signals


def test_plain_human_text_scores_low():
    text = (
        "Grabbed coffee with Dana this morning, then spent an hour "
        "fixing the leaky faucet in the kitchen. Not exactly thrilling, "
        "but the dog seemed happy about the extra attention."
    )
    result = analyze_text(text)
    assert not result.likely_ai_generated


def test_empty_text_scores_zero_signals():
    result = analyze_text("")
    assert result.signals == []
