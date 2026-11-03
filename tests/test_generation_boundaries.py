"""Deterministic generation checks; never connect to providers or PostgreSQL."""
import pytest
from langchain_core.messages import AIMessage, HumanMessage

import backend as b


def test_draft_preserves_output_beyond_artifact_limit(monkeypatch):
    complete = "# Draft\n" + "Full itinerary detail.\n" * 800 + "FINAL-DRAFT-END"
    monkeypatch.setattr(b, "_invoke_llm", lambda *a, **k: AIMessage(content=complete))
    draft = b.itinerary_agent({"user_query": "Seven days in Japan"})
    assert draft["itinerary"] == complete
    final = b.final_agent({"user_query": "Seven days in Japan", "itinerary": complete, "approved": True})
    assert final["final_response"] == complete
    # Prompt inputs still have bounded context and explicit omission markers.
    context = b._fit_sections([("Draft", complete, 1)], 1000)
    assert len(context) < 1100
    assert context.endswith("...[truncated]")


@pytest.mark.parametrize("text,addition,expected", [
    ("A complete final sentence.", "Next paragraph.",
     "A complete final sentence.\nNext paragraph."),
    ("Opening\nThis is a sufficiently long repeated boundary line.",
     "This is a sufficiently long repeated boundary line.\nNew content.",
     "Opening\nThis is a sufficiently long repeated boundary line.\nNew content."),
    ("Opening\nThis sufficiently long last sentence is incom",
     "This sufficiently long last sentence is incomplete.",
     "Opening\nThis sufficiently long last sentence is incomplete."),
    ("First version.\nFinal Note", "First version.\nAnother day.",
     "First version.\nFinal Note\nFirst version.\nAnother day."),
    ("Repeated.\nRepeated.", "Repeated.", "Repeated.\nRepeated.\nRepeated."),
])
def test_only_verifiable_boundary_overlap_is_removed(text, addition, expected):
    assert b._join_continuation(text, addition) == expected


def test_complete_response_is_returned_unchanged(monkeypatch):
    response = AIMessage(content="# Complete\n\nFinal Note.\n", response_metadata={"finish_reason": "stop"})
    monkeypatch.setattr(b, "_call_once", lambda *a: response)
    assert b._invoke_llm([HumanMessage(content="Offline")], allow_continuation=True) is response


def test_continuations_preserve_complete_lines_and_join_exact_overlap(monkeypatch):
    boundary = "A complete final sentence that must not disappear."
    responses = iter([
        AIMessage(content=f"# Plan\n{boundary}", response_metadata={"finish_reason": "length"}),
        AIMessage(content=f"{boundary}\nMore content.", response_metadata={"finish_reason": "length"}),
        AIMessage(content="The end.", response_metadata={"finish_reason": "stop"}),
    ])
    monkeypatch.setattr(b, "_call_once", lambda *a: next(responses))
    result = b._invoke_llm([HumanMessage(content="Offline")], allow_continuation=True)
    assert result.content == f"# Plan\n{boundary}\nMore content.\nThe end."


def test_continuation_limit_keeps_all_received_text_without_inventing_marker(monkeypatch):
    calls = []

    def response(*args):
        calls.append(args)
        return AIMessage(content=f"Complete line {len(calls)}.", response_metadata={"finish_reason": "length"})

    monkeypatch.setattr(b, "_call_once", response)
    monkeypatch.setattr(b, "MAX_CONTINUATIONS", 2)
    result = b._invoke_llm([HumanMessage(content="Offline")], allow_continuation=True)
    assert len(calls) == 3
    assert result.content == "Complete line 1.\nComplete line 2.\nComplete line 3."
    assert "[truncated]" not in result.content
